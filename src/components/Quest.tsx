"use client";
// First launch as a little game: Spot the mascot talks you through sign-in, your student card, body, lifts and a
// nutrition plan, one step at a time, with an XP bar that fills as you go and a level-up at the end.
// The phone app's twin is mobile/src/components/quest.tsx; the script (steps, lines, XP) is shared in lib/quest.ts.
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, Sparkles, UserPlus } from "lucide-react";
import Icon, { type IconName } from "./Icon";
import WeightInput from "./WeightInput";
import { authMsg, courses, isTp, newStudent, tpEmail } from "@/lib/apu";
import { sb } from "@/lib/store";
import { activities, goals, nutrition, type Goal } from "@/lib/nutrition";
import { activityReply, bwReply, goalReply, questArt, steps, totalXp } from "@/lib/quest";
import { toUnit, type Unit } from "@/lib/units";
import type { Sex } from "@/lib/data";

export type P = {
  name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; tp?: string | null;
  course?: string | null; bio?: string | null; unit?: Unit; goal?: string | null; activity?: number | null; height?: number | null; age?: number | null; goal_bw?: number | null;
};

const field = "mt-1 w-full rounded-xl bg-zinc-100 px-3 py-3 text-base outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800";
const buzz = () => { try { navigator.vibrate?.(10); } catch {} };
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Spot's speech bubble: types the line out (tap to finish it); the full line holds the space so nothing jumps.
function Say({ text }: { text: string }) {
  const [n, setN] = useState(() => (reduced() ? text.length : 0));
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => setN((x) => x + 1), text[n - 1] === "." || text[n - 1] === "!" ? 220 : 22);
    return () => clearTimeout(t);
  }, [n, text]);
  return (
    <button type="button" onClick={() => setN(text.length)} aria-live="polite" aria-label={text}
      className="anim-bubble relative flex-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-left text-[15px] font-medium leading-snug text-zinc-900 shadow-lg shadow-black/20 dark:bg-zinc-800 dark:text-zinc-100">
      <span aria-hidden>{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden className="ml-px inline-block h-4 w-0.5 translate-y-0.5 bg-lime-500 [animation:caret_0.8s_steps(1)_infinite]" />}
      <span aria-hidden className="invisible">{text.slice(n)}</span>
    </button>
  );
}

// Numbers count up to their value (the reveal at the end).
function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [v, setV] = useState(() => (reduced() ? to : 0));
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{v.toLocaleString("en-MY")}</>;
}

