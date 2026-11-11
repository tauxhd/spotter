"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import { useStore } from "@/lib/store";
import { setTypes, timedByDefault } from "@/lib/data";
import { countsPR, countsVolume, e1rm, mmss, setLabels } from "@/lib/lifting";
import { LEVELS, bodyFor, isLoadedBodyweight, strengthLevel } from "@/lib/strength";
import { w, wNum } from "@/lib/units";

type Point = { at: number; heaviest: number; orm: number; setVol: number; vol: number; reps: number; hold: number };
type Metric = { key: keyof Point; label: string; kind: "kg" | "reps" | "time" };
const RANGES = [["3M", 91], ["1Y", 365], ["All", Infinity]] as const;
const DAY = 864e5;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// One exercise, your history with it: progress plot, personal records, best weight for each rep count, past sessions.
export default function ExerciseStats() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { s, me, u } = useStore();
  const ex = s.library.find((e) => e.id === id);
  const [tab, setTab] = useState<"summary" | "history">("summary");
  const [metric, setMetric] = useState(0);
  const [range, setRange] = useState(1);
  const [pick, setPick] = useState<number | null>(null);

  const timed = timedByDefault(id);
  const added = isLoadedBodyweight(id);
  const body = bodyFor(s.library, Number(me.bw))(ex?.name ?? "");

  // One point per session that has done sets of this exercise, oldest first.
  const sessions = useMemo(() => s.sessions
    .map((x) => ({ at: new Date(x.at).getTime(), title: x.title, sets: x.exercises.filter((e) => e.name === ex?.name).flatMap((e) => e.sets.filter((st) => st.done)) }))
    .filter((x) => x.sets.length).sort((a, b) => a.at - b.at), [s.sessions, ex?.name]);

  const points: Point[] = sessions.map(({ at, sets }) => {
    const work = sets.filter((st) => countsPR(st.type));
    const vol = sets.filter((st) => countsVolume(st.type));
    return {
      at,
      heaviest: Math.max(0, ...work.map((st) => st.kg)),
      orm: Math.max(0, ...work.filter((st) => st.reps > 0 && st.kg + body > 0).map((st) => e1rm(st.kg + body, st.reps) - body)),
      setVol: Math.max(0, ...vol.map((st) => st.kg * st.reps)),
      vol: vol.reduce((n, st) => n + st.kg * st.reps, 0),
      reps: Math.max(0, ...work.map((st) => st.reps)),
      hold: Math.max(0, ...sets.map((st) => st.secs ?? 0)),
    };
  });

  const metrics: Metric[] = timed
    ? [{ key: "hold", label: "Longest hold", kind: "time" }]
    : [
        { key: "heaviest", label: added ? "Heaviest added" : "Heaviest weight", kind: "kg" },
        { key: "orm", label: "One rep max", kind: "kg" },
        { key: "setVol", label: "Best set volume", kind: "kg" },
        { key: "vol", label: "Session volume", kind: "kg" },
        { key: "reps", label: "Most reps", kind: "reps" },
      ];
  const m = metrics[Math.min(metric, metrics.length - 1)];
  const fmt = (v: number, kind = m.kind) => (kind === "time" ? mmss(v) : kind === "reps" ? `${v} reps` : w(Math.round(v * 10) / 10, u));

  // personal records
  const allSets = sessions.flatMap((x) => x.sets.filter((st) => countsPR(st.type)));
  const best = <K extends keyof Point>(k: K) => Math.max(0, ...points.map((p) => p[k] as number));
  const bestSet = allSets.reduce<{ kg: number; reps: number } | null>((b, st) => (!b || st.kg * st.reps > b.kg * b.reps ? st : b), null);
  const repRecords = Object.entries(allSets.reduce<Record<number, number>>((r, st) => { if (st.reps > 0) r[st.reps] = Math.max(r[st.reps] ?? -Infinity, st.kg); return r; }, {}))
    .map(([reps, kg]) => [Number(reps), kg] as const).sort((a, b) => a[0] - b[0]);

  const lvl = !timed && points.length ? strengthLevel(id, best("orm"), Number(me.bw), me.sex) : null;

  if (!ex) return s.library.length ? <EmptyState art="not-found" title="Exercise not found" className="mt-16" /> : null;

  const records: [string, string][] = timed
    ? [["Longest hold", best("hold") ? mmss(best("hold")) : "–"]]
    : [
        [added ? "Heaviest added" : "Heaviest weight", points.length ? `${added ? "+" : ""}${w(best("heaviest"), u)}` : "–"],
        ["Best 1RM", best("orm") ? `${added ? "+" : ""}${w(Math.round(best("orm") * 10) / 10, u)}` : "–"],
        ["Best set volume", bestSet ? `${wNum(bestSet.kg, u)} ${u} × ${bestSet.reps}` : "–"],
        ["Best session volume", best("vol") ? w(Math.round(best("vol")), u) : "–"],
      ];

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">{ex.name}</h1>
        <span />
      </header>

      <nav className="-mx-4 flex gap-6 border-b border-zinc-200 px-4 dark:border-zinc-800">
        {(["summary", "history"] as const).map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)} className="tab">{cap(t)}</button>)}
      </nav>

      {tab === "summary" ? (
        <>
          <section className="-mx-4 flex items-center gap-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
            <Image src={ex.image} alt="" width={112} height={112} className="shrink-0 rounded-lg bg-zinc-900" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight">{ex.name}</h2>
              <p className="muted mt-1 text-sm">Primary: <span className="text-zinc-800 dark:text-zinc-200">{cap(ex.muscle)}</span></p>
              {ex.secondary.length > 0 && <p className="muted text-sm">Secondary: <span className="text-zinc-800 dark:text-zinc-200">{ex.secondary.map(cap).join(", ")}</span></p>}
              <p className="muted text-sm">{cap(ex.equipment)}</p>
            </div>
          </section>

          {points.length === 0 ? (
            <EmptyState art="stats" title="No sets logged yet" text="Do this exercise in a workout and your progress shows up here." className="mt-6" />
          ) : (
            <>
              <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
                <Plot points={points} k={m.key} days={RANGES[range][1]} fmt={(v) => fmt(v)} pick={pick} onPick={setPick} />
                <div className="mt-1 flex justify-end gap-4">
                  {RANGES.map(([label], i) => <button key={label} aria-pressed={range === i} onClick={() => { setRange(i); setPick(null); }} className="tab pb-1 text-xs">{label}</button>)}
                </div>
                {metrics.length > 1 && (
                  <div className="no-scrollbar -mx-4 mt-3 flex gap-5 overflow-x-auto px-4" role="group" aria-label="Chart metric">
                    {metrics.map((x, i) => <button key={x.key} aria-pressed={metric === i} onClick={() => { setMetric(i); setPick(null); }} className="tab">{x.label}</button>)}
                  </div>
                )}
              </section>

              <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
                <h3 className="mb-1 flex items-center gap-2 font-semibold"><Icon name="medal" size={22} />Personal records</h3>
                <ul>
                  {records.map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800/60">
                      <span>{k}</span><span className="font-semibold tabular-nums text-lime-600 dark:text-lime-400">{v}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {lvl && (
                <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="ranks" size={22} />Strength level</h3>
                  <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800">
                    <div><p className="muted text-xs">Best 1RM</p><p className="text-lg font-bold tabular-nums">{added ? "+" : ""}{w(Math.round(best("orm") * 10) / 10, u)}</p></div>
                    <div className="pl-4"><p className="muted text-xs">Level</p><p className="text-lg font-bold text-lime-600 dark:text-lime-400">{lvl.level}</p></div>
                  </div>
                  <div className="relative mt-4" role="meter" aria-label="Strength level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(lvl.pos * 100)} aria-valuetext={lvl.level}>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-2 flex-1 overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-800">
                          <div className="h-full bg-lime-500" style={{ width: `${Math.min(100, Math.max(0, (lvl.pos * 4 - i) * 100))}%` }} />
                        </div>
                      ))}
                    </div>
                    <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-lime-400 shadow-[0_0_10px_rgb(132_204_22/0.7)]" style={{ left: `${lvl.pos * 100}%` }} />
                  </div>
                  <div className="muted mt-2 flex justify-between text-[11px]">{LEVELS.map((l) => <span key={l} className={l === lvl.level ? "font-semibold text-zinc-800 dark:text-zinc-100" : ""}>{l}</span>)}</div>
                  <p className="muted mt-3 text-sm">
                    Stronger than about <b className="text-zinc-800 dark:text-zinc-100">{lvl.pct}%</b> of {me.sex === "F" ? "women" : "men"} who train, at your bodyweight.
                    {lvl.next && <> {lvl.next.level} at {added ? "+" : ""}{w(Math.max(0, Math.ceil(lvl.next.kg / 2.5) * 2.5), u)}.</>}
                  </p>
                </section>
              )}

              {!timed && repRecords.length > 0 && (
                <section className="-mx-4 px-4 py-4">
                  <h3 className="mb-1 font-semibold">Set records</h3>
                  <div className="muted grid grid-cols-2 border-b border-zinc-100 py-2 text-xs font-semibold dark:border-zinc-800/60"><span>Reps</span><span>Personal best</span></div>
                  <ul>
                    {repRecords.map(([reps, kg]) => (
                      <li key={reps} className="grid grid-cols-2 border-b border-zinc-100 py-2.5 tabular-nums last:border-0 dark:border-zinc-800/60">
                        <span className="font-semibold">{reps}</span><span>{added && kg > 0 ? "+" : ""}{kg > 0 || !added ? w(kg, u) : "Bodyweight"}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      ) : (
        <section className="pt-2">
          {sessions.length === 0 && <EmptyState art="workouts" title="No history yet" text="Sessions with this exercise appear here." className="mt-6" />}
          <ul>
            {[...sessions].reverse().map((x) => (
              <li key={x.at} className="-mx-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800/80">
                <p className="font-semibold">{x.title}</p>
                <p className="muted text-xs">{new Date(x.at).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                <ol className="mt-2 space-y-1 text-sm tabular-nums">
                  {x.sets.map((st, i) => (
                    <li key={i} className={`flex gap-3 ${st.type === "warmup" ? "muted" : ""}`}>
                      <span className={`w-5 ${st.type === "warmup" ? "font-bold text-amber-500" : "muted"}`}>{setLabels(x.sets, setTypes)[i]}</span>
                      <span>{timed ? `${st.kg ? `${w(st.kg, u)} × ` : ""}${mmss(st.secs ?? 0)}` : `${st.kg || !added ? w(st.kg, u) : "BW"} × ${st.reps}`}</span>
                      {!timed && countsPR(st.type) && st.reps > 0 && st.kg + body > 0 && <span className="muted ml-auto text-xs">1RM {w(Math.round(e1rm(st.kg + body, st.reps) - body), u)}</span>}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Line plot of one metric over time. Tap a dot to read its value.
function Plot({ points, k, days, fmt, pick, onPick }: { points: Point[]; k: keyof Point; days: number; fmt: (v: number) => string; pick: number | null; onPick: (i: number | null) => void }) {
  const now = Date.now();
  const pts = points.filter((p) => now - p.at <= days * DAY);
  const W = 340, H = 150, L = 34, B = 18, T = 10;
  if (!pts.length) return <p className="muted py-10 text-center text-sm">Nothing logged in this range.</p>;
  const ys = pts.map((p) => p[k] as number);
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.15 || hi * 0.1 || 1;
  const y0 = Math.max(0, lo - pad), y1 = hi + pad;
  const t0 = pts[0].at, t1 = Math.max(pts.at(-1)!.at, t0 + DAY);
  const x = (t: number) => (pts.length === 1 ? (L + W) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - 6));
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const sel = pick !== null && pts[pick] ? pick : pts.length - 1;
  const ticks = [y0, (y0 + y1) / 2, y1];
  const dates = pts.length === 1 ? [t0] : [t0, t0 + (t1 - t0) / 2, t1];
  const day = (t: number) => new Date(t).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{fmt(pts[sel][k] as number)} <span className="text-sm font-medium text-lime-600 dark:text-lime-400">{day(pts[sel].at)}</span></p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="Progress over time">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W} y1={y(v)} y2={y(v)} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1} />
            <text x={L - 4} y={y(v) + 3} textAnchor="end" className="fill-zinc-500 text-[9px]">{Math.round(v)}</text>
          </g>
        ))}
        {dates.map((t, i) => <text key={i} x={x(t)} y={H - 4} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} className="fill-zinc-500 text-[9px]">{day(t)}</text>)}
        <polyline points={pts.map((p) => `${x(p.at)},${y(p[k] as number)}`).join(" ")} fill="none" className="stroke-lime-500" strokeWidth={2} strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={p.at} onClick={() => onPick(i)} className="cursor-pointer">
            <circle cx={x(p.at)} cy={y(p[k] as number)} r={12} fill="transparent" />
            <circle cx={x(p.at)} cy={y(p[k] as number)} r={i === sel ? 5 : 3} className={i === sel ? "fill-lime-400 stroke-zinc-950" : "fill-lime-500"} strokeWidth={i === sel ? 2 : 0} />
          </g>
        ))}
      </svg>
    </div>
  );
}
