"use client";
// The live demo iframe on the landing page. The app is laid out at a real phone width (390 px) and scaled down to fit
// the frame, so it looks like the phone, just smaller. It's live straight away; the "Tap to try it" pill is only a
// hint and goes once the mouse reaches the phone. The phone fits the screen height, so the page can still be scrolled
// beside it.
import { useEffect, useRef, useState } from "react";

import { TOUCH } from "@/lib/touch";

const W = 390;

export default function DemoFrame({ src }: { src: string }) {
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ k: 1, h: 800 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { const k = el.clientWidth / W; setSize({ k, h: el.clientHeight / k }); });
    ro.observe(el);
    const blur = () => setSeen(true); // a tap inside the frame moves focus into it
    addEventListener("blur", blur);
    return () => { ro.disconnect(); removeEventListener("blur", blur); };
  }, []);
  return (
    <div className="relative h-full w-full pt-9" style={{ cursor: TOUCH }} onPointerEnter={() => setSeen(true)}>
      <div ref={box} className="relative h-full w-full overflow-hidden">
        <iframe src={src} title="Spotter demo" className="absolute left-0 top-0 origin-top-left border-0" loading="lazy"
          style={{ width: W, height: size.h, transform: `scale(${size.k})` }} />
      </div>
      <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-lime-400/30 transition-opacity duration-300"
        style={{ opacity: seen ? 0 : 1 }} aria-hidden>Tap to try it</span>
    </div>
  );
}
