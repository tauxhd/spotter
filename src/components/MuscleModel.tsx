"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { buildBody, drawViews, paint, type Body } from "@/lib/body3d";

let model: Promise<THREE.Group> | undefined; // load once per page
function load() {
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  return (model ??= new GLTFLoader().setDRACOLoader(draco).loadAsync("/models/muscles.glb").then((g) => g.scene));
}
// start fetching the model in the background soon after the app opens, so the first body shows at once
if (typeof window !== "undefined") setTimeout(() => load().catch(() => {}), 1500);

// Front + back view of the muscle model; worked groups glow lime, faint for a little, full for the most (scene: lib/body3d).
// `compact`: a thumbnail (fills its parent, no outlines or labels) for the workout header button.
// The renderer and body are built once per canvas; a change in worked muscles only recolours and redraws (one frame).
export default function MuscleModel({ hit, compact = false }: { hit: Record<string, number>; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ r: THREE.WebGLRenderer; b: Body } | null>(null);
  const hitRef = useRef(hit);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(hit);

  function draw() {
    const s = st.current, el = canvas.current;
    if (!s || !el) return;
    paint(s.b, hitRef.current);
    drawViews(s.r, s.b, el.clientWidth, el.clientHeight, compact);
  }

  useEffect(() => { // build once
    const el = canvas.current;
    if (!el) return;
    let gone = false;
    load().then((src) => {
      if (gone) return;
      const r = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio));
      r.setSize(el.clientWidth, el.clientHeight, false);
      st.current = { r, b: buildBody(src) };
      draw();
    }).catch(() => setFailed(true));
    return () => { gone = true; st.current?.r.dispose(); st.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { hitRef.current = hit; draw(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return null;
  if (compact) return <canvas ref={canvas} className="h-full w-full" aria-hidden />;
  return (
    <div>
      <canvas ref={canvas} className="h-80 w-full" role="img" aria-label="Body diagram, front and back, with worked muscles highlighted" />
      <div className="muted -mt-1 grid grid-cols-2 text-center text-xs"><span>Front</span><span>Back</span></div>
    </div>
  );
}
