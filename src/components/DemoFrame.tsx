"use client";
// The live demo iframe on the landing page. The app is laid out at a real phone width (390 px) and scaled down to fit
// the frame, so it looks like the phone, just smaller. It's live straight away; the "Tap to try it" pill is only a
// hint and goes once the mouse reaches the phone. Over the phone the mouse becomes a fingertip: our own dot, drawn here
// and fed by the frame's mouse events (same origin), since browsers refuse big cursor images near a frame's edges.
import { useEffect, useRef, useState } from "react";

const W = 390;
type Dot = { x: number; y: number; down: boolean } | null;

export default function DemoFrame({ src }: { src: string }) {
  const [seen, setSeen] = useState(false);
  const [dot, setDot] = useState<Dot>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ k: 1, h: 800 });
  const k = useRef(1);

  useEffect(() => {
    const el = box.current, f = frame.current;
    if (!el || !f) return;
    const ro = new ResizeObserver(() => { k.current = el.clientWidth / W; setSize({ k: k.current, h: el.clientHeight / k.current }); });
    ro.observe(el);
    const blur = () => setSeen(true); // a tap inside the frame moves focus into it
    addEventListener("blur", blur);

    // the frame's mouse, in this wrapper's pixels
    const move = (e: MouseEvent) => {
      const b = el.getBoundingClientRect(), w = wrap.current!.getBoundingClientRect();
      setSeen(true);
      setDot((d) => ({ x: b.left - w.left + e.clientX * k.current, y: b.top - w.top + e.clientY * k.current, down: d?.down ?? false }));
    };
    const down = () => setDot((d) => d && { ...d, down: true });
    const up = () => setDot((d) => d && { ...d, down: false });
    const leave = () => setDot(null);
    let doc: Document | null = null;
    const detach = () => { doc?.removeEventListener("mousemove", move); doc?.removeEventListener("mousedown", down); doc?.removeEventListener("mouseup", up); doc?.documentElement.removeEventListener("mouseleave", leave); };
    const attach = () => {
      detach();
      doc = f.contentDocument;
      if (!doc) return;
      doc.addEventListener("mousemove", move); doc.addEventListener("mousedown", down); doc.addEventListener("mouseup", up); doc.documentElement.addEventListener("mouseleave", leave);
    };
    f.addEventListener("load", attach);
    if (f.contentDocument?.readyState === "complete") attach();
    return () => { ro.disconnect(); removeEventListener("blur", blur); f.removeEventListener("load", attach); detach(); };
  }, []);

  const here = (e: React.MouseEvent) => { const w = wrap.current!.getBoundingClientRect(); setDot((d) => ({ x: e.clientX - w.left, y: e.clientY - w.top, down: d?.down ?? false })); };
  return (
    <div ref={wrap} className="relative h-full w-full cursor-none pt-9" onMouseMove={here} onMouseLeave={() => setDot(null)}
      onMouseDown={() => setDot((d) => d && { ...d, down: true })} onMouseUp={() => setDot((d) => d && { ...d, down: false })}>
      <div ref={box} className="relative h-full w-full overflow-hidden">
        <iframe ref={frame} src={src} title="Spotter demo" className="absolute left-0 top-0 origin-top-left border-0" loading="lazy"
          style={{ width: W, height: size.h, transform: `scale(${size.k})` }} />
      </div>
      <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-lime-400/30 transition-opacity duration-300"
        style={{ opacity: seen ? 0 : 1 }} aria-hidden>Tap to try it</span>
      {dot && (
        <span className="pointer-events-none absolute z-20 h-7 w-7 rounded-full border-2 border-white bg-white/35 shadow-[0_0_12px_rgba(0,0,0,.4)] transition-transform duration-100"
          style={{ left: dot.x, top: dot.y, transform: `translate(-50%,-50%) scale(${dot.down ? 0.75 : 1})` }} aria-hidden />
      )}
    </div>
  );
}
