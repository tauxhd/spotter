"use client";
// The live demo iframe on the landing page. It ignores the wheel until clicked, so scrolling the page over the phone
// doesn't get caught scrolling the app inside it instead.
import { useState } from "react";

export default function DemoFrame({ src }: { src: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative h-full w-full pt-9" onMouseLeave={() => setOn(false)}>
      <iframe src={src} title="Spotter demo" className="h-full w-full border-0" loading="lazy" style={{ pointerEvents: on ? "auto" : "none" }} />
      {!on && (
        <button onClick={() => setOn(true)} className="absolute inset-0 flex items-end justify-center pb-8">
          <span className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-lime-400/30">Tap to try it</span>
        </button>
      )}
    </div>
  );
}
