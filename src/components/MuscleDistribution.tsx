"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { addSets, type Exercise } from "@/lib/data";
import { countsVolume } from "@/lib/lifting";
import { toUnit, type Unit } from "@/lib/units";

export type Log = { at: number; exercises: { ex?: Exercise; sets: { kg: number; reps: number; type?: string }[] }[] };

const AREAS = ["Back", "Chest", "Core", "Shoulders", "Arms", "Legs"] as const; // clockwise from top-left
const PERIODS = [["7D", 7], ["30D", 30], ["3M", 91], ["1Y", 365]] as const;
const DAY = 864e5;

// Sets per body area (secondary muscles count half) plus totals for one window of time.
function sum(logs: Log[], from: number, to: number) {
  const area: Record<string, number> = {};
  let workouts = 0, sets = 0, reps = 0, volume = 0;
  for (const l of logs) {
    if (l.at < from || l.at >= to) continue;
    workouts++;
    for (const e of l.exercises) {
      addSets(area, e.ex, e.sets.length);
      sets += e.sets.length;
      for (const st of e.sets) { reps += st.reps; if (countsVolume(st.type as never)) volume += st.kg * st.reps; }
    }
  }
  return { area, workouts, sets, reps, volume };
}

// Spider chart of sets per body area; optional dashed "previous" shape behind.
export function Radar({ cur, prev, className = "" }: { cur: Record<string, number>; prev?: Record<string, number>; className?: string }) {
  const max = Math.max(1, ...AREAS.flatMap((a) => [cur[a] ?? 0, prev?.[a] ?? 0]));
  const R = 92, C = 130; // radius, centre
  const pt = (i: number, f: number) => {
    const a = ((i * 60 - 120) * Math.PI) / 180; // Back at top-left, then clockwise
    return [C + Math.cos(a) * R * f, C + Math.sin(a) * R * f] as const;
  };
  const poly = (vals: Record<string, number>) => AREAS.map((a, i) => pt(i, (vals[a] ?? 0) / max).join(",")).join(" ");
  return (
    <svg viewBox="-40 0 340 260" className={className} role="img"
      aria-label={`Sets per muscle group: ${AREAS.map((a) => `${a} ${Math.round(cur[a] ?? 0)}`).join(", ")}`}>
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => <polygon key={f} points={AREAS.map((_, i) => pt(i, f).join(",")).join(" ")} fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />)}
      {AREAS.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, 1)[0]} y2={pt(i, 1)[1]} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />)}
      {prev && <polygon points={poly(prev)} className="fill-zinc-400/10 stroke-zinc-500" strokeWidth={1.5} strokeDasharray="4 3" />}
      <polygon points={poly(cur)} className="fill-lime-500/25 stroke-lime-500" strokeWidth={2} strokeLinejoin="round" />
      {AREAS.map((a, i) => { const [x, y] = pt(i, (cur[a] ?? 0) / max); return <circle key={a} cx={x} cy={y} r={2.5} className="fill-lime-400" />; })}
      {AREAS.map((a, i) => {
        const [x, y] = pt(i, 1.2);
        return <text key={a} x={x} y={y + 4} textAnchor={x < C - 10 ? "end" : x > C + 10 ? "start" : "middle"} className="fill-zinc-500 text-[11px]">{a}</text>;
      })}
    </svg>
  );
}

// Radar of where your sets went this period vs the one before, and the totals with their change.
export default function MuscleDistribution({ logs, u }: { logs: Log[]; u: Unit }) {
  const [p, setP] = useState(1);
  const days = PERIODS[p][1], now = Date.now();
  const cur = sum(logs, now - days * DAY, now + DAY);
  const prev = sum(logs, now - 2 * days * DAY, now - days * DAY);
  const kVol = (kg: number) => { const v = toUnit(kg, u); return v >= 1000 ? `${(v / 1000).toFixed(1)}k ${u}` : `${Math.round(v)} ${u}`; };
  const cards: [string, number, number, (n: number) => string][] = [
    ["Workouts", cur.workouts, prev.workouts, String], ["Sets", cur.sets, prev.sets, String],
    ["Volume", cur.volume, prev.volume, kVol], ["Reps", cur.reps, prev.reps, (n) => n.toLocaleString()],
  ];

  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Muscle distribution</h2>
        <div className="flex gap-4" role="group" aria-label="Period">
          {PERIODS.map(([label], i) => <button key={label} aria-pressed={p === i} onClick={() => setP(i)} className="tab pb-1 text-xs">{label}</button>)}
        </div>
      </div>

      <Radar cur={cur.area} prev={prev.area} className="mx-auto mt-2 w-full max-w-[22rem]" />
      <p className="muted -mt-1 flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-lime-500" />This {days === 7 ? "week" : "period"}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-500" />Previous</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
        {cards.map(([k, v, before, f]) => {
          const d = v - before;
          return (
            <div key={k}>
              <p className="muted text-xs">{k}</p>
              <p className="text-xl font-bold leading-tight tabular-nums">{f(v)}</p>
              <p className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${d > 0 ? "text-lime-600 dark:text-lime-400" : d < 0 ? "text-red-500" : "muted"}`}>
                {d > 0 ? <ArrowUp size={12} /> : d < 0 ? <ArrowDown size={12} /> : null}{d === 0 ? "Same as before" : f(Math.abs(d))}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
