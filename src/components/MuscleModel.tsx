"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { buildBody, drawViews } from "@/lib/body3d";

let model: Promise<THREE.Group> | undefined; // load once per page
function load() {
  const draco = new DRACOLoader().setDecoderPath("/draco/");
  return (model ??= new GLTFLoader().setDRACOLoader(draco).loadAsync("/models/muscles.glb").then((g) => g.scene));
}

// Front + back view of the muscle model; worked groups glow lime, faint for a little, full for the most (scene: lib/body3d).
// `compact`: a thumbnail (fills its parent, no outlines or labels) for the workout header button.
export default function MuscleModel({ hit, compact = false }: { hit: Record<string, number>; compact?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(hit);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer | undefined, gone = false;
    load().then((src) => {
      if (gone) return;
      renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(el.clientWidth, el.clientHeight, false);
      drawViews(renderer, buildBody(src, hit), el.clientWidth, el.clientHeight, compact);
    }).catch(() => setFailed(true));
    return () => { gone = true; renderer?.dispose(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (failed) return null;
  if (compact) return <canvas ref={canvas} className="h-full w-full" aria-hidden />;
  return (
    <div>
      <canvas ref={canvas} className="h-80 w-full" role="img" aria-label="Body diagram, front and back, with worked muscles highlighted" />
      <div className="muted -mt-1 grid grid-cols-2 text-center text-xs"><span>Front</span><span>Back</span></div>
    </div>
  );
}
