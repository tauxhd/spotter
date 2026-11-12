"use client";
// A small (i) next to a word: tap it for a short explanation in a pop-up bubble anchored under it. Tap anywhere,
// scroll or press Escape to close. The phone app's twin is mobile/src/components/ui/info-tip.tsx.
import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function InfoTip({ text, label = "More info", size = 15 }: { text: string; label?: string; size?: number }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ top: number; left: number; arrow: number } | null>(null);

  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("scroll", close, { passive: true, capture: true });
    addEventListener("keydown", key);
    const t = setTimeout(() => addEventListener("click", close, true), 0); // capture: closes even inside dialogs that stop clicks; not the opening click
    return () => { removeEventListener("scroll", close, { capture: true }); removeEventListener("keydown", key); removeEventListener("click", close, true); clearTimeout(t); };
  }, [at]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (at) return setAt(null);
    const r = btn.current!.getBoundingClientRect();
    const w = Math.min(272, innerWidth - 24), mid = r.left + r.width / 2;
    const left = Math.min(Math.max(12, mid - w / 2), innerWidth - 12 - w);
    setAt({ top: r.bottom + 8, left, arrow: mid - left });
  }

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label={label} aria-expanded={!!at}
        className={`relative z-10 inline-grid shrink-0 place-items-center rounded-full align-middle transition active:scale-90 ${at ? "text-lime-500" : "muted hover:text-zinc-700 dark:hover:text-zinc-200"}`}>
        <Info size={size} strokeWidth={2.25} />
      </button>
      {at && (
        <span role="tooltip" onClick={(e) => e.stopPropagation()} style={{ top: at.top, left: at.left, width: Math.min(272, innerWidth - 24), transformOrigin: `${at.arrow}px 0` }}
          className="anim-bubble fixed z-50 block rounded-xl bg-zinc-900 px-3 py-2.5 text-left text-[13px] font-normal normal-case leading-snug tracking-normal text-zinc-100 shadow-xl ring-1 ring-white/10 dark:bg-zinc-800">
          <span aria-hidden className="absolute -top-1 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-zinc-900 ring-1 ring-white/10 [clip-path:polygon(0_0,100%_0,0_100%)] dark:bg-zinc-800" style={{ left: at.arrow }} />
          {text}
        </span>
      )}
    </>
  );
}
