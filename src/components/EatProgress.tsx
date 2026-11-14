"use client";
// Eat > Progress: maintenance calories, today's targets, weight trend + goal, and intake vs maintenance.
// The phone app's twin is mobile/src/components/eat-progress.tsx.
import { useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleCheck, Info, TrendingDown, TrendingUp } from "lucide-react";
import Icon from "@/components/Icon";
import TrendChart from "@/components/TrendChart";
import { useStore } from "@/lib/store";
import { dailyIntake, dayOf, goals, maintenanceSteps, nutrition, weekly } from "@/lib/nutrition";
import InfoTip from "@/components/InfoTip";
import { help } from "@/lib/help";

const DAYS = 30;
const fmt = (v: number) => Math.round(v).toLocaleString("en-MY");
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v))}`;

export default function EatProgress() {
  const { s, me, addWeight } = useStore();
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const n = nutrition(me, s.food, s.weights);
  const q = typeof window !== "undefined" ? location.search : "";
  const delta = n.kcal - n.prev;
  const first = n.trend.find((w) => w.day >= Date.now() - DAYS * 864e5);
  const change = first ? n.current - first.trend : 0;

  async function log() {
    const v = parseFloat(kg);
    if (!(v >= 30 && v <= 250)) return;
    setKg(""); // on the chart at once; if the save fails the number comes back so you can retry
    setBusy(true);
    try { await addWeight(v); } catch { setKg(String(v)); } finally { setBusy(false); }
  }

  return (
    <div>
      <section className="card">
        <h2 className="eyebrow flex items-center gap-1.5">Maintenance calories<InfoTip text={help.maintenance(n.adaptive)} /></h2>
        <div className="mt-2 flex items-center gap-3">
          <Icon name="flame" size={44} />
          <p className="text-4xl font-bold tabular-nums leading-none">{fmt(n.kcal)}<span className="muted ml-1 text-sm font-medium">kcal/day</span></p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          {n.adaptive
            ? <span className="flex items-center gap-1 rounded-sm bg-lime-100 px-2 py-1 text-lime-700 dark:bg-lime-400/10 dark:text-lime-400"><CircleCheck size={13} />{n.days >= 21 ? "Good estimate" : "Getting there"}</span>
            : <span className="flex items-center gap-1 rounded-sm bg-zinc-100 px-2 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"><Info size={13} />Formula estimate</span>}
          {delta !== 0 && <span className="flex items-center gap-1 rounded-sm bg-zinc-100 px-2 py-1 tabular-nums dark:bg-zinc-800">{delta < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}{signed(delta)} this week</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-200 text-xs dark:divide-zinc-800">
          <div className="pr-3"><p className="muted">Last week</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{fmt(n.prev)}</p></div>
          <div className="px-3"><p className="muted">Days logged</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{n.days} / 28</p></div>
          <div className="pl-3"><p className="muted">Based on</p><p className="mt-0.5 text-sm font-semibold">{n.adaptive ? "Your logs" : "Formula"}</p></div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow flex items-center gap-1.5">Today’s targets<InfoTip text={help.targets} /></h2>
          <Link href={`/eat/plan${q}`} className="flex items-center gap-0.5 text-xs font-semibold text-lime-600 dark:text-lime-400">{goals[n.goal].label}<ChevronRight size={14} /></Link>
        </div>
        <p className="mt-2 flex items-center gap-2"><Icon name="kcal" size={22} /><span className="muted">Calories</span><span className="font-bold tabular-nums">{fmt(n.targets.kcal)}</span><span className="muted text-sm">kcal</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-sm font-bold tabular-nums">
          {([["P", n.targets.p, "text-sky-600 dark:text-sky-400 bg-sky-500/10"], ["C", n.targets.c, "text-amber-600 dark:text-amber-400 bg-amber-500/10"], ["F", n.targets.f, "text-pink-600 dark:text-pink-400 bg-pink-500/10"]] as const).map(([k, v, c]) => (
            <span key={k} className={`rounded-sm px-2 py-1 ${c}`}>{k} {v}<span className="text-xs font-medium">g</span></span>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="eyebrow flex items-center gap-1.5">Weight trend ({DAYS} days)<InfoTip text={help.trend} /></h2>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-2xl font-bold tabular-nums">{n.current.toFixed(1)}<span className="muted ml-1 text-sm font-medium">kg</span></p>
          {first && <span className={`rounded-sm px-2 py-1 text-xs font-semibold tabular-nums ${change < 0 ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-lime-500/10 text-lime-700 dark:text-lime-400"}`}>{change > 0 ? "+" : ""}{change.toFixed(1)} kg</span>}
        </div>
        <div className="muted mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />Daily</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-sm bg-violet-500" />Trend (7-day average)</span>
        </div>
        <TrendChart days={DAYS} label="Weight trend" series={[
          { pts: n.trend.map((w) => ({ day: w.day, v: w.trend })), color: "#8b5cf6", area: true },
          { pts: n.trend.map((w) => ({ day: w.day, v: w.kg })), color: "#a1a1aa", line: false, dots: true },
        ]} />
        <form onSubmit={(e) => { e.preventDefault(); log(); }} className="mt-3 flex gap-2">
          <label className="relative flex-1">
            <Icon name="scale" size={18} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" placeholder="Today’s weight" aria-label="Today's weight in kg"
              className="w-full rounded-xl bg-white py-2.5 pl-9 pr-10 text-base tabular-nums outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
            <span className="muted absolute right-3 top-1/2 -translate-y-1/2 text-sm">kg</span>
          </label>
          <button disabled={busy || !kg} className="btn px-4 py-2 text-sm disabled:opacity-50">Log</button>
        </form>
        <p className="muted mt-1.5 text-xs">Weigh in each morning, after the toilet and before eating or drinking.</p>
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Icon name="target" size={18} />Goal status</h3>
            <Link href={`/eat/plan${q}`} className="text-xs font-semibold text-lime-600 dark:text-lime-400">{n.goalBw ? "Edit" : "Set a goal weight"}</Link>
          </div>
          {n.goalBw !== null && (
            <>
              <div className="mt-2 grid grid-cols-3 text-xs">
                <div><p className="muted">Trend weight</p><p className="text-sm font-semibold tabular-nums">{n.current.toFixed(1)} kg</p></div>
                <div><p className="muted">Goal</p><p className="text-sm font-semibold tabular-nums">{n.goalBw} kg</p></div>
                <div className="text-right"><p className="muted">Remaining</p><p className="text-sm font-semibold tabular-nums">{Math.abs(n.goalBw - n.current).toFixed(1)} kg</p></div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"><div className="anim-grow h-full rounded-sm bg-lime-500" style={{ width: `${(n.progress ?? 0) * 100}%` }} /></div>
                <span className="text-xs font-bold tabular-nums text-lime-600 dark:text-lime-400">{Math.round((n.progress ?? 0) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="eyebrow flex items-center gap-1.5">Calorie intake vs maintenance<InfoTip text={help.intake} /></h2>
        <div className="muted mt-2 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-sm bg-lime-500" />Calorie intake</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-sm bg-orange-500" />Maintenance</span>
        </div>
        <TrendChart days={DAYS} label="Calorie intake against maintenance" series={[
          { pts: maintenanceSteps(me, s.food, s.weights, DAYS).map((m) => ({ day: m.day, v: m.kcal })), color: "#f97316", step: true, dashed: true },
          // today is still being eaten, so the line stops at yesterday
          { pts: dailyIntake(s.food).filter((d) => d.day < dayOf(Date.now())).map((d) => ({ day: d.day, v: d.kcal })), color: "#84cc16", dots: true },
        ]} />
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Icon name="plate" size={30} />
            <div><p className="muted text-xs">Avg intake (7 days)</p><p className="font-bold tabular-nums">{n.weekAvg === null ? "–" : fmt(n.weekAvg)} <span className="muted text-xs font-medium">kcal</span></p></div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="scale" size={30} />
            <div><p className="muted flex items-center gap-1 text-xs">Energy balance<InfoTip text={help.balance} size={13} /></p><p className={`font-bold tabular-nums ${n.balance === null ? "" : n.balance < 0 ? "text-sky-600 dark:text-sky-400" : "text-lime-600 dark:text-lime-400"}`}>{n.balance === null ? "–" : signed(n.balance)} <span className="muted text-xs font-medium">kcal</span></p></div>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Icon name="target" size={18} />Weekly check<InfoTip text={help.weekly} size={13} /></h3>
          <p className="mt-1 text-sm font-semibold tabular-nums">{weekly(n).rate}</p>
          <p className="muted text-sm tabular-nums">{weekly(n).adjust}</p>
        </div>
      </section>
    </div>
  );
}
