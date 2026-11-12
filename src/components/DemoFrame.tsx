"use client";
// The live demo iframe on the landing page. The app is laid out at a real phone width (390 px) and scaled down to fit
// the frame, so it looks like the phone, just smaller. It ignores the wheel until clicked, so scrolling the page over
// the phone doesn't get caught scrolling the app inside it instead.
import { useEffect, useRef, useState } from "react";

const W = 390;

export default function DemoFrame({ src }: { src: string }) {
  const [on, setOn] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ k: 1, h: 800 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { const k = el.clientWidth / W; setSize({ k, h: el.clientHeight / k }); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="relative h-full w-full pt-9" onMouseLeave={() => setOn(false)}>
      <div ref={box} className="relative h-full w-full overflow-hidden">
        <iframe src={src} title="Spotter demo" className="absolute left-0 top-0 origin-top-left border-0" loading="lazy"
          style={{ width: W, height: size.h, transform: `scale(${size.k})`, pointerEvents: on ? "auto" : "none" }} />
      </div>
      {!on && (
        <button onClick={() => setOn(true)} className="absolute inset-0 flex items-end justify-center pb-8">
          <span className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-lime-400/30">Tap to try it</span>
        </button>
      )}
    </div>
  );
}
