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
  ["forearms", /brachioradialis|flexor carpi|extensor carpi|palmaris longus|flexor digitorum (superficialis|profundus)|extensor digitorum(?! (longus|brevis))|pronator|supinator|flexor pollicis longus|extensor pollicis|abductor pollicis longus/],
  ["back", /latissimus|trapezius|rhomboid|teres (major|minor)|infraspinatus|iliocostalis|levator scapulae/],
  ["abs", /rectus abdominis|external abdominal oblique|pyramidalis/],
  ["glutes", /gluteus|tensor fasciae/],
  ["quads", /rectus femoris|vastus|sartorius/],
  ["hamstrings", /biceps femoris|semitendinosus|semimembranosus/],
  ["calves", /gastrocnemius|soleus|plantaris|calcaneal tendon/],
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
      body.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const g = groupOf(o.name) ?? groupOf((o.material as THREE.Material).name ?? "");
        const t = g && max ? (hit[g] ?? 0) / max : 0;
        const c = t > 0 ? BASE.clone().lerp(LIME, 0.2 + 0.8 * t * t) : BASE; // squared so ½ reads clearly lighter than full
        o.material = new THREE.MeshStandardMaterial({ color: c, emissive: t > 0 ? LIME : new THREE.Color(0), emissiveIntensity: 0.3 * t * t, roughness: 0.7 });
      });
      const box = new THREE.Box3().setFromObject(body), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const scene = new THREE.Scene();
      scene.add(body, new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
      for (const z of [1, -1]) { const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(0.5, 1, 2 * z); scene.add(d); }

      renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      renderer.setScissorTest(true);
      const half = h * 1.04 / 2, aspect = w / 2 / h;
      [1, -1].forEach((z, i) => { // front view on the left, back view on the right
        const cam = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 10);
        const s = size.y / h; cam.zoom = 1 / s; cam.updateProjectionMatrix();
        cam.position.set(mid.x, mid.y, mid.z + 3 * z); cam.lookAt(mid);
        renderer!.setViewport(i * w / 2, 0, w / 2, h); renderer!.setScissor(i * w / 2, 0, w / 2, h);
        renderer!.render(scene, cam);
      });
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
