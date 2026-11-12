"use client";
import { useState } from "react";
import Image from "next/image";
import { LogIn } from "lucide-react";
import Icon, { type IconName } from "./Icon";
import { apuStudent, isTp, type ApuStudent } from "@/lib/apu";
import type { Sex } from "@/lib/data";
import type { Unit } from "@/lib/units";
import WeightInput from "./WeightInput";
import { activities, goals, nutrition, type Goal } from "@/lib/nutrition";

type P = { name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; tp?: string | null; course?: string | null; bio?: string | null; unit?: Unit;
  goal?: string | null; activity?: number | null; height?: number | null; age?: number | null; goal_bw?: number | null };
const field = "mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800";

// Sign in with your TP number: name, course, faculty, intake and category come from APU records.
function Login({ onFound }: { onFound: (s: ApuStudent) => void }) {
  const [tp, setTp] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = apuStudent(tp);
    if (!s) return setErr("TP number looks like TP012345");
    onFound(s);
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="muted text-xs font-semibold">TP number</span>
        <input required autoFocus value={tp} onChange={(e) => { setTp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setErr(""); }}
          placeholder="TP012345" autoComplete="username" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          className={`${field} uppercase tabular-nums placeholder:normal-case`} />
      </label>
      <label className="block">
        <span className="muted text-xs font-semibold">APU password</span>
        <input required type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className={field} />
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={!isTp(tp) || !pw} className="btn flex w-full items-center justify-center gap-2"><LogIn size={18} />Sign in with APU</button>
      <p className="muted text-center text-xs">Demo build: any TP number and password works. Your details are pulled from APU records.</p>
    </form>
  );
}

