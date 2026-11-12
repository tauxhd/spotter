// The 3D muscle body, shared by the website (components/MuscleModel) and the phone app (mobile/src/components/muscle-model):
// colour worked muscle groups, fill the gaps, outline the groups, and draw a front and a back view side by side.
// Platform-free: callers bring the loaded glTF scene and a three.js renderer bound to their canvas / GL context.
// Fast updates: build the body once (buildBody), then for each new set of worked muscles just recolour it (paint) and redraw
// (drawViews). Every muscle group shares one material, and the outline shader is compiled once per body, so a change is
// one frame, not a rebuild.
import * as THREE from "three";

// App muscle group → model muscles (Z-Anatomy names, see public/models/CREDITS.txt).
export const MAP: [string, RegExp][] = [
  ["chest", /pectoralis/],
  ["shoulders", /deltoid/],
  ["triceps", /triceps brachii|anconeus/],
  ["biceps", /biceps brachii|brachialis/],
  // Long finger/toe muscles, sartorius and the Achilles stay out: they run into the hands, knees and feet and clutter the outlines.
  ["forearms", /brachioradialis|flexor carpi|extensor carpi|pronator|supinator/],
  ["lats", /latissimus/],
  ["traps", /trapezius/],
  ["upper back", /rhomboid|teres (major|minor)|infraspinatus/],
  ["lower back", /iliocostalis/],
  ["abs", /rectus abdominis|pyramidalis/],
  ["obliques", /external abdominal oblique/],
  ["glutes", /gluteus|tensor fasciae/],
  ["quads", /rectus femoris|vastus/],
  ["hamstrings", /biceps femoris|semitendinosus|semimembranosus/],
  ["calves", /gastrocnemius|soleus/],
];
const groupOf = (name: string) => { const n = name.toLowerCase().replace(/_/g, " "); return MAP.find(([, re]) => re.test(n))?.[0]; };
const BASE = new THREE.Color("#52525b"), LIME = new THREE.Color("#84cc16"), BLACK = new THREE.Color(0);

type Mats = Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
type Edge = { rt: THREE.WebGLRenderTarget; mat: THREE.ShaderMaterial; quad: THREE.Scene; cam: THREE.Camera };
export type Body = { scene: THREE.Scene; looks: Mats; ids: Mats; mid: THREE.Vector3; size: THREE.Vector3; groups: Map<string, THREE.MeshStandardMaterial>; edge?: Edge };

