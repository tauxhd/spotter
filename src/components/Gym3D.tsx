"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { equipment } from "@/lib/data";
import { buildGym, drawGym, focus, pan, pick, step, type Gym } from "@/lib/gym3d";

let model: Promise<THREE.Group> | undefined; // load once per page
const load = () => (model ??= new GLTFLoader().loadAsync("/models/gym.glb").then((g) => g.scene));
const ids = equipment.map((e) => e.id);

// Isometric 3D gym (lib/gym3d): the picked machine glows with a pin over it and the camera glides to it; tap a machine to pick it,
// drag to look around, pinch or scroll-wheel to zoom.
export default function Gym3D({ sel, onPick }: { sel?: string; onPick: (id?: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ r: THREE.WebGLRenderer; g: Gym; raf: number } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  const touch = useRef({ pts: new Map<number, { x: number; y: number }>(), moved: 0 });

  function redraw() { const s = st.current, el = canvas.current; if (s && el) drawGym(s.r, s.g, el.clientWidth, el.clientHeight); }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const t = touch.current, s = st.current, p = t.pts.get(e.pointerId);
    if (!s || !p) return;
    const pts = [...t.pts.values()];
    const mid = (a: { x: number; y: number }[]) => ({ x: (a[0].x + a[a.length - 1].x) / 2, y: (a[0].y + a[a.length - 1].y) / 2 });
    const dist = (a: { x: number; y: number }[]) => Math.hypot(a[0].x - a[a.length - 1].x, a[0].y - a[a.length - 1].y) || 1;
    const m0 = mid(pts), d0 = dist(pts);
    p.x = e.clientX; p.y = e.clientY;
    const m1 = mid(pts), d1 = dist(pts);
    t.moved += Math.abs(m1.x - m0.x) + Math.abs(m1.y - m0.y) + Math.abs(d1 - d0);
    pan(s.g, m1.x - m0.x, m1.y - m0.y, e.currentTarget.clientHeight, pts.length > 1 ? d1 / d0 : 1);
    redraw();
  }

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
    const ro = new ResizeObserver(redraw);
    const wheel = (e: WheelEvent) => { const s = st.current; if (!s) return; e.preventDefault(); pan(s.g, 0, 0, el.clientHeight, Math.exp(-e.deltaY * 0.0015)); redraw(); };
    el.addEventListener("wheel", wheel, { passive: false });
    ro.observe(el);
    return () => { gone = true; ro.disconnect(); el.removeEventListener("wheel", wheel); if (st.current) { cancelAnimationFrame(st.current.raf); st.current.r.dispose(); } st.current = null; };
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
      <canvas ref={canvas} className="h-[60dvh] max-h-[560px] w-full cursor-grab touch-none active:cursor-grabbing" role="img" aria-label="3D view of the gym"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          if (!touch.current.pts.size) touch.current.moved = 0;
          touch.current.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }}
        onPointerMove={move}
        onPointerUp={(e) => {
          const t = touch.current, s = st.current;
          t.pts.delete(e.pointerId);
          if (!s || t.pts.size || t.moved > 8) return; // a drag or pinch, not a tap
          const b = e.currentTarget.getBoundingClientRect();
          const id = pick(s.g, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
          if (id) onPick(id); // a tap on the floor keeps where you are
        }}
        onPointerCancel={(e) => touch.current.pts.delete(e.pointerId)} />
      {state === "loading" && <div className="absolute inset-0 p-2" aria-label="Loading the 3D gym"><div className="bone h-full" /></div>}
      {sel && state === "ok" && (
        <button onClick={() => onPick(undefined)} className="chip absolute bottom-2 right-2">Back to entrance</button>
      )}
    </div>
  );
}
