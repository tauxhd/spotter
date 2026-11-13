"use client";
// Pull down at the top of any app page to reload it (posts, your own data, and pages that watch s.rev). The page turns off
// the browser's own pull-to-refresh (overscroll-behavior: none), which would reload the whole app and its splash.
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

const GO = 64; // px pulled (after resistance) to trigger

export default function PullRefresh() {
  const { refresh } = useStore();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const y0 = useRef<number | null>(null), now = useRef(0), live = useRef(false);

  useEffect(() => {
    const start = (e: TouchEvent) => { y0.current = scrollY <= 0 && !live.current ? e.touches[0].clientY : null; };
    const move = (e: TouchEvent) => {
      if (y0.current === null) return;
      const d = e.touches[0].clientY - y0.current;
      now.current = d > 0 ? Math.min(GO * 1.6, d * 0.45) : 0; // resistance, like a rubber band
      setPull(now.current);
    };
    const end = async () => {
      if (y0.current === null) return;
      y0.current = null;
      const go = now.current >= GO;
      now.current = 0; setPull(0);
      if (!go) return;
      live.current = true; setBusy(true);
      try { await refresh(); } finally { live.current = false; setBusy(false); }
    };
    addEventListener("touchstart", start, { passive: true });
    addEventListener("touchmove", move, { passive: true });
    addEventListener("touchend", end);
    addEventListener("touchcancel", end);
    return () => { removeEventListener("touchstart", start); removeEventListener("touchmove", move); removeEventListener("touchend", end); removeEventListener("touchcancel", end); };
  }, [refresh]);

  const shown = busy ? GO : pull;
  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center" style={{ transform: `translateY(${shown - 28}px)` }} aria-live="polite">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-lime-400 shadow-lg ring-1 ring-white/10">
        <RefreshCw size={18} className={busy ? "animate-spin" : ""} style={busy ? undefined : { transform: `rotate(${pull * 4}deg)`, opacity: Math.min(1, pull / GO) }} />
      </span>
      {busy && <span className="sr-only">Refreshing</span>}
    </div>
  );
}
