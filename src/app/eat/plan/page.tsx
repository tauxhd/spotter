"use client";
// Set your nutrition plan: goal, body details and activity -> maintenance and daily targets (live preview).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Icon from "@/components/Icon";
import { useStore } from "@/lib/store";
import { activities, bodyOf, goals, nutrition, type Goal } from "@/lib/nutrition";
import MeButton from "@/components/MeButton";
import InfoTip from "@/components/InfoTip";
import { help } from "@/lib/help";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function Plan() {
  const router = useRouter();
  const { s, me, updateProfile } = useStore();
  const b = bodyOf(me);
  const [goal, setGoal] = useState<Goal>(b.goal);
  const [height, setHeight] = useState(String(b.height));
  const [age, setAge] = useState(String(b.age));
  const [activity, setActivity] = useState(b.activity);
  const [goalBw, setGoalBw] = useState(me.goal_bw ? String(me.goal_bw) : "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const h = num(height), a = num(age), g = num(goalBw);
  const valid = h !== null && h >= 120 && h <= 230 && a !== null && a >= 13 && a <= 90 && (g === null || (g >= 30 && g <= 250));
  const draft = { ...me, goal, height: valid ? h : b.height, age: valid ? a : b.age, activity, goal_bw: g };
  const n = nutrition(draft, s.food, s.weights);

  async function save() {
    setBusy(true); setErr(null);
    try { await updateProfile({ goal, height: h, age: a, activity, goal_bw: g }); router.back(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save"); setBusy(false); }
  }

  const field = "w-full rounded-xl bg-white px-3 py-2.5 text-base tabular-nums outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800";
  const option = (on: boolean) => `flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${on ? "bg-lime-500/10" : "active:bg-zinc-100 dark:active:bg-zinc-900"}`;
  const radio = (on: boolean) => <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2 ${on ? "bg-lime-500 text-zinc-950 ring-lime-500" : "ring-zinc-300 dark:ring-zinc-700"}`}>{on && <Check size={13} strokeWidth={3} />}</span>;

  return (
    <div className="pb-6">
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="text-center text-base font-semibold">Nutrition plan</h1>
        <MeButton size={32} className="justify-self-end" />
      </header>

      <h2 className="mt-2 text-2xl font-bold tracking-tight">Set your nutrition plan</h2>
      <p className="muted mt-1 text-sm">Pick a goal and check your details. Your targets update as you go.</p>

      <h3 className="mt-6 flex items-center gap-1.5 font-semibold">Goal<InfoTip text={help.goal} /></h3>
      <div className="mt-2 divide-y divide-zinc-200 overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:divide-zinc-800 dark:ring-zinc-800">
        {(Object.keys(goals) as Goal[]).map((k) => (
          <button key={k} onClick={() => setGoal(k)} aria-pressed={goal === k} className={option(goal === k)}>
            <span className="flex-1"><span className="block text-sm font-semibold">{goals[k].label}</span><span className="muted block text-xs">{goals[k].hint}</span></span>
            {radio(goal === k)}
          </button>
        ))}
      </div>

      <h3 className="mt-6 flex items-center gap-1.5 font-semibold">Body<InfoTip text={help.body(me.bw)} /></h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-xs"><span className="muted">Height (cm)</span><input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" className={`${field} mt-1`} /></label>
        <label className="text-xs"><span className="muted">Age</span><input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" className={`${field} mt-1`} /></label>
        <label className="text-xs"><span className="muted">Goal weight (kg)</span><input value={goalBw} onChange={(e) => setGoalBw(e.target.value)} inputMode="decimal" placeholder="Optional" className={`${field} mt-1`} /></label>
      </div>

      <h3 className="mt-6 font-semibold">Activity</h3>
      <div className="mt-2 divide-y divide-zinc-200 overflow-hidden rounded-xl ring-1 ring-zinc-200 dark:divide-zinc-800 dark:ring-zinc-800">
        {activities.map((x) => (
          <button key={x.v} onClick={() => setActivity(x.v)} aria-pressed={activity === x.v} className={option(activity === x.v)}>
            <span className="flex-1"><span className="block text-sm font-semibold">{x.label}</span><span className="muted block text-xs">{x.hint}</span></span>
            {radio(activity === x.v)}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
        <p className="eyebrow muted">Your plan</p>
        <div className="mt-2 flex items-center gap-2">
          <Icon name="flame" size={28} />
          <p className="text-sm"><span className="font-bold tabular-nums">{n.kcal.toLocaleString("en-MY")}</span> <span className="muted">kcal maintenance{n.adaptive ? " (from your logs)" : ""}</span></p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Icon name="target" size={28} />
          <p className="text-sm"><span className="font-bold tabular-nums">{n.targets.kcal.toLocaleString("en-MY")}</span> <span className="muted">kcal a day ·</span> <span className="font-semibold tabular-nums">P {n.targets.p}g · C {n.targets.c}g · F {n.targets.f}g</span></p>
        </div>
      </section>

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
      <button onClick={save} disabled={!valid || busy} className="btn mt-4 w-full disabled:opacity-50">{busy ? "Saving…" : "Save plan"}</button>
    </div>
  );
}