// Build the lit scene from a loaded model (once), then paint it: worked groups glow lime (faint for a little, full for the most).
export function buildBody(src: THREE.Object3D, hit: Record<string, number> = {}): Body {
  const body = src.clone(true);
  body.updateMatrixWorld(true);
  const looks: Mats = new Map(), ids: Mats = new Map();
  const base = new THREE.MeshStandardMaterial({ color: BASE, roughness: 0.7 });
  const groups = new Map<string, THREE.MeshStandardMaterial>(); // one material per group: paint() recolours these
  const look = (g?: string) => {
    if (!g) return base;
    if (!groups.has(g)) groups.set(g, new THREE.MeshStandardMaterial({ color: BASE.clone(), emissive: BLACK.clone(), roughness: 0.7 }));
    return groups.get(g)!;
  };
  const idMats = new Map<number, THREE.MeshBasicMaterial>();
  const idMat = (id: number) => { if (!idMats.has(id)) idMats.set(id, new THREE.MeshBasicMaterial({ color: new THREE.Color(id / 32, 0, 0) })); return idMats.get(id)!; };
  const groupOfMesh = (o: THREE.Mesh) => groupOf(o.name) ?? groupOf((o.material as THREE.Material).name ?? "");
  const cx = new THREE.Box3().setFromObject(body).getCenter(new THREE.Vector3()).x;
  body.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = groupOfMesh(o);
    looks.set(o, look(g));
    // flat group id (red channel) for the outline pass; 0 = background, last = muscles outside our groups
    ids.set(o, idMat(g ? MAP.findIndex(([k]) => k === g) + 1 : MAP.length + 1));
    o.material = looks.get(o)!;
  });
  // Solid grey filler inside the head, so the gaps in the face muscles don't show the traps behind.
  const head = new THREE.Box3();
  body.traverse((o) => { if (o instanceof THREE.Mesh && /frontalis|occipitalis|temporalis|masseter|epicranial/i.test(o.name.replace(/_/g, " "))) head.expandByObject(o); });
  if (!head.isEmpty()) {
    const plug = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16));
    plug.scale.copy(head.getSize(new THREE.Vector3()).multiplyScalar(0.9));
    plug.position.copy(head.getCenter(new THREE.Vector3()));
    body.attach(plug);
    looks.set(plug, new THREE.MeshStandardMaterial({ color: BASE.clone().multiplyScalar(0.6), roughness: 0.9 }));
    ids.set(plug, idMat(MAP.length + 1));
    plug.material = looks.get(plug)!;
  }
  // Thin divider down the middle of the torso, so the back doesn't show through the breastbone / abs gap (and vice versa).
  // It sits between the inner faces of the abs and the lower back, so it never pokes out, and stops at the bottom of the abs.
  const boxOf = (re: RegExp) => { const b = new THREE.Box3(); body.traverse((o) => { if (o instanceof THREE.Mesh && re.test(o.name.replace(/_/g, " "))) b.expandByObject(o); }); return b; };
  const torso = boxOf(/pectoralis major|rectus abdominis/i), absBox = boxOf(/rectus abdominis/i), lowBack = boxOf(/iliocostalis/i);
  if (!torso.isEmpty() && !absBox.isEmpty() && !lowBack.isEmpty() && lowBack.max.z < absBox.min.z) {
    const zB = lowBack.max.z, zF = absBox.min.z, yB = absBox.min.y, yT = torso.max.y;
    // Two slices (chest height / abs height). The front face takes the colour of the chest / abs and the back face the traps /
    // lower back, so the gap blends into whatever is around it, lit or not.
    const grey = new THREE.MeshStandardMaterial({ color: BASE, roughness: 0.7 });
    for (const [y0, y1, front, back] of [[absBox.max.y, yT, "chest", "traps"], [yB, absBox.max.y, "abs", "lower back"]] as const) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(torso.getSize(new THREE.Vector3()).x * 0.04, y1 - y0, zF - zB));
      wall.position.set(cx, (y0 + y1) / 2, (zF + zB) / 2);
      body.attach(wall);
      looks.set(wall, [grey, grey, grey, grey, look(front), look(back)]); // box faces: ±x, ±y, +z front, -z back
      ids.set(wall, idMat(31)); // "divider": ignored by the outline pass
      wall.material = looks.get(wall)!;
    }
  }
  const box = new THREE.Box3().setFromObject(body);
  const scene = new THREE.Scene();
  scene.add(body, new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
  for (const z of [1, -1]) { const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(0.5, 1, 2 * z); scene.add(d); }
  const b: Body = { scene, looks, ids, mid: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), groups };
  paint(b, hit);
  return b;
}

// Recolour for a new set of worked muscles: just material colours, no rebuild.
export function paint(b: Body, hit: Record<string, number>) {
  const max = Math.max(0, ...Object.values(hit));
  b.groups.forEach((m, g) => {
    const t = max ? (hit[g] ?? 0) / max : 0;
    m.color.copy(BASE); if (t > 0) m.color.lerp(LIME, 0.2 + 0.8 * t * t); // squared so ½ reads clearly lighter than full
    m.emissive.copy(t > 0 ? LIME : BLACK);
    m.emissiveIntensity = 0.3 * t * t;
  });
}

