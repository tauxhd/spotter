// The 3D SweatZone (public/models/gym.glb, built in Blender from `floor` + `equipment` in lib/data; credits in
// public/models/CREDITS.txt), shared by the website (components/Gym3D) and the phone app (mobile/src/components/gym-3d).
// An isometric view: an orthographic camera looking down from one fixed corner. Each machine is a node named by its
// equipment id; the picked one glows lime with a pin over it and the camera glides in to it. With nothing picked it
// starts zoomed in at the entrance (bottom-right); drag to look around, pinch / wheel to zoom (pan, zoom).
// Platform-free: callers bring the loaded glTF scene, a three.js renderer, a frame loop and taps (as 0..1 of the view).
import * as THREE from "three";

const LIME = new THREE.Color("#84cc16");
const DIR = new THREE.Vector3(0.45, 0.95, 1).normalize(); // from the south-east, steep enough to see over the low walls
const DOOR = new THREE.Box3(new THREE.Vector3(18, 0, 35), new THREE.Vector3(24.5, 1, 43)); // inside the entrance (floor.door, plan x 450-610, y 875-1075)

type View = { c: THREE.Vector3; half: number };
export type Gym = {
  scene: THREE.Scene; cam: THREE.OrthographicCamera; parts: Map<string, THREE.Object3D>; pin: THREE.Mesh;
  view: View; goal: View; sel?: string; looks: Map<THREE.Mesh, THREE.Material>; bounds: THREE.Box3;
};

export function buildGym(src: THREE.Object3D, ids: string[]): Gym {
  const scene = new THREE.Scene();
  const root = src.clone(true);
  scene.add(root);
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && "metalness" in m) m.metalness = Math.min(m.metalness, 0.15); // no environment map: metal would read black
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3f3f46, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 12, 4);
  scene.add(sun);
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 20), new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.4 }));
  pin.rotation.x = Math.PI; // point down
  pin.visible = false;
  scene.add(pin);
  const parts = new Map(ids.map((id) => [id, root.getObjectByName(id)] as const).filter((p): p is [string, THREE.Object3D] => !!p[1]));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  cam.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(DIR, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
  const g: Gym = { scene, cam, parts, pin, view: { c: new THREE.Vector3(), half: 1 }, goal: { c: new THREE.Vector3(), half: 1 }, looks: new Map(), bounds: new THREE.Box3() };
  root.updateMatrixWorld(true);
  g.bounds.setFromObject(root);
  return g;
}

// Half-height of the view that fits a box, seen from DIR at this aspect (width / height).
function fit(g: Gym, box: THREE.Box3, aspect: number): View {
  const c = box.getCenter(new THREE.Vector3());
  const inv = g.cam.quaternion.clone().invert();
  let half = 0;
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Vector3(i & 1 ? box.min.x : box.max.x, i & 2 ? box.min.y : box.max.y, i & 4 ? box.min.z : box.max.z).sub(c).applyQuaternion(inv);
    half = Math.max(half, Math.abs(p.y), Math.abs(p.x) / aspect);
  }
  return { c, half: half * 1.08 };
}

// Pick a machine (or none = the whole gym). `jump` skips the glide (first frame).
export function focus(g: Gym, id: string | undefined, aspect: number, jump = false) {
  for (const [mesh, m] of g.looks) mesh.material = m;
  g.looks.clear();
  const part = id ? g.parts.get(id) : undefined;
  g.sel = part ? id : undefined;
  g.pin.visible = !!part;
  let box: THREE.Box3;
  if (part) {
    part.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      g.looks.set(mesh, m);
      const glow = m.clone();
      glow.emissive = LIME;
      glow.emissiveIntensity = 0.55;
      mesh.material = glow;
    });
    const b = new THREE.Box3().setFromObject(part);
    g.pin.position.set((b.min.x + b.max.x) / 2, b.max.y + 1.1, (b.min.z + b.max.z) / 2);
    box = b.clone().expandByVector(new THREE.Vector3(3, 0, 3)); // the machine plus what's around it
  } else {
    box = DOOR;
  }
  g.goal = fit(g, box, aspect);
  if (jump) g.view = { c: g.goal.c.clone(), half: g.goal.half };
}

// Drag the view by (dx, dy) pixels of a view h pixels tall; zoom by a factor (> 1 = closer). Kept over the gym floor.
export function pan(g: Gym, dx: number, dy: number, h: number, zoom = 1) {
  const v = g.view, px = (2 * v.half) / h;
  v.c.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(g.cam.quaternion), -dx * px)
    .addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(g.cam.quaternion), dy * px);
  v.c.addScaledVector(DIR, -v.c.y / DIR.y); // back down to the floor along the view ray
  const b = g.bounds;
  v.c.x = THREE.MathUtils.clamp(v.c.x, b.min.x, b.max.x); v.c.z = THREE.MathUtils.clamp(v.c.z, b.min.z, b.max.z);
  v.half = THREE.MathUtils.clamp(v.half / zoom, 2.5, 26);
  g.goal = { c: v.c.clone(), half: v.half }; // stop any glide
}

// Advance the glide by dt seconds; true while still moving (keep drawing frames).
export function step(g: Gym, dt: number) {
  const k = 1 - Math.exp(-dt * 7);
  g.view.c.lerp(g.goal.c, k);
  g.view.half += (g.goal.half - g.view.half) * k;
  const moving = g.view.c.distanceTo(g.goal.c) > 0.01 || Math.abs(g.view.half - g.goal.half) > 0.01;
  if (!moving) g.view = { c: g.goal.c.clone(), half: g.goal.half };
  return moving;
}

export function drawGym(r: THREE.WebGLRenderer, g: Gym, w: number, h: number) {
  const { cam, view } = g;
  const a = w / h;
  cam.left = -view.half * a; cam.right = view.half * a; cam.top = view.half; cam.bottom = -view.half;
  cam.position.copy(view.c).addScaledVector(DIR, 100);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  r.setSize(w, h, false);
  r.render(g.scene, cam);
}

// Which machine is under a tap at (x, y), each 0..1 across / down the view.
export function pick(g: Gym, x: number, y: number): string | undefined {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x * 2 - 1, 1 - y * 2), g.cam);
  for (const hit of ray.intersectObjects([...g.parts.values()], true)) {
    for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) if (g.parts.has(o.name)) return o.name;
  }
}
