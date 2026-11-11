"use client";
import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Hash, Link2, MapPin, Play, Plus, Square, Timer, Trophy, X } from "lucide-react";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import WeightInput from "@/components/WeightInput";
import { fromUnit, w, wNum } from "@/lib/units";
import ExercisePicker from "@/components/ExercisePicker";
import SetTypeSheet from "@/components/SetTypeSheet";
import { useStore } from "@/lib/store";
import { demoNow, equipment, exercises, setTypes, templates, timeAgo, timedByDefault, supersetColor, type Exercise, type ExerciseLog, type SetType } from "@/lib/data";
import { baseOf, bests, countsPR, e1rm, hhmmss, mmss, parseResult, setLabels } from "@/lib/lifting";
import { bodyFor, isLoadedBodyweight } from "@/lib/strength";
import OneRM from "@/components/OneRM";

const REST_KEY = "spotter:rest"; // default rest in seconds, remembered on this device
const readRest = () => { try { return Number(localStorage.getItem(REST_KEY)) || 90; } catch { return 90; } };

let prSound: HTMLAudioElement | undefined; // record fanfare (second clip of Success Sound Effects)

export default function Train() {
  const { s, me, u, setActive, saveRoutine } = useStore();
  const [savedAs, setSavedAs] = useState(false);
  const router = useRouter();
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [beat, tick] = useState(0); // re-render every second for the clocks
  const [restSecs, setRestSecs] = useState(90);
  useEffect(() => setRestSecs(readRest()), []);
  const [hold, setHold] = useState<{ i: number; j: number; start: number; target: number } | null>(null); // running set timer
  const [editingStart, setEditingStart] = useState(false);
  const [picking, setPicking] = useState(false);
  const [typing, setTyping] = useState<{ i: number; j: number } | null>(null); // set-type sheet
  const lib = new Map(s.library.map((e) => [e.name, e]));

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const body = bodyFor(s.library, Number(me.bw));
  const prev = bests(baseOf(me), s.sessions, body);
  // 1RM a set works out to (added weight for pull-ups / dips)
  const setMax = (name: string, st: { kg: number; reps: number }) => { const b = body(name); return st.reps > 0 && st.kg + b > 0 ? e1rm(st.kg + b, st.reps) - b : 0; };
  const a = s.active;

  // null = empty workout; otherwise a routine (yours or an example). Its target sets become the sets to tick off.
  function start(r: { name: string; exercises: ExerciseLog[] } | null) {
    const ex = r ? structuredClone(r.exercises).map((e) => ({ ...e, sets: e.sets.map(({ done: _, ...st }) => st) })) : []; // eslint-disable-line @typescript-eslint/no-unused-vars
    setActive(() => ({ title: r?.name ?? "Workout", startedAt: new Date().toISOString(), exercises: ex }));
  }

  function addExercise(e: Exercise) {
    const bodyweight = e.equipment === "bodyweight" || e.equipment === "cardio" || e.equipment === "other";
    const timed = timedByDefault(e.id);
    edit((x) => { x.push({ name: e.name, ...(timed ? { timed } : {}), sets: [timed ? { kg: 0, reps: 0, secs: 30 } : { kg: bodyweight ? 0 : fromUnit(u === "lb" ? 45 : 20, u), reps: 10 }] }); });
    setPicking(false);
  }

  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);

  function restAfter(i: number) {
    // in a superset, go straight to the next exercise; rest only after the last one
    const g = a?.exercises[i].superset;
    if (g !== undefined && a?.exercises[i + 1]?.superset === g) return;
    setRestEnd(Date.now() + restSecs * 1000);
  }

  function changeRest(by: number) {
    const next = Math.max(15, Math.min(600, restSecs + by));
    setRestSecs(next);
    try { localStorage.setItem(REST_KEY, String(next)); } catch {}
    setRestEnd((e) => (e ? e + by * 1000 : e));
  }

  // Timed sets: play counts down from the target (or up if there's none); stop ends early and keeps the time held.
  function startHold(i: number, j: number) {
    setHold({ i, j, start: Date.now(), target: a?.exercises[i].sets[j].secs ?? 0 });
    setRestEnd(null);
  }
  function stopHold(secs?: number) {
    if (!hold) return;
    const done = secs ?? Math.round((Date.now() - hold.start) / 1000);
    edit((x) => { const st = x[hold.i]?.sets[hold.j]; if (st) { st.secs = done; st.done = true; } });
    try { navigator.vibrate?.([200, 100, 200]); } catch {}
    restAfter(hold.i);
    setHold(null);
  }
  const held = hold ? Math.floor((Date.now() - hold.start) / 1000) : 0;
  useEffect(() => { if (hold && hold.target > 0 && held >= hold.target) stopHold(hold.target); }, [beat]); // eslint-disable-line react-hooks/exhaustive-deps

  function edit(fn: (ex: ExerciseLog[]) => void) {
    setActive((x) => {
      if (!x) return x;
      const ex = structuredClone(x.exercises);
      fn(ex);
      return { ...x, exercises: ex };
    });
  }

  function toggle(i: number, j: number) {
    const wasDone = a?.exercises[i].sets[j].done;
    // New record: this set's 1RM beats your history and every other set ticked today → fanfare.
    const ex = a?.exercises[i], st = ex?.sets[j];
    if (!wasDone && ex && st && !isTimed(ex) && countsPR(st.type)) {
      const today = ex.sets.filter((x, k) => k !== j && x.done && countsPR(x.type)).map((x) => setMax(ex.name, x));
      if (setMax(ex.name, st) > Math.max(prev[ex.name] ?? 0, ...today)) {
        try { prSound ??= new Audio("/sounds/pr.mp3"); prSound.currentTime = 0; prSound.play().catch(() => {}); navigator.vibrate?.([60, 40, 120]); } catch {}
      }
    }
    edit((ex) => { ex[i].sets[j].done = !ex[i].sets[j].done; });
    if (!wasDone) restAfter(i);
  }

  function setType(t: SetType | undefined) {
    if (!typing) return;
    edit((x) => { x[typing.i].sets[typing.j].type = t; });
    setTyping(null);
  }

  function removeSet(i: number, j: number) {
    edit((x) => { x[i].sets.splice(j, 1); if (!x[i].sets.length) x.splice(i, 1); });
  }

  // Link exercise i with the next one (or unlink it). Linked exercises share a superset id.
  function superset(i: number) {
    edit((x) => {
      if (x[i].superset !== undefined) {
        const g = x[i].superset;
        delete x[i].superset;
        const left = x.filter((e) => e.superset === g);
        if (left.length < 2) left.forEach((e) => delete e.superset);
        return;
      }
      if (!x[i + 1]) return;
      const g = x[i + 1].superset ?? Date.now();
      x[i].superset = g;
      x[i + 1].superset = g;
    });
  }

  function openPost() {
    router.push("/train/finish" + location.search);
  }

  const rest = restEnd ? Math.max(0, Math.ceil((restEnd - Date.now()) / 1000)) : 0;

  if (!a) {
    const q = typeof window !== "undefined" ? location.search : "";
    const withQ = (path: string, extra = "") => path + (q ? q + (extra ? "&" + extra : "") : extra ? "?" + extra : "");
    const RoutineCard = ({ name, list, onStart, editHref }: { name: string; list: ExerciseLog[]; onStart: () => void; editHref: string }) => (
      <article className="card">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{name}</h3>
            <p className="muted line-clamp-2 text-sm">{list.map((e) => e.name).join(", ") || "No exercises"}</p>
          </div>
          <Link href={editHref} className="muted shrink-0 rounded-lg px-2 py-1 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">Edit</Link>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {list.slice(0, 4).map((e) => <ExerciseThumb key={e.name} ex={lib.get(e.name)} size={34} />)}
          </div>
          {list.length > 4 && <span className="muted text-xs">+{list.length - 4}</span>}
          <button onClick={onStart} disabled={!list.length} className="btn ml-auto py-2 text-sm">Start routine</button>
        </div>
      </article>
    );

    return (
      <div className="space-y-5">
        <header>
          <h1 className="h-title flex items-center gap-2"><Icon name="train" size={34} />Train</h1>
        </header>

        <section className="space-y-2">
          <h2 className="font-semibold">Quick start</h2>
          <button onClick={() => start(null)} className="btn flex w-full items-center justify-center gap-2"><Plus size={18} />Start empty workout</button>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">My routines <span className="muted text-sm font-normal">({s.routines.length})</span></h2>
            <Link href={withQ("/train/routine")} className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><Plus size={16} />New routine</Link>
          </div>
          {s.routines.length === 0 && <EmptyState art="routines" size={104} className="py-4" title="No routines yet" text={<>Build one with <b>New routine</b>, or copy an example below.</>} />}
          {s.routines.map((r) => (
            <RoutineCard key={r.id} name={r.name} list={r.exercises} onStart={() => start(r)} editHref={withQ("/train/routine", `id=${r.id}`)} />
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Example routines</h2>
          <p className="muted -mt-1 text-xs">Tap Edit to copy one into your routines and change it.</p>
          {templates.map((t) => (
            <RoutineCard key={t.name} name={`${t.name} day`} list={t.exercises} onStart={() => start({ name: `${t.name} day`, exercises: t.exercises })} editHref={withQ("/train/routine", `from=${t.name}`)} />
          ))}
        </section>

        {s.sessions.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold">History</h2>
            {s.sessions.map((x) => (
              <div key={x.id} className="card flex items-center justify-between text-sm">
                <span className="font-medium">{x.title}</span>
                <span className="muted">{x.exercises.length} exercises · {timeAgo(x.at, demoNow())}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(a.startedAt).getTime()) / 1000));
  const startHHMM = (() => { const d = new Date(a.startedAt); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; })();
  function setStart(hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const d = new Date(a!.startedAt); d.setHours(h, m, 0, 0);
    if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1); // a time later than now means yesterday
    setActive((x) => (x ? { ...x, startedAt: d.toISOString() } : x));
  }
  const groups = [...new Set(a.exercises.map((e) => e.superset).filter((g) => g !== undefined))];
  const letter = (g?: number) => (g === undefined ? "" : String.fromCharCode(65 + groups.indexOf(g)));
  const color = (g?: number) => supersetColor(g === undefined ? 0 : groups.indexOf(g));
  const typingSet = typing && a.exercises[typing.i]?.sets[typing.j];
  const q = typeof window !== "undefined" ? location.search : "";

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <button onClick={() => setEditingStart(true)} aria-label={`Workout time ${hhmmss(elapsed)}. Change timers`}
            className="flex items-center gap-1.5 rounded-sm bg-lime-400/15 px-2.5 py-0.5 text-sm font-bold tabular-nums text-lime-600 dark:text-lime-400">
            <Clock size={14} />{hhmmss(elapsed)}<span className="muted font-medium">· rest {mmss(restSecs)}</span>
          </button>
          <h1 className="h-title">{a.title}</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => confirm("Discard this workout?") && setActive(() => null)} className="muted text-sm font-medium">Discard</button>
          {a.exercises.length > 0 && (
            <button disabled={savedAs} onClick={async () => {
              const name = prompt("Save as routine. Name:", a.title === "Workout" ? "" : a.title);
              if (!name?.trim()) return;
              await saveRoutine({ name, exercises: a.exercises.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
              setSavedAs(true);
            }} className="text-sm font-semibold text-lime-600 disabled:opacity-60 dark:text-lime-400">{savedAs ? "Saved ✓" : "Save as routine"}</button>
          )}
        </div>
      </header>

      {a.exercises.length === 0 && <EmptyState art="exercises" title="Empty workout" text="Add your first exercise to start logging sets." />}
      {a.exercises.map((ex, i) => {
        const eq = equipment.find((e) => e.id === exercises[ex.name]?.equip);
        const best = prev[ex.name];
        const labels = setLabels(ex.sets, setTypes);
        const linkedNext = ex.superset !== undefined && a.exercises[i + 1]?.superset === ex.superset;
        const sc = color(ex.superset);
        return (
          <section key={ex.name} className={`card relative ${ex.superset !== undefined ? `border-l-4 ${sc.bar}` : ""} ${linkedNext ? "rounded-b-md" : ""}`}>
            {ex.superset !== undefined && (
              <span className={`absolute -top-2 left-3 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sc.tag}`}>Superset {letter(ex.superset)}</span>
            )}
            <div className="flex items-start gap-3">
              <ExerciseThumb ex={lib.get(ex.name)} size={48} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{lib.get(ex.name) ? <Link href={`/exercise/${lib.get(ex.name)!.id}${q}`} className="underline-offset-2 hover:underline">{ex.name}</Link> : ex.name}</h2>
                {!isTimed(ex) && <OneRM kg={Math.max(best ?? 0, ...ex.sets.filter((st) => st.done && countsPR(st.type)).map((st) => setMax(ex.name, st)))} added={isLoadedBodyweight(lib.get(ex.name)?.id)} u={u} />}
                {(a.exercises[i + 1] || ex.superset !== undefined) && (
                  <button onClick={() => superset(i)} aria-pressed={ex.superset !== undefined}
                    className={`mt-1 flex items-center gap-1 text-xs font-semibold ${ex.superset !== undefined ? sc.text : "muted"}`}>
                    <Link2 size={13} />{ex.superset !== undefined ? "Unlink superset" : "Superset"}
                  </button>
                )}
                {(ex.timed || timedByDefault(lib.get(ex.name)?.id)) && <button onClick={() => edit((x) => { const on = !isTimed(x[i]); x[i].timed = on; if (on) x[i].sets.forEach((s) => { s.secs ??= 30; }); })}
                  className="muted mt-1 flex items-center gap-1 text-xs font-semibold">
                  {isTimed(ex) ? <><Hash size={13} />Log reps instead</> : <><Clock size={13} />Log time instead</>}
                </button>}
              </div>
              {eq && (
                <Link href={`/map${q ? q + "&" : "?"}e=${eq.id}`} className="flex shrink-0 items-center gap-1 rounded-sm bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-800">
                  <MapPin size={12} />{eq.name}
                </Link>
              )}
            </div>
            <div className={`mt-3 grid ${isTimed(ex) ? "grid-cols-[2.25rem_1fr_1fr_2.25rem_2.5rem_1.5rem]" : "grid-cols-[2.25rem_1fr_1fr_2.75rem_2.5rem_1.5rem]"} items-center gap-2 text-xs`}>
              <span className="muted">Set</span><span className="muted text-center">{u}</span><span className="muted text-center">{isTimed(ex) ? "Time" : "Reps"}</span>{isTimed(ex) ? <span /> : <span className="muted text-center">1RM</span>}<span /><span />
              {ex.sets.map((st, j) => {
                const max = countsPR(st.type) ? setMax(ex.name, st) : 0;
                const pr = st.done && max > (best ?? 0);
                return (
                  <div key={j} className={`col-span-full grid grid-cols-subgrid items-center rounded-md transition-colors duration-300 -mx-1.5 px-1.5 py-1 ${st.done ? `[&_.num]:bg-transparent ${pr ? "bg-amber-400/20 ring-1 ring-amber-400/50" : "bg-lime-500/20"}` : ""}`}>
                    <button onClick={() => setTyping({ i, j })} aria-label={`Set ${labels[j]}: ${st.type ? setTypes[st.type].label : "normal"}. Change set type`}
                      className={`flex h-9 items-center gap-1 rounded-lg font-bold tabular-nums ${st.type ? setTypes[st.type].color : ""}`}>
                      {labels[j]}{pr && <Trophy size={12} className="text-amber-500" aria-label="PR" />}
                    </button>
                    <WeightInput aria-label={`Set ${j + 1} weight, ${u}`} placeholder="0" kg={st.kg} unit={u} onKg={(v) => edit((x) => { x[i].sets[j].kg = v; })} />
                    {isTimed(ex) ? (() => {
                      const running = hold?.i === i && hold?.j === j;
                      return (
                        <>
                          {running
                            ? <span className="num grid h-9 place-items-center text-lime-600 ring-2 ring-lime-500 dark:text-lime-400" aria-live="polite">{mmss(hold.target ? Math.max(0, hold.target - held) : held)}</span>
                            : <input key={`${j}-${st.secs}`} aria-label={`Set ${labels[j]} time, minutes:seconds`} inputMode="text" className="num" defaultValue={mmss(st.secs ?? 0)}
                                onBlur={(e) => { const v = parseResult(e.target.value, "time"); edit((x) => { x[i].sets[j].secs = v ?? 0; }); }} />}
                          <button aria-label={running ? "Stop timer" : `Start ${mmss(st.secs ?? 0)} timer`} disabled={!!hold && !running}
                            onClick={() => (running ? stopHold() : startHold(i, j))}
                            className={`grid h-9 place-items-center rounded-lg transition active:scale-90 disabled:opacity-30 ${running ? "bg-lime-500 text-zinc-950" : "bg-zinc-100 text-lime-600 dark:bg-zinc-800 dark:text-lime-400"}`}>
                            {running ? <Square size={14} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                          </button>
                        </>
                      );
                    })() : (
                      <input aria-label={`Set ${j + 1} reps`} inputMode="numeric" className="num" value={st.reps}
                        onChange={(e) => edit((x) => { x[i].sets[j].reps = Number(e.target.value.replace(/\D/g, "")) || 0; })} />
                    )}
                    {!isTimed(ex) && <span aria-label={`Set ${labels[j]} estimated 1RM`} className={`text-center text-xs font-semibold tabular-nums ${st.done ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"}`}>
                      {max > 0 ? `${isLoadedBodyweight(lib.get(ex.name)?.id) ? "+" : ""}${wNum(Math.round(max), u)}` : "–"}
                    </span>}
                    <button aria-label={st.done ? "Mark set not done" : "Mark set done"} aria-pressed={!!st.done} onClick={() => toggle(i, j)}
                      className={`grid h-9 place-items-center rounded-lg transition active:scale-90 ${st.done ? "bg-lime-500 text-zinc-950" : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"}`}>
                      <Check size={18} strokeWidth={st.done ? 2.25 : 1.75} />
                    </button>
                    <button aria-label={`Remove set ${labels[j]}`} onClick={() => removeSet(i, j)} className="grid h-9 place-items-center rounded-lg opacity-70 transition hover:opacity-100 active:scale-90">
                      <X size={16} strokeWidth={1.75} className="text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => edit((x) => { const l = x[i].sets.at(-1); x[i].sets.push(l ? { kg: l.kg, reps: l.reps, ...(l.secs !== undefined ? { secs: l.secs } : {}) } : { kg: 0, reps: 10 }); })}
              className="muted mt-3 flex items-center gap-1.5 text-sm font-medium"><Icon name="plus" size={14} />Add set</button>
          </section>
        );
      })}

      <button onClick={() => setPicking(true)} className="btn-ghost flex w-full items-center justify-center gap-2"><Icon name="plus-circle" size={20} />Add exercise</button>
      <button onClick={openPost} disabled={!a.exercises.some((e) => e.sets.some((x) => x.done))} className="btn w-full">Finish & share</button>

      {editingStart && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Timers" onClick={() => setEditingStart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Timers</h2>
              <button aria-label="Close" onClick={() => setEditingStart(false)} className="muted p-1"><X size={18} /></button>
            </div>
            <div className="rounded-xl bg-zinc-100 p-3 text-center dark:bg-zinc-800/70">
              <p className="muted text-xs">Workout time</p>
              <p className="text-3xl font-bold tabular-nums">{hhmmss(elapsed)}</p>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              Started at
              <input type="time" value={startHHMM} onChange={(e) => setStart(e.target.value)}
                className="rounded-lg bg-zinc-100 px-2 py-1.5 font-semibold tabular-nums outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800 dark:[color-scheme:dark]" />
            </label>
            <div className="flex items-center justify-between gap-3 text-sm font-medium">
              Rest between sets
              <div className="flex items-center gap-1">
                <button aria-label="15 seconds less rest" onClick={() => changeRest(-15)} className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 font-bold dark:bg-zinc-800">−</button>
                <span className="w-12 text-center font-semibold tabular-nums">{mmss(restSecs)}</span>
                <button aria-label="15 seconds more rest" onClick={() => changeRest(15)} className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 font-bold dark:bg-zinc-800">+</button>
              </div>
            </div>
            <p className="muted text-xs">Hold exercises (planks, hangs, carries…) have a {"▶︎"} timer on each set. Switch them to reps with “Log reps instead”.</p>
          </div>
        </div>
      )}

      {typing && typingSet && <SetTypeSheet current={typingSet.type} onPick={setType} onClose={() => setTyping(null)} />}
      {picking && <ExercisePicker taken={a.exercises.map((e) => e.name)} onPick={addExercise} onClose={() => setPicking(false)} />}

      {rest > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-10 mx-auto flex max-w-md items-center gap-3 px-4">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-lg dark:bg-zinc-800">
            <Timer size={18} className="text-lime-400" />
            <span className="font-semibold">Rest</span>
            <button aria-label="15 seconds less rest" onClick={() => changeRest(-15)} className="ml-auto rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">−15</button>
            <span className="w-12 text-center text-xl font-bold tabular-nums">{mmss(rest)}</span>
            <button aria-label="15 seconds more rest" onClick={() => changeRest(15)} className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold">+15</button>
            <button aria-label="Skip rest" onClick={() => setRestEnd(null)} className="rounded-lg bg-white/10 p-1.5"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
