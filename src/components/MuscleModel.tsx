"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// App muscle group → model muscles (Z-Anatomy names, see public/models/CREDITS.txt).
const MAP: [string, RegExp][] = [
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

let model: Promise<THREE.Group> | undefined; // load once per page
function load() {
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  return (model ??= new GLTFLoader().setDRACOLoader(draco).loadAsync("/models/muscles.glb").then((g) => g.scene));
}

const BASE = new THREE.Color("#52525b"), LIME = new THREE.Color("#84cc16");

// Front + back view of the muscle model; worked groups glow lime, faint for a little, full for the most.
export default function MuscleModel({ hit }: { hit: Record<string, number> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(hit);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer | undefined, gone = false;
    load().then((src) => {
      if (gone) return;
      const body = src.clone(true);
      const max = Math.max(0, ...Object.values(hit));
      const looks = new Map<THREE.Mesh, THREE.Material>(), ids = new Map<THREE.Mesh, THREE.Material>();
      body.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const g = groupOf(o.name) ?? groupOf((o.material as THREE.Material).name ?? "");
        const t = g && max ? (hit[g] ?? 0) / max : 0;
        const c = t > 0 ? BASE.clone().lerp(LIME, 0.2 + 0.8 * t * t) : BASE; // squared so ½ reads clearly lighter than full
        looks.set(o, new THREE.MeshStandardMaterial({ color: c, emissive: t > 0 ? LIME : new THREE.Color(0), emissiveIntensity: 0.3 * t * t, roughness: 0.7 }));
        // flat group id (red channel) for the outline pass; 0 = background, last = muscles outside our groups
        const id = g ? MAP.findIndex(([k]) => k === g) + 1 : MAP.length + 1;
        ids.set(o, new THREE.MeshBasicMaterial({ color: new THREE.Color(id / 32, 0, 0) }));
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
        ids.set(plug, new THREE.MeshBasicMaterial({ color: new THREE.Color((MAP.length + 1) / 32, 0, 0) }));
        plug.material = looks.get(plug)!;
      }
      // Thin grey divider down the middle of the torso, so the back doesn't show through the breastbone / abs gap (and vice versa).
      const torso = new THREE.Box3();
      body.traverse((o) => { if (o instanceof THREE.Mesh && /pectoralis major|rectus abdominis|gluteus maximus|latissimus/i.test(o.name.replace(/_/g, " "))) torso.expandByObject(o); });
      if (!torso.isEmpty()) {
        const t = torso.getSize(new THREE.Vector3()), at = torso.getCenter(new THREE.Vector3());
        const wall = new THREE.Mesh(new THREE.BoxGeometry(t.x * 0.04, t.y * 0.95, t.z * 0.7));
        wall.position.copy(at);
        body.attach(wall);
        looks.set(wall, new THREE.MeshStandardMaterial({ color: BASE.clone().multiplyScalar(0.6), roughness: 0.9 }));
        ids.set(wall, new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) })); // reads as a gap: filled, no outline
        wall.material = looks.get(wall)!;
      }
      const use = (m: Map<THREE.Mesh, THREE.Material>) => m.forEach((mat, o) => { o.material = mat; });
      const box = new THREE.Box3().setFromObject(body), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const scene = new THREE.Scene();
      scene.add(body, new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
      for (const z of [1, -1]) { const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(0.5, 1, 2 * z); scene.add(d); }

      renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.setScissorTest(true);
      const half = h * 1.04 / 2, aspect = w / 2 / h, dpr = renderer.getPixelRatio();

      // Outline pass: draw a dark line wherever the group id changes between neighbouring pixels.
      const ids_rt = new THREE.WebGLRenderTarget(Math.round(w / 2 * dpr), Math.round(h * dpr), { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
      const edge = new THREE.ShaderMaterial({
        transparent: true, depthTest: false, depthWrite: false,
        uniforms: { tId: { value: ids_rt.texture }, px: { value: new THREE.Vector2(1 / ids_rt.width, 1 / ids_rt.height) } },
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader: `uniform sampler2D tId; uniform vec2 px; varying vec2 vUv;
          float raw(vec2 o) { return textureLod(tId, vUv + o * px, 0.0).r; }
          // A thin gap (e.g. down the middle of the abs): background with body close by on both sides.
          bool gap(vec2 o) {
            bool l = false, r = false, u = false, d = false;
            for (int i = 1; i <= 8; i++) {
              float f = float(i);
              l = l || raw(o - vec2(f, 0.0)) > 0.015; r = r || raw(o + vec2(f, 0.0)) > 0.015;
              d = d || raw(o - vec2(0.0, f)) > 0.015; u = u || raw(o + vec2(0.0, f)) > 0.015;
            }
            return (l && r) || (u && d);
          }
          float id(vec2 o, float c) { float v = raw(o); return v < 0.015 && gap(o) ? c : v; } // gaps count as the muscle next to them
          void main() {
            float c = raw(vec2(0.0)), g = c * 32.0;
            if (g < 0.5) {
              if (gap(vec2(0.0))) gl_FragColor = vec4(0.22, 0.22, 0.24, 1.0); else discard; // fill gaps, leave real background
              return;
            }
            float r = id(vec2(1.0, 0.0), c), l = id(vec2(-1.0, 0.0), c), u = id(vec2(0.0, 1.0), c), b = id(vec2(0.0, -1.0), c);
            bool edgeOfBody = min(min(r, l), min(u, b)) < 0.015; // one outline around the whole figure
            bool group = g < ${MAP.length}.5; // and around the app's muscle groups (not hands, face, knees…)
            float d = max(max(abs(r - c), abs(l - c)), max(abs(u - c), abs(b - c)));
            if (!edgeOfBody && !(group && d > 0.015)) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, 0.85);
          }`,
      });
      const quad = new THREE.Scene(); quad.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edge));
      const quadCam = new THREE.Camera();

      renderer.setClearColor(0x000000, 0);
      [1, -1].forEach((z, i) => { // front view on the left, back view on the right
        const r = renderer!;
        const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 10);
        const s = size.y / h; cam.zoom = 1 / s; cam.updateProjectionMatrix();
        cam.position.set(mid.x, mid.y, mid.z + 3 * z); cam.lookAt(mid);
        r.setRenderTarget(ids_rt); use(ids); r.render(scene, cam); use(looks); // id pass (lights don't affect basic materials)
        r.setRenderTarget(null);
        r.setViewport(i * w / 2, 0, w / 2, h); r.setScissor(i * w / 2, 0, w / 2, h);
        r.render(scene, cam);
        r.autoClear = false; r.render(quad, quadCam); r.autoClear = true;
      });
      ids_rt.dispose();
    }).catch(() => setFailed(true));
    return () => { gone = true; renderer?.dispose(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return null;
  return (
    <div>
      <canvas ref={canvas} className="h-80 w-full" role="img" aria-label="Body diagram, front and back, with worked muscles highlighted" />
      <div className="muted -mt-1 grid grid-cols-2 text-center text-xs"><span>Front</span><span>Back</span></div>
    </div>
  );
}