// The read-only part of a profile that comes from APU.
function Records({ p }: { p: P }) {
  const rows: [IconName, string, string | null | undefined][] = [
    ["grad-cap", "Course", p.course], ["building", "Faculty", p.faculty], ["intake", "Intake", p.intake], ["category", "Category", p.sex === "F" ? "Women" : "Men"],
  ];
  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 pb-4 dark:border-zinc-800/80">
      <div className="flex items-center gap-4 py-2">
        <Icon name="id-card" size={52} />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight">{p.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm">
            {p.tp && <span className="font-mono font-semibold tracking-wider">{p.tp}</span>}
            <Icon name="shield" size={14} /><span className="font-medium text-lime-600 dark:text-lime-400">APU verified</span>
          </p>
        </div>
      </div>
      <ul className="mt-2">
        {rows.filter(([, , v]) => v).map(([icon, k, v]) => (
          <li key={k} className="group flex items-center gap-4 py-2.5">
            <Icon name={icon} size={30} />
            <div className="min-w-0 flex-1 group-last:border-0 border-b border-zinc-100 pb-2.5 -mb-2.5 dark:border-zinc-800/60">
              <p className="muted text-xs">{k}</p>
              <p className="font-medium leading-snug">{v}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// First launch: sign in, then bodyweight and (optional) lifts. Edit profile: bio, bodyweight, lifts.
export default function Onboarding({ initial, onSave }: { initial?: P; onSave: (p: P) => Promise<void> }) {
  const [p, setP] = useState<P | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");

  if (!p) return (
    <div className="space-y-5 pt-6">
      <header>
        <Image src="/welcome.webp" alt="Students training, sipping a shake and scanning in at the gym door" width={1200} height={800} priority
          className="-mx-4 mb-5 w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:w-full sm:rounded-2xl" />
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
          <Image src="/icon-192.png" alt="" width={24} height={24} className="rounded-md" />Spotter
        </p>
        <h1 className="h-title mt-1">Welcome to the APU gym</h1>
        <p className="muted text-sm">Sign in with your student account.</p>
      </header>
      <Login onFound={(s) => setP({ ...s, bw: 70, squat: 0, bench: 0, deadlift: 0 })} />
    </div>
  );

  const unit = p.unit ?? "kg";
  // new users must set a nutrition plan: it drives their calorie and macro targets in Eat
  const h = Number(height), a = Number(age), g = p.goal_bw ?? 0;
  const planOk = !!p.goal && !!p.activity && h >= 120 && h <= 230 && Number.isInteger(a) && a >= 13 && a <= 90 && g >= 30 && g <= 250;
  const preview = planOk && p.bw >= 30 ? nutrition({ ...p, height: h, age: a }, [], []).targets : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = (n: number) => Math.round(n * 100) / 100;
    const plan = initial ? {} : { height: Number(height), age: Number(age), goal_bw: r(p!.goal_bw ?? 0) };
    try { await onSave({ ...p!, ...plan, bw: r(p!.bw), squat: r(p!.squat), bench: r(p!.bench), deadlift: r(p!.deadlift), bio: p!.bio?.trim() || null }); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className={`space-y-5 ${initial ? "" : "pt-6"}`}>
      {!initial && (
        <header>
          <h1 className="h-title">Hi, {p.name.split(" ")[0]} 👋</h1>
          <p className="muted text-sm">We found you. Add your bodyweight and nutrition plan and you&apos;re in.</p>
        </header>
      )}
      <Records p={p} />

      {initial && <section className="card">
        {(
          <label className="block">
            <span className="flex items-center gap-2 font-semibold"><Icon name="edit" size={20} />Bio</span>
            <span className="mt-2 block">
              <textarea rows={3} maxLength={150} value={p.bio ?? ""} onChange={(e) => setP({ ...p, bio: e.target.value })}
                placeholder="Goals, split, PRs you're chasing…" aria-describedby="bio-count"
                className="block min-h-[5.5rem] w-full resize-none rounded-xl bg-zinc-100 px-3 py-2.5 text-base leading-relaxed outline-none ring-1 ring-zinc-200 transition-shadow [field-sizing:content] placeholder:text-zinc-500 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
              <span className="mt-2 flex items-center gap-2">
                <span className="h-0.5 flex-1 overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-800">
                  <span className={`block h-full rounded-sm transition-[width] ${(p.bio ?? "").length > 135 ? "bg-amber-500" : "bg-lime-500"}`} style={{ width: `${((p.bio ?? "").length / 150) * 100}%` }} />
                </span>
                <span id="bio-count" className="muted text-xs tabular-nums">{150 - (p.bio ?? "").length}</span>
              </span>
            </span>
          </label>
        )}
      </section>}

      <section className="card">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Body &amp; bests <span className="muted text-sm font-normal">({unit})</span></p>
          <div role="radiogroup" aria-label="Preferred weight unit" className="flex rounded-sm bg-zinc-100 p-0.5 text-sm font-semibold dark:bg-zinc-900">
            {(["kg", "lb"] as const).map((x) => (
              <button type="button" key={x} role="radio" aria-checked={unit === x} onClick={() => setP({ ...p, unit: x })}
                className={`rounded-sm px-3 py-1 ${unit === x ? "bg-lime-500 text-zinc-950" : "muted"}`}>{x}</button>
            ))}
          </div>
        </div>
        <p className="muted text-xs">Bodyweight is needed for DOTS. Lifts are optional, they put you on the leaderboard and update as you log sets. Everyone sees weights in their own unit.</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {([["bw", "Body", "scale"], ["squat", "Squat", "squat"], ["bench", "Bench", "bench"], ["deadlift", "Deadlift", "deadlift"]] as const).map(([k, label, icon]) => (
            <label key={k} className="flex flex-col items-center gap-1.5">
              <Icon name={icon} size={36} />
              <span className="muted text-xs">{label}</span>
              <WeightInput key={k + unit} required={k === "bw"} kg={p[k]} unit={unit} onKg={(v) => setP((x) => x && { ...x, [k]: v })} placeholder="0" aria-label={`${label} ${unit}`}
                className={`num w-full ${k === "bw" ? "ring-1 ring-lime-500/50" : ""}`} />
            </label>
          ))}
        </div>
      </section>

      {!initial && (
        <section className="card">
          <p className="flex items-center gap-2 font-semibold"><Icon name="target" size={22} />Nutrition plan</p>
          <p className="muted text-xs">Sets your daily calorie and macro targets in Eat. You can change it any time.</p>
          <p className="muted mt-4 text-xs font-semibold">Goal</p>
          <div role="radiogroup" aria-label="Goal" className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(goals) as Goal[]).map((k) => (
              <button type="button" key={k} role="radio" aria-checked={p.goal === k} onClick={() => setP({ ...p, goal: k })}
                className={`rounded-sm px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${p.goal === k ? "bg-lime-500 text-zinc-950" : "bg-zinc-100 dark:bg-zinc-900"}`}>{goals[k].label}</button>
            ))}
          </div>
          {p.goal && <p className="muted mt-1.5 text-xs">{goals[p.goal as Goal].hint}</p>}
          <p className="muted mt-4 text-xs font-semibold">Activity</p>
          <div role="radiogroup" aria-label="Activity" className="mt-1.5 grid grid-cols-3 gap-1.5">
            {activities.map((x) => (
              <button type="button" key={x.v} role="radio" aria-checked={p.activity === x.v} onClick={() => setP({ ...p, activity: x.v })}
                className={`rounded-sm px-2 py-1.5 text-left transition active:scale-95 ${p.activity === x.v ? "bg-lime-500 text-zinc-950" : "bg-zinc-100 dark:bg-zinc-900"}`}>
                <span className="block text-sm font-semibold">{x.label}</span>
                <span className={`block text-[11px] leading-tight ${p.activity === x.v ? "text-zinc-800" : "muted"}`}>{x.hint}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <label className="text-xs"><span className="muted font-semibold">Height (cm)</span>
              <input required value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} inputMode="numeric" placeholder="172" className={`${field} tabular-nums`} /></label>
            <label className="text-xs"><span className="muted font-semibold">Age</span>
              <input required value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} inputMode="numeric" placeholder="21" className={`${field} tabular-nums`} /></label>
            <label className="text-xs"><span className="muted font-semibold">Goal weight ({unit})</span>
              <WeightInput key={"goal" + unit} required kg={p.goal_bw ?? 0} unit={unit} onKg={(v) => setP((x) => x && { ...x, goal_bw: v })} placeholder="0" aria-label={`Goal weight ${unit}`} className="num mt-1 w-full" /></label>
          </div>
          {preview && <p className="mt-3 text-sm"><span className="font-bold tabular-nums">{preview.kcal.toLocaleString("en-MY")}</span> <span className="muted">kcal a day ·</span> <span className="font-semibold tabular-nums">P {preview.p}g · C {preview.c}g · F {preview.f}g</span></p>}
        </section>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy || p.bw < 30 || p.bw > 250 || (!initial && !planOk)} className="btn w-full">{busy ? "Saving…" : initial ? "Save" : "Let's go"}</button>
    </form>
  );
}
