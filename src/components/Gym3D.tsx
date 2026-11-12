"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { equipment } from "@/lib/data";
import { buildGym, drawGym, focus, pick, step, type Gym } from "@/lib/gym3d";

let model: Promise<THREE.Group> | undefined; // load once per page
const load = () => (model ??= new GLTFLoader().loadAsync("/models/gym.glb").then((g) => g.scene));
const ids = equipment.map((e) => e.id);

// Isometric 3D gym (lib/gym3d): the picked machine glows with a pin over it and the camera glides to it; tap a machine to pick it.
export default function Gym3D({ sel, onPick }: { sel?: string; onPick: (id?: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ r: THREE.WebGLRenderer; g: Gym; raf: number } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");

  function run() { // draw frames until the glide settles
    const s = st.current, el = canvas.current;
    if (!s || !el || s.raf) return;
    let last = performance.now();
    const frame = (now: number) => {
      const moving = step(s.g, Math.min(0.05, (now - last) / 1000));
      last = now;
      drawGym(s.r, s.g, el.clientWidth, el.clientHeight);
      s.raf = moving ? requestAnimationFrame(frame) : 0;
    };
    s.raf = requestAnimationFrame(frame);
  }

  useEffect(() => { // build once
    const el = canvas.current;
    if (!el) return;
    let gone = false;
    load().then((src) => {
      if (gone) return;
      const r = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio));
      const g = buildGym(src, ids);
      focus(g, sel, el.clientWidth / el.clientHeight, true);
      st.current = { r, g, raf: 0 };
      drawGym(r, g, el.clientWidth, el.clientHeight);
      setState("ok");
    }).catch(() => setState("failed"));
    const ro = new ResizeObserver(() => { const s = st.current; if (s) { focus(s.g, s.g.sel, el.clientWidth / el.clientHeight, true); drawGym(s.r, s.g, el.clientWidth, el.clientHeight); } });
    ro.observe(el);
    return () => { gone = true; ro.disconnect(); if (st.current) { cancelAnimationFrame(st.current.raf); st.current.r.dispose(); } st.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // a new pick: glow + glide
    const s = st.current, el = canvas.current;
    if (!s || !el || s.g.sel === sel) return;
    focus(s.g, sel, el.clientWidth / el.clientHeight);
    run();
  }, [sel]);

  if (state === "failed") return null;
  return (
    <div className="relative">
      <canvas ref={canvas} className="h-[60dvh] max-h-[560px] w-full cursor-pointer touch-manipulation" role="img" aria-label="3D view of the gym"
        onClick={(e) => {
          const s = st.current;
          if (!s) return;
          const b = e.currentTarget.getBoundingClientRect();
          onPick(pick(s.g, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height));
        }} />
      {state === "loading" && <div className="absolute inset-0 p-2" aria-label="Loading the 3D gym"><div className="bone h-full" /></div>}
      {sel && state === "ok" && (
        <button onClick={() => onPick(undefined)} className="chip absolute bottom-2 right-2">Whole gym</button>
      )}
    </div>
  );
}
