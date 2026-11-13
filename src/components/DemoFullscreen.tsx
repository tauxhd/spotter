"use client";
// Under the demo phone: open the same demo filling the whole window, with a floating button (and Esc) to come back.
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function DemoFullscreen({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    document.documentElement.style.overflow = "hidden";
    return () => { removeEventListener("keydown", esc); document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="mx-auto mt-5 flex items-center gap-2 text-sm font-semibold text-lime-400 transition hover:text-lime-300 active:scale-[0.97]">
        <Maximize2 size={16} />Open full screen
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-zinc-950" role="dialog" aria-label="Spotter demo, full screen">
          <iframe src={src} title="Spotter demo, full screen" className="h-full w-full border-0" />
          <button type="button" onClick={() => setOpen(false)} autoFocus
            className="glass-bar fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg active:scale-[0.97]">
            <Minimize2 size={16} />Exit full screen
          </button>
        </div>
      )}
    </>
  );
}