// Draw the front (left half) and back (right half) views into a renderer already sized w × h (CSS / layout pixels).
// Not compact: white outlines around every muscle group and the whole body, via an id pass + edge shader.
export function drawViews(renderer: THREE.WebGLRenderer, b: Body, w: number, h: number, compact = false) {
  const use = (m: Mats) => m.forEach((mat, o) => { o.material = mat; });
  const half = h * 1.04 / 2, aspect = w / 2 / h, dpr = renderer.getPixelRatio();
  const rw = Math.round(w / 2 * dpr), rh = Math.round(h * dpr);
  if (!compact && (!b.edge || b.edge.rt.width !== rw || b.edge.rt.height !== rh)) { b.edge?.rt.dispose(); b.edge = makeEdge(rw, rh); } // compiled once per body
  const ids_rt = b.edge?.rt;
  renderer.setScissorTest(true);
  renderer.setClearColor(0x000000, 0);
  [1, -1].forEach((z, i) => { // front view on the left, back view on the right
    const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 10);
    cam.zoom = h / b.size.y; cam.updateProjectionMatrix();
    cam.position.set(b.mid.x, b.mid.y, b.mid.z + 3 * z); cam.lookAt(b.mid);
    if (ids_rt) { renderer.setRenderTarget(ids_rt); use(b.ids); renderer.render(b.scene, cam); use(b.looks); } // id pass (lights don't affect basic materials)
    renderer.setRenderTarget(null);
    renderer.setViewport(i * w / 2, 0, w / 2, h); renderer.setScissor(i * w / 2, 0, w / 2, h);
    renderer.render(b.scene, cam);
    if (b.edge && !compact) { renderer.autoClear = false; renderer.render(b.edge.quad, b.edge.cam); renderer.autoClear = true; }
  });
}

// The outline pass: an id render target plus an edge-finding shader over it.
function makeEdge(rw: number, rh: number): Edge {
  const rt = new THREE.WebGLRenderTarget(rw, rh, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { tId: { value: rt.texture }, px: { value: new THREE.Vector2(1 / rw, 1 / rh) } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `uniform sampler2D tId; uniform vec2 px; varying vec2 vUv;
      vec2 raw(vec2 o) { return textureLod(tId, vUv + o * px, 0.0).rg; } // r = group id
      // A thin gap (e.g. between the two halves of the abs): background with body close by on both sides.
      bool gap(vec2 o) {
        bool l = false, r = false, u = false, d = false;
        for (int i = 1; i <= 7; i++) {
          float f = float(i);
          l = l || raw(o - vec2(f, 0.0)).r > 0.015; r = r || raw(o + vec2(f, 0.0)).r > 0.015;
          d = d || raw(o - vec2(0.0, f)).r > 0.015; u = u || raw(o + vec2(0.0, f)).r > 0.015;
        }
        return (l && r) || (u && d);
      }
      vec2 id(vec2 o, vec2 c) { vec2 v = raw(o); return v.r > 0.95 || (v.r < 0.015 && gap(o)) ? c : v; } // divider and gaps count as the muscle next to them
      float diff(vec2 a, vec2 b) { return abs(a.r - b.r); }
      void main() {
        vec2 c = raw(vec2(0.0));
        float g = c.r * 32.0;
        if (g < 0.5 || g > 30.5) discard; // background or the torso divider
        vec2 r = id(vec2(1.0, 0.0), c), l = id(vec2(-1.0, 0.0), c), u = id(vec2(0.0, 1.0), c), b = id(vec2(0.0, -1.0), c);
        bool edgeOfBody = min(min(r.r, l.r), min(u.r, b.r)) < 0.015; // one outline around the whole figure
        bool group = g < ${MAP.length}.5; // and around the app's muscle groups (not hands, face, knees…)
        float d = max(max(diff(r, c), diff(l, c)), max(diff(u, c), diff(b, c)));
        if (!edgeOfBody && !(group && d > 0.015)) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.85);
      }`,
  });
  const quad = new THREE.Scene(); quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  return { rt, mat, quad, cam: new THREE.Camera() };
}
