"use client";
// Stats: training by week, month or year. Switch the bars between workouts, volume, time and sets; tap a bar to see that
// period against the one before it.
import { useState } from "react";
import { buckets, change, type Metric, type Period, type PostLike } from "@/lib/progress";
import { wTotal, type Unit } from "@/lib/units";

const hrs = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`);
const METRICS: [Metric, string][] = [["workouts", "Workouts"], ["volume", "Volume"], ["minutes", "Time"], ["sets", "Sets"]];
const PERIODS: Period[] = ["week", "month", "year"];

export function Delta({ cur, prev, against }: { cur: number; prev: number; against?: string }) {
  const c = change(cur, prev);
  if (c === null) return against ? <span className="muted">First one on record</span> : null;
  return <span className={c > 0 ? "text-lime-600 dark:text-lime-400" : c < 0 ? "text-red-500" : "muted"}>{c > 0 ? "↑" : c < 0 ? "↓" : "="} {Math.abs(c)}%{against ? ` vs ${against}` : ""}</span>;
}

export default function Progress({ posts, u }: { posts: PostLike[]; u: Unit }) {
  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("workouts");
  const [pick, setPick] = useState<number | null>(null);
  const b = buckets(posts, period);
  const i = pick ?? b.length - 1, cur = b[i], prev = b[i - 1];
  const fmt = (m: Metric, v: number) => (m === "volume" ? wTotal(v, u) : m === "minutes" ? hrs(v) : String(v));
  const max = Math.max(1, ...b.map((x) => x[metric]));

  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
      <div className="flex items-center justify-between gap-2">
        <p className="muted truncate text-xs font-semibold uppercase tracking-wider">{cur.long}</p>
        <div role="tablist" aria-label="Group by" className="flex shrink-0 rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold dark:bg-zinc-900">
          {PERIODS.map((p) => (
            <button key={p} role="tab" aria-selected={period === p} onClick={() => { setPeriod(p); setPick(null); }}
              className={`rounded-md px-2.5 py-1 capitalize transition ${period === p ? "bg-white shadow-sm dark:bg-zinc-700" : "muted"}`}>{p}</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        {fmt(metric, cur[metric])}{(metric === "workouts" || metric === "sets") && <span className="text-base font-medium text-zinc-500"> {metric === "sets" ? "sets" : cur.workouts === 1 ? "workout" : "workouts"}</span>}
      </p>
      <p className="text-sm font-medium tabular-nums">{prev ? <Delta cur={cur[metric]} prev={prev[metric]} against={prev.long.replace("Week of ", "the week of ")} /> : <span className="muted">&nbsp;</span>}</p>

      <div className="mt-4 flex h-28 items-end gap-1.5" role="group" aria-label={`${metric} per ${period}`}>
        {b.map((x, k) => (
          <button key={x.start} onClick={() => setPick(k)} aria-pressed={k === i} aria-label={`${x.long}: ${fmt(metric, x[metric])}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className={`text-[10px] font-semibold tabular-nums ${k === i ? "" : "muted"}`}>{x[metric] ? (metric === "volume" ? `${Math.round(x.volume / 1000)}t` : metric === "minutes" ? `${Math.round(x.minutes / 60)}h` : x[metric]) : ""}</span>
            <div className={`w-full rounded-md transition-colors ${k === i ? "bg-lime-500" : "bg-zinc-300 dark:bg-zinc-700"}`} style={{ height: `${Math.max(4, (x[metric] / max) * 72)}px` }} />
            <span className={`text-[9px] tabular-nums ${k === i ? "font-semibold" : "muted"}`}>{x.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto">
        {METRICS.map(([m, label]) => (
          <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className="chip shrink-0">{label}</button>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {([...METRICS.filter(([m]) => m !== metric), ["prs", "PRs"]] as [Metric | "prs", string][]).map(([m, label]) => (
          <div key={m} className="flex items-baseline justify-between gap-2">
            <dt className="muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{m === "prs" ? cur.prs : fmt(m, cur[m])} {prev && <span className="text-xs font-medium"><Delta cur={cur[m]} prev={prev[m]} /></span>}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
