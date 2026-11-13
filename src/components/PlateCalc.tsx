"use client";
// Workout: which plates go on each side of the bar. Opens on the exercise's heaviest set; type any weight, switch the bar.
import { X } from "lucide-react";
import { useState } from "react";
import { PLATE_COLOR, platesFor } from "@/lib/lifting";

const BARS = [20, 15, 10];
const fmt = (n: number) => String(Math.round(n * 100) / 100);

export default function PlateCalc({ name, start, bar: bar0 = 20, onClose }: { name: string; start: number; bar?: number; onClose: () => void }) {
  const [kg, setKg] = useState(start ? fmt(start) : "");
  const [bar, setBar] = useState(bar0);
  const total = Number(kg) || 0;
  const { side, left } = platesFor(total, bar);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="dialog" aria-modal aria-label="Plate calculator">
      <div className="anim-slide-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:bg-zinc-900 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-bold">Plate calculator</h2><p className="muted text-sm">{name}</p></div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center"><X size={20} /></button>
        </div>

        <label className="mt-4 flex items-baseline gap-2">
          <input value={kg} onChange={(e) => setKg(e.target.value.replace(/[^0-9.]/g, "").slice(0, 6))} inputMode="decimal" autoFocus aria-label="Total weight"
            className="w-32 rounded-xl bg-zinc-100 px-3 py-2 text-3xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800" />
          <span className="muted font-semibold">kg total</span>
        </label>
        <div className="mt-3 flex gap-1.5">
          {BARS.map((b) => <button key={b} onClick={() => setBar(b)} aria-pressed={bar === b} className="chip">{b} kg bar</button>)}
        </div>

        {/* the bar, loaded from the collar outwards, mirrored on both sides */}
        <div className="mt-6 flex h-28 items-center justify-center" aria-hidden>
          {[...side].reverse().map((p, i) => <Plate key={`l${i}`} p={p} />)}
          <div className="h-3 w-24 rounded-sm bg-zinc-400 dark:bg-zinc-500" />
          {side.map((p, i) => <Plate key={`r${i}`} p={p} />)}
        </div>

        <p className="mt-3 text-center text-lg font-semibold tabular-nums">
          {total <= bar ? (total ? `Just the bar (${bar} kg)` : "Type a weight") : side.length ? `${side.map(fmt).join(" + ")} kg each side` : "Too light for plates"}
        </p>
        {left > 0 && <p className="mt-1 text-center text-sm text-amber-500">{fmt(left)} kg can&apos;t be made with standard plates</p>}
      </div>
    </div>
  );
}

function Plate({ p }: { p: number }) {
  const h = 32 + (p / 25) * 76; // bigger plates are taller
  return (
    <div className="mx-px grid place-items-center rounded-sm border border-black/20 text-[9px] font-bold" style={{ height: h, width: p >= 10 ? 14 : 10, background: PLATE_COLOR[p], color: p === 5 || p === 1.25 ? "#18181b" : "#fff" }}>
      <span className="rotate-90 whitespace-nowrap">{fmt(p)}</span>
    </div>
  );
}