const confettiColors = ["#84cc16", "#a3e635", "#facc15", "#38bdf8", "#f472b6", "#fb923c"];
function Confetti() {
  return (
    <div aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className="confetti" style={{
          left: `${(i * 37) % 100}%`, background: confettiColors[i % confettiColors.length], animationDelay: `${(i % 9) * 70}ms`,
          "--drift": `${((i * 53) % 120) - 60}px`, "--spin": `${360 + ((i * 97) % 540)}deg`, width: i % 3 ? 8 : 6, height: i % 2 ? 12 : 8,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}

function Choice({ on, art, title, hint, onClick, i }: { on: boolean; art: string; title: string; hint: string; onClick: () => void; i: number }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} style={{ animationDelay: `${120 + i * 60}ms` }}
      className={`anim-quest-in flex w-full items-center gap-3 rounded-2xl p-2.5 pr-4 text-left ring-2 transition active:scale-[0.97] ${on ? "bg-lime-500/15 ring-lime-500" : "bg-zinc-100 ring-transparent dark:bg-zinc-900"}`}>
      <Image src={questArt(art)} alt="" width={56} height={56} className={`shrink-0 ${on ? "anim-pop" : ""}`} />
      <span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="muted block text-xs">{hint}</span></span>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2 ${on ? "bg-lime-500 ring-lime-500" : "ring-zinc-300 dark:ring-zinc-700"}`}>{on && <span className="h-2 w-2 rounded-full bg-zinc-950" />}</span>
    </button>
  );
}

export default function Quest({ onSave }: { onSave: (p: P) => Promise<void> }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [p, setP] = useState<P | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [wiggle, setWiggle] = useState(0);
  const [tp, setTp] = useState("");
  const [pw, setPw] = useState("");
  const [signin, setSignin] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [intake, setIntake] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const step = steps[i];
  const first = p?.name.split(" ")[0] ?? "";
  const xp = steps.slice(0, i).reduce((s, x) => s + x.xp, 0);
  const done = step.id === "done";
  const unit = p?.unit ?? "kg";
  const go = (n: number) => { buzz(); setDir(n > i ? 1 : -1); setReply(null); setErr(""); if (steps[n]?.id === "done") new Audio("/sounds/record.mp3").play().catch(() => {});
    setI(n); window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); };
  const next = () => go(i + 1);
  const pose = reply ? (step.id === "goal" || step.id === "activity" ? "jump" : step.pose) : step.pose;

  const h = Number(height), a = Number(age), g = p?.goal_bw ?? 0;
  const statsOk = h >= 120 && h <= 230 && Number.isInteger(a) && a >= 13 && a <= 90 && g >= 30 && g <= 250;
  const plan = p && p.goal && p.activity && statsOk ? nutrition({ ...p, height: h, age: a }, [], []).targets : null;

  // sign-up: the anonymous session becomes a real account (TP email + password), same user id, so nothing moves
  async function login(e: React.FormEvent) {
    e.preventDefault();
    const s = newStudent({ tp, name, course, intake, sex });
    if (typeof s === "string") return setErr(s);
    if (pw.length < 6) return setErr("Password needs at least 6 characters");
    setBusy(true);
    const { error } = await sb.auth.updateUser({ email: tpEmail(s.tp), password: pw });
    setBusy(false);
    if (error) return setErr(authMsg(error));
    setP({ ...s, bw: 70, squat: 0, bench: 0, deadlift: 0 });
    next();
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: tpEmail(tp), password: pw });
    if (error) { setBusy(false); return setErr(authMsg(error)); }
    location.reload(); // the store loads the signed-in account
  }
  async function finish() {
    setBusy(true); setErr("");
    const r = (n: number) => Math.round(n * 100) / 100;
    try { await onSave({ ...p!, bw: r(p!.bw), squat: r(p!.squat), bench: r(p!.bench), deadlift: r(p!.deadlift), height: h, age: a, goal_bw: r(g) }); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  const nudgeBw = (d: number) => { buzz(); setP((x) => x && { ...x, bw: Math.min(250, Math.max(30, Math.round((x.bw + d) * 10) / 10)) }); };

  // the button at the bottom of each step
  const cta: Record<string, { label: string; ok: boolean; run: () => void } | null> = {
    hello: { label: "Start the quest", ok: true, run: next },
    login: null, // the form has its own button
    found: { label: "That’s me!", ok: true, run: next },
    body: { label: "Next", ok: !!p && p.bw >= 30 && p.bw <= 250, run: next },
    lifts: { label: p && (p.squat || p.bench || p.deadlift) ? "Next" : "Skip for now", ok: true, run: next },
    goal: { label: "Lock it in", ok: !!p?.goal, run: next },
    activity: { label: "Next", ok: !!p?.activity, run: next },
    stats: { label: "Finish quest", ok: statsOk, run: next },
    done: { label: busy ? "Saving…" : "Start training", ok: !busy, run: finish },
  };
  const action = signin ? null : cta[step.id];

  return (
    <div className="flex min-h-dvh flex-col pb-4 pt-3">
      {/* XP bar */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => go(i - 1)} aria-label="Back" disabled={i === 0 || done}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 transition dark:bg-zinc-900 ${i === 0 || done ? "invisible" : ""}`}><ArrowLeft size={18} /></button>
        <div className="relative flex-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <span className={done ? "text-lime-600 dark:text-lime-400" : "muted"}>{done ? "Level 2 · Gym rat" : "Level 1 · Rookie"}</span>
            <span className="muted tabular-nums">{xp} / {totalXp} XP</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div className="anim-shine h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300 transition-[width] duration-700 ease-[var(--spring)]" style={{ width: `${Math.max(4, (xp / totalXp) * 100)}%` }} />
          </div>
          {dir > 0 && i > 0 && steps[i - 1].xp > 0 && (
            <span key={i} className="anim-xp absolute right-0 top-6 rounded-full bg-lime-500 px-2 py-0.5 text-xs font-black text-zinc-950 shadow-lg shadow-lime-500/40">+{steps[i - 1].xp} XP</span>
          )}
        </div>
      </div>

      {/* Spot + what he's saying */}
      <div className="mt-5 flex items-end gap-2">
        <button type="button" aria-label="Spot, your gym buddy" onClick={() => { buzz(); setWiggle((w) => w + 1); }} className="shrink-0">
          <span key={`${pose}-${wiggle}`} className={`block ${wiggle ? "anim-wiggle" : "anim-spot"}`}>
            <Image src={questArt(`spot-${pose}`)} alt="" width={104} height={104} priority className="anim-bob drop-shadow-[0_8px_12px_rgb(132_204_22/0.25)]" />
          </span>
        </button>
        <div className="mb-6 flex flex-1"><Say key={`${i}-${reply ?? ""}`} text={reply ?? (signin ? "Welcome back! Sign in with your TP number." : step.say(first))} /></div>
      </div>

      {/* the step */}
      <div key={i} className="anim-quest-in mt-4 flex-1" style={{ "--dir": dir } as React.CSSProperties}>
        {signin && (
          <form onSubmit={signIn} className="space-y-3">
            <label className="block"><span className="muted text-xs font-semibold">TP number</span>
              <input required autoFocus value={tp} onChange={(e) => { setTp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setErr(""); }}
                placeholder="TP012345" autoComplete="username" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className={`${field} uppercase tabular-nums placeholder:normal-case`} /></label>
            <label className="block"><span className="muted text-xs font-semibold">Password</span>
              <input required type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} autoComplete="current-password" className={field} /></label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={!isTp(tp) || !pw || busy} className="btn flex w-full items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
            <button type="button" onClick={() => { setSignin(false); setErr(""); }} className="muted w-full text-center text-sm">New here? Create an account</button>
          </form>
        )}
        {step.id === "hello" && !signin && (
          <div>
            <Image src="/welcome.webp" alt="Students training, sipping a shake and scanning in at the gym door" width={1200} height={800} priority className="w-full rounded-2xl" />
            <div className="stagger mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              {([["train", "Log lifts"], ["ranks", "Climb ranks"], ["eat", "Eat smart"]] as [IconName, string][]).map(([ic, t]) => (
                <div key={t} className="rounded-2xl bg-zinc-100 px-2 py-3 dark:bg-zinc-900"><Icon name={ic} size={40} className="mx-auto" /><p className="mt-1">{t}</p></div>
              ))}
            </div>
          </div>
        )}

        {step.id === "login" && (
          <form onSubmit={login} className="space-y-3">
            <label className="block"><span className="muted text-xs font-semibold">Full name</span>
              <input required autoFocus value={name} onChange={(e) => { setName(e.target.value.slice(0, 40)); setErr(""); }} placeholder="Aiden Lim" autoComplete="name" className={field} /></label>
            <label className="block"><span className="muted text-xs font-semibold">TP number</span>
              <input required value={tp} onChange={(e) => { setTp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)); setErr(""); }}
                placeholder="TP012345" autoComplete="username" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className={`${field} uppercase tabular-nums placeholder:normal-case`} /></label>
            <label className="block"><span className="muted text-xs font-semibold">Password <span className="font-normal">(6+ characters, to sign in later)</span></span>
              <input required type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} autoComplete="new-password" className={field} /></label>
            <label className="block"><span className="muted text-xs font-semibold">Course</span>
              <select required value={course} onChange={(e) => { setCourse(e.target.value); setErr(""); }} className={field}>
                <option value="" disabled>Pick your course</option>
                {courses.map((c) => <option key={c.course} value={c.course}>{c.course}</option>)}
              </select></label>
            <label className="block"><span className="muted text-xs font-semibold">Intake code <span className="font-normal">(optional, for your timetable)</span></span>
              <input value={intake} onChange={(e) => { setIntake(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16)); setErr(""); }} placeholder="APD2F2602CS" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className={`${field} uppercase placeholder:normal-case`} /></label>
            <div><span className="muted text-xs font-semibold">Category</span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {([["M", "Men"], ["F", "Women"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => { setSex(v); setErr(""); }} className={`rounded-xl py-3 font-semibold ring-1 transition ${sex === v ? "bg-lime-500 text-zinc-950 ring-lime-500" : "bg-zinc-100 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"}`}>{l}</button>
                ))}
              </div></div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={!name.trim() || !isTp(tp) || pw.length < 6 || !course || !sex || busy} className="btn flex w-full items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50"><UserPlus size={18} />Create my account</button>
          </form>
        )}

        {step.id === "found" && p && (
          <div className="anim-flip anim-shine rounded-3xl bg-gradient-to-br from-lime-400 via-lime-500 to-emerald-600 p-[2px] shadow-2xl shadow-lime-500/20">
            <div className="rounded-[22px] bg-zinc-950 p-4 text-white">
              <div className="flex items-center gap-3">
                <Icon name="id-card" size={56} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-black leading-tight">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm"><span className="font-mono font-semibold tracking-wider text-zinc-300">{p.tp}</span><Icon name="shield" size={14} /><span className="font-semibold text-lime-400">Member</span></p>
                </div>
                <span className="rounded-full bg-lime-500 px-2.5 py-1 text-[11px] font-black uppercase text-zinc-950">Lv 1</span>
              </div>
              <div className="stagger mt-4 grid grid-cols-2 gap-2">
                {([["grad-cap", "Course", p.course], ["building", "Faculty", p.faculty], ["intake", "Intake", p.intake], ["category", "Category", p.sex === "F" ? "Women" : "Men"]] as [IconName, string, string | null | undefined][]).filter(([, , v]) => v).map(([ic, k, v]) => (
                  <div key={k} className={`rounded-xl bg-white/5 p-2.5 ${k === "Course" ? "col-span-2" : ""}`}>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400"><Icon name={ic} size={18} />{k}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step.id === "body" && p && (
          <div className="text-center">
            <div role="radiogroup" aria-label="Weight unit" className="mx-auto flex w-fit rounded-full bg-zinc-100 p-1 text-sm font-bold dark:bg-zinc-900">
              {(["kg", "lb"] as const).map((x) => (
                <button type="button" key={x} role="radio" aria-checked={unit === x} onClick={() => setP({ ...p, unit: x })}
                  className={`rounded-full px-4 py-1 transition ${unit === x ? "bg-lime-500 text-zinc-950" : "muted"}`}>{x}</button>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-5">
              <button type="button" onClick={() => nudgeBw(-0.5)} aria-label="Less" className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 active:scale-90 dark:bg-zinc-900"><Minus size={20} /></button>
              <p key={Math.round(p.bw)} className="anim-pop min-w-36 text-6xl font-black tabular-nums tracking-tight">{Math.round(toUnit(p.bw, unit) * 10) / 10}<span className="muted ml-1 text-lg font-bold">{unit}</span></p>
              <button type="button" onClick={() => nudgeBw(0.5)} aria-label="More" className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 active:scale-90 dark:bg-zinc-900"><Plus size={20} /></button>
            </div>
            <input type="range" min={30} max={160} step={0.5} value={p.bw} onChange={(e) => setP({ ...p, bw: Number(e.target.value) })} aria-label="Bodyweight"
              className="mt-6 w-full accent-lime-500" />
            <p className="muted mt-2 flex items-center justify-center gap-1.5 text-sm"><Icon name="scale" size={20} />{bwReply(p.bw)}</p>
          </div>
        )}

        {step.id === "lifts" && p && (
          <div className="grid grid-cols-3 gap-2">
            {([["squat", "Squat"], ["bench", "Bench"], ["deadlift", "Deadlift"]] as const).map(([k, label], n) => (
              <label key={k} style={{ animationDelay: `${120 + n * 70}ms` }} className="anim-quest-in flex flex-col items-center gap-1.5 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
                <Icon name={k} size={52} />
                <span className="text-sm font-bold">{label}</span>
                <WeightInput key={k + unit} kg={p[k]} unit={unit} onKg={(v) => setP((x) => x && { ...x, [k]: v })} placeholder="0" aria-label={`${label} best, ${unit}`} className="num w-full bg-white dark:bg-zinc-800" />
                <span className="muted text-[11px]">{unit} · 1 rep</span>
              </label>
            ))}
          </div>
        )}

        {step.id === "goal" && p && (
          <div role="radiogroup" aria-label="Goal" className="space-y-2">
            {(Object.keys(goals) as Goal[]).map((k, n) => (
              <Choice key={k} i={n} on={p.goal === k} art={k} title={goals[k].label} hint={goals[k].hint} onClick={() => { buzz(); setP({ ...p, goal: k }); setReply(goalReply[k]); }} />
            ))}
          </div>
        )}

        {step.id === "activity" && p && (
          <div role="radiogroup" aria-label="Activity" className="space-y-2">
            {activities.map((x, n) => (
              <Choice key={x.v} i={n} on={p.activity === x.v} art={x.label.toLowerCase()} title={x.label} hint={x.hint} onClick={() => { buzz(); setP({ ...p, activity: x.v }); setReply(activityReply(x.label)); }} />
            ))}
          </div>
        )}

        {step.id === "stats" && p && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs"><span className="muted font-semibold">Height (cm)</span>
                <input autoFocus value={height} onChange={(e) => setHeight(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))} inputMode="numeric" placeholder="172" className={`${field} text-center text-lg font-bold tabular-nums`} /></label>
              <label className="text-xs"><span className="muted font-semibold">Age</span>
                <input value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} inputMode="numeric" placeholder="21" className={`${field} text-center text-lg font-bold tabular-nums`} /></label>
              <label className="text-xs"><span className="muted font-semibold">Goal ({unit})</span>
                <WeightInput key={"goal" + unit} kg={g} unit={unit} onKg={(v) => setP((x) => x && { ...x, goal_bw: v })} placeholder="0" aria-label={`Goal weight ${unit}`} className={`${field} text-center text-lg font-bold tabular-nums`} /></label>
            </div>
            <div className={`mt-4 rounded-2xl bg-zinc-100 p-3 transition dark:bg-zinc-900 ${plan ? "" : "opacity-50"}`}>
              <p className="muted flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"><Sparkles size={13} />Your plan preview</p>
              <p className="mt-1 text-sm">{plan ? <><span className="font-black tabular-nums">{plan.kcal.toLocaleString("en-MY")}</span> kcal a day · <span className="font-semibold tabular-nums">P {plan.p}g · C {plan.c}g · F {plan.f}g</span></> : "Fill in all three to see it."}</p>
            </div>
          </div>
        )}

        {done && p && plan && (
          <div className="text-center">
            <Confetti />
            <Image src={questArt("chest")} alt="" width={120} height={120} className="anim-spot mx-auto" />
            <p className="muted mt-2 text-[11px] font-bold uppercase tracking-wider">Your daily plan · {goals[p.goal as Goal].label}</p>
            <p className="mt-1 text-6xl font-black tabular-nums tracking-tight text-lime-500"><CountUp to={plan.kcal} /><span className="muted ml-1 text-lg font-bold">kcal</span></p>
            <div className="stagger mt-4 grid grid-cols-3 gap-2">
              {([["protein", "Protein", plan.p, "text-sky-500"], ["carbs", "Carbs", plan.c, "text-amber-500"], ["fat", "Fat", plan.f, "text-pink-500"]] as const).map(([ic, label, v, c]) => (
                <div key={label} className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-900">
                  <Icon name={ic} size={32} className="mx-auto" />
                  <p className={`mt-1 text-2xl font-black tabular-nums ${c}`}><CountUp to={v} ms={1100} />g</p>
                  <p className="muted text-xs">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-500/15 px-3 py-1.5 text-sm font-bold text-lime-600 dark:text-lime-400"><Icon name="trophy" size={20} />Level up! +{totalXp} XP earned</p>
            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          </div>
        )}
      </div>

      {action && (
        <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-white via-white to-transparent px-4 pb-2 pt-6 dark:from-zinc-950 dark:via-zinc-950">
          <button type="button" onClick={action.run} disabled={!action.ok}
            className={`btn w-full py-3.5 text-base font-bold transition disabled:opacity-40 ${action.ok && (done || step.id === "hello") ? "anim-breathe" : ""}`}>{action.label}</button>
          {step.id === "found" && <button type="button" onClick={() => go(1)} className="muted mt-2 w-full text-center text-sm">Fix my details</button>}
          {step.id === "hello" && <button type="button" onClick={() => { setSignin(true); setErr(""); }} className="mt-3 w-full text-center text-sm font-semibold text-lime-600 dark:text-lime-400">I already have an account</button>}
        </div>
      )}
    </div>
  );
}
