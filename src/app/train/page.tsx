"use client";
import Icon from "@/components/Icon";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookmarkCheck, BookmarkPlus, Check, Clock, GripVertical, Hash, Link2, MapPin, Play, Plus, Square, Timer, X } from "lucide-react";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import WeightInput from "@/components/WeightInput";
import { fromUnit, wNum, wTotal } from "@/lib/units";
import ExercisePicker from "@/components/ExercisePicker";
import SetTypeSheet from "@/components/SetTypeSheet";
import { useStore } from "@/lib/store";
import { addSets, demoNow, equipment, exercises, setTypes, templates, timeAgo, timedByDefault, supersetColor, type Exercise, type ExerciseLog, type SetType } from "@/lib/data";
import { baseOf, bests, countsPR, e1rm, hhmmss, mmss, parseResult, setLabels } from "@/lib/lifting";
import { bodyFor, isLoadedBodyweight } from "@/lib/strength";
import OneRM from "@/components/OneRM";
import { Radar } from "@/components/MuscleDistribution";
import { muscleFor } from "@/lib/muscles";
import dynamic from "next/dynamic";
import InfoTip from "@/components/InfoTip";
import MeButton from "@/components/MeButton";
import { help } from "@/lib/help";
import { sessionVolume } from "@/lib/workout";
const MuscleModel = dynamic(() => import("@/components/MuscleModel"), { ssr: false, loading: () => <div className="bone h-full min-h-10 w-full rounded-xl" /> });

const REST_KEY = "spotter:rest"; // default rest in seconds, remembered on this device
const readRest = () => { try { return Number(localStorage.getItem(REST_KEY)) || 90; } catch { return 90; } };
const REST_ON_KEY = "spotter:rest-on"; // rest timer on/off, remembered on this device
const readRestOn = () => { try { return localStorage.getItem(REST_ON_KEY) !== "0"; } catch { return true; } };

let prSound: HTMLAudioElement | undefined; // record fanfare (second clip of Success Sound Effects)

export default function Train() {
  const { s, me, u, setActive, saveRoutine } = useStore();
  const [savedAs, setSavedAs] = useState(false);
  const router = useRouter();
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [beat, tick] = useState(0); // re-render every second for the clocks
  const [restSecs, setRestSecs] = useState(90);
  const [restOn, setRestOn] = useState(true);
  useEffect(() => { setRestSecs(readRest()); setRestOn(readRestOn()); }, []);
  function toggleRest() {
    const on = !restOn;
    setRestOn(on);
    if (!on) setRestEnd(null);
    try { localStorage.setItem(REST_ON_KEY, on ? "1" : "0"); } catch {}
  }
  const [hold, setHold] = useState<{ i: number; j: number; start: number; target: number } | null>(null); // running set timer
  const [editingStart, setEditingStart] = useState(false);
  const [showHit, setShowHit] = useState(false);
  const [slide, setSlide] = useState(0);
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

  function addExercise(picked: Exercise[]) {
    edit((x) => {
      for (const e of picked) {
        const bodyweight = e.equipment === "bodyweight" || e.equipment === "cardio" || e.equipment === "other";
        const timed = timedByDefault(e.id);
        x.push({ name: e.name, ...(timed ? { timed } : {}), sets: [timed ? { kg: 0, reps: 0, secs: 30 } : { kg: bodyweight ? 0 : fromUnit(u === "lb" ? 45 : 20, u), reps: 10 }] });
      }
    });
    setPicking(false);
  }

  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);

  function restAfter(i: number) {
    if (!restOn) return;
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

  // Hold an exercise name: every exercise collapses to a row and the held one follows your finger; let go and they expand again.
  // i = held exercise, y = finger, dy = how far the held row is drawn from its slot (so it sits under the finger)
  // dropping = released, springing into its slot before the cards expand again
  const [drag, setDrag] = useState<{ i: number; y: number; dy: number; dropping?: boolean } | null>(null);
  // A neighbour that just swapped: glide it from where it was drawn (its live position) to its new place on a spring.
  const glide = useRef<{ el: HTMLElement; top: number } | null>(null);
  const order = a?.exercises.map((e) => e.name).join("|");
  // Spring an element from where it was drawn (screen y `top`) to where layout now puts it.
  const springFrom = (el: HTMLElement, top: number) => {
    const from = top - el.getBoundingClientRect().top;
    if (Math.abs(from) < 0.5) return;
    el.style.transition = "none";
    el.style.transform = `translateY(${from}px)`;
    void el.offsetHeight; // commit the start position, then let it spring home
    el.style.transition = "transform var(--spring-ms) var(--spring)";
    el.style.transform = "";
  };
  useLayoutEffect(() => {
    const g = glide.current;
    glide.current = null;
    if (g) springFrom(g.el, g.top);
  }, [order]);
  // Where every card was drawn just before the hold collapsed them, so they can slide together instead of jumping.
  const before = useRef(new Map<HTMLElement, number>());
  const slideTogether = () => {
    const held = dragRef.current && rows.current[dragRef.current.i];
    before.current.forEach((top, el) => { if (el !== held && el.isConnected) springFrom(el, top); });
    before.current.clear();
  };
  const dragRef = useRef(drag); dragRef.current = drag;
  const [padTop, setPadTop] = useState(0); // room above the list so a row near the top can still reach the finger
  const rows = useRef<(HTMLElement | null)[]>([]);
  const pressTimer = useRef<number | undefined>(undefined), pressAt = useRef({ x: 0, y: 0 }), finger = useRef(0);
  const cancelPress = () => clearTimeout(pressTimer.current);
  const longPress = (i: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      pressAt.current = { x: e.clientX, y: e.clientY }; finger.current = e.clientY;
      pressTimer.current = window.setTimeout(() => {
        before.current = new Map(rows.current.filter((el): el is HTMLElement => !!el).map((el) => [el, el.getBoundingClientRect().top]));
        setDrag({ i, y: finger.current, dy: 0 });
        try { navigator.vibrate?.(15); } catch {}
      }, 450);
    },
    onPointerMove: (e: React.PointerEvent) => { // moved before the hold finished → it's a scroll, not a drag
      finger.current = e.clientY;
      if (Math.hypot(e.clientX - pressAt.current.x, e.clientY - pressAt.current.y) > 10) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress, // fires when the browser starts scrolling
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
  const sorting = drag !== null;
  // Block page scroll while a drag is live. Registered once, non-passive, so it is already in place when the hold kicks in.
  useEffect(() => {
    const noScroll = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); };
    window.addEventListener("touchmove", noScroll, { passive: false });
    return () => window.removeEventListener("touchmove", noScroll);
  }, []);
  // Draw the held row under the finger; swap only when the finger passes the middle of the next/previous row.
  function place(y: number, swap: boolean) {
    const d = dragRef.current, el = d && rows.current[d.i];
    if (!d || !el || d.dropping) return;
    // a row's resting centre: where it's drawn minus any glide still in flight (otherwise a gliding neighbour swaps straight back)
    const midOf = (k: number) => {
      const n = rows.current[k]!, b = n.getBoundingClientRect(), t = getComputedStyle(n).transform;
      return b.top + b.height / 2 - (t && t !== "none" ? new DOMMatrixReadOnly(t).m42 : 0);
    };
    const r = el.getBoundingClientRect();
    let i = d.i, slot = r.top + r.height / 2 - d.dy; // centre of the held row's own place in the list
    const move = (to: number) => { // swap with a neighbour; it glides into the gap
      const nb = rows.current[to]!;
      glide.current = { el: nb, top: nb.getBoundingClientRect().top };
      slot = midOf(to);
      const from = i;
      edit((x) => { const [m] = x.splice(from, 1); x.splice(to, 0, m); });
      i = to;
    };
    // swap once the finger is past the halfway point to the neighbour's centre (+4px so it doesn't flicker on the line)
    if (swap && rows.current[i + 1] && y > (slot + midOf(i + 1)) / 2 + 4) move(i + 1);
    else if (swap && i > 0 && rows.current[i - 1] && y < (slot + midOf(i - 1)) / 2 - 4) move(i - 1);
    const next = { i, y, dy: y - slot };
    dragRef.current = next; setDrag(next);
  }
  // When the cards collapse, scroll (or pad the top) so the held row lines up with the finger.
  useLayoutEffect(() => {
    const d = dragRef.current, el = d && rows.current[d.i];
    if (!sorting) { setPadTop(0); return; }
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    window.scrollBy(0, r.top + r.height / 2 - d.y);
    const short = d.y - (el.getBoundingClientRect().top + r.height / 2); // > 0: page is at the top, row still above the finger
    if (short > 1) setPadTop(short); else { place(d.y, false); slideTogether(); }
  }, [sorting]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (padTop && dragRef.current) { place(dragRef.current.y, false); slideTogether(); } }, [padTop]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sorting) return;
    const move = (e: PointerEvent) => place(e.clientY, true);
    const eatClick = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
    const up = () => { // drop: swallow the click that follows the release, spring into the slot, then expand
      const d = dragRef.current;
      if (!d || d.dropping) return;
      window.addEventListener("click", eatClick, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", eatClick, { capture: true }), 60);
      const next = { ...d, dy: 0, dropping: true };
      dragRef.current = next; setDrag(next);
      try { navigator.vibrate?.(8); } catch {}
      const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450; // --spring-bounce-ms
      setTimeout(() => setDrag(null), ms);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [sorting]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(i: number, j: number) {
    const wasDone = a?.exercises[i].sets[j].done;
    // New record: this set's 1RM beats your history and every other set ticked today → fanfare.
    const ex = a?.exercises[i], st = ex?.sets[j];
    if (!wasDone && ex && st && !isTimed(ex) && countsPR(st.type)) {
      const today = ex.sets.filter((x, k) => k !== j && x.done && countsPR(x.type)).map((x) => setMax(ex.name, x));
      if (setMax(ex.name, st) > Math.max(prev[ex.name] ?? 0, ...today)) {
        try { prSound ??= new Audio("/sounds/record.mp3"); prSound.currentTime = 0; prSound.play().catch(() => {}); navigator.vibrate?.([60, 40, 120]); } catch {}
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
        <header className="flex items-center justify-between gap-3">
          <h1 className="h-title flex items-center gap-2"><Icon name="train" size={34} />Train</h1>
          <MeButton />
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
          <h2 className="flex items-center gap-1.5 font-semibold">Example routines<InfoTip text={help.examples} /></h2>
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
  // Muscles hit so far: ticked working sets, main muscle 1 set, each other muscle ½. Most first.
  const hit: Record<string, number> = {};
  for (const e of a.exercises) {
    const ex = lib.get(e.name), n = e.sets.filter((x) => x.done && countsPR(x.type)).length;
    if (!ex || !n) continue;
    const main = muscleFor(ex.muscle, ex.id);
    hit[main] = (hit[main] ?? 0) + n;
    for (const m of new Set(ex.secondary.map((x) => muscleFor(x, ex.id)))) if (m !== main) hit[m] = (hit[m] ?? 0) + n / 2;
  }
  const ranked = Object.entries(hit).sort((x, y) => y[1] - x[1]);
  const areas: Record<string, number> = {}; // same sets by body area, for the spider chart
  for (const e of a.exercises) addSets(areas, lib.get(e.name), e.sets.filter((x) => x.done && countsPR(x.type)).length);
  const q = typeof window !== "undefined" ? location.search : "";
  const vol = sessionVolume(a.exercises);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <button onClick={() => setEditingStart(true)} aria-label={`Workout time ${hhmmss(elapsed)}. Change timers`} className="min-w-0 text-left">
          <span className="flex items-center gap-2 whitespace-nowrap text-3xl font-bold tabular-nums"><Clock size={24} className="shrink-0 text-lime-500" />{hhmmss(elapsed)}</span>
          <span className="muted flex items-center gap-1 text-xs font-medium">
            <Icon name="barbell" size={14} />
            <span key={Math.round(vol)} className="anim-pop font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{wTotal(vol, u)}</span> volume · Rest {restOn ? mmss(restSecs) : "off"}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => { setSlide(0); setShowHit(true); }} aria-haspopup="dialog" aria-label="Muscles hit"
            className="h-16 w-20 transition active:scale-[0.97]">
            <MuscleModel hit={hit} compact />
          </button>
          {a.exercises.length > 0 && (
            <button disabled={savedAs} aria-label={savedAs ? "Saved as routine" : "Save as routine"} title={savedAs ? "Saved as routine" : "Save as routine"} onClick={async () => {
              const name = prompt("Save as routine. Name:", a.title === "Workout" ? "" : a.title);
              if (!name?.trim()) return;
              await saveRoutine({ name, exercises: a.exercises.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
              setSavedAs(true);
            }} className="btn-ghost p-2 text-lime-600 dark:text-lime-400">{savedAs ? <BookmarkCheck size={20} /> : <BookmarkPlus size={20} />}</button>
          )}
          <button onClick={openPost} disabled={!ranked.length} className="btn py-2 text-sm">Finish<span className="hidden sm:inline"> & share</span></button>
        </div>
      </header>
      {showHit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Muscles hit" onClick={() => setShowHit(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 text-sm shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold"><Icon name="stats" size={20} />Muscles hit<InfoTip text={help.muscles} /></h2>
              <button aria-label="Close" onClick={() => setShowHit(false)} className="muted p-1"><X size={18} /></button>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto" onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
              <div className="min-h-[21rem] w-full shrink-0 snap-center px-4"><MuscleModel hit={hit} /></div>
              <div className="w-full shrink-0 snap-center px-4"><Radar cur={areas} className="h-80 w-full" /></div>
            </div>
            <div className="flex justify-center gap-1.5" aria-hidden>{[0, 1].map((k) => <span key={k} className={`h-1.5 rounded-full transition-all duration-[var(--spring-ms)] ease-[var(--spring)] ${slide === k ? "w-4 bg-lime-500" : "w-1.5 bg-zinc-400/50"}`} />)}</div>
            {ranked.length === 0 ? <p className="muted py-4 text-center">Tick sets to see muscles hit.</p> : ranked.map(([m, n], k) => (
              <div key={m} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2">
                <span className="truncate capitalize">{m}</span>
                <span className="anim-grow h-2 rounded-full bg-lime-500" style={{ width: `${(n / ranked[0][1]) * 100}%`, "--i": k } as React.CSSProperties} />
                <b className="text-right tabular-nums">{n}</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.exercises.length === 0 && <EmptyState art="exercises" title="Empty workout" text="Add your first exercise to start logging sets." />}
      {sorting && padTop > 0 && <div aria-hidden style={{ height: Math.max(0, padTop - 16) }} />}
      {a.exercises.map((ex, i) => {
        const eq = equipment.find((e) => e.id === exercises[ex.name]?.equip);
        const best = prev[ex.name];
        const labels = setLabels(ex.sets, setTypes);
        const linkedNext = ex.superset !== undefined && a.exercises[i + 1]?.superset === ex.superset;
        const sc = color(ex.superset);
        // While dragging, every card shrinks to its name row (same elements, contents hidden) so the held name stays under the finger.
        const hide = sorting ? "hidden" : "", dragging = drag?.i === i;
        return (
          <section key={ex.name} ref={(el) => { rows.current[i] = el; }}
            style={dragging ? {
              // held: glued 1:1 to the finger and lifted; released: springs (slight bounce, it was moving) into its slot
              transform: `translateY(${drag!.dy}px) scale(${drag!.dropping ? 1 : 1.03})`,
              transition: drag!.dropping ? "transform var(--spring-bounce-ms) var(--spring-bounce), box-shadow var(--spring-bounce-ms) var(--spring)" : "box-shadow 200ms ease-out",
            } : undefined}
            className={`card relative ${ex.superset !== undefined ? `border-l-4 ${sc.bar}` : ""} ${linkedNext ? "rounded-b-md" : ""} ${sorting ? "select-none py-2" : ""} ${dragging ? `z-10 rounded-xl bg-white ring-1 ring-lime-500 dark:bg-zinc-900 ${drag!.dropping ? "shadow-sm" : "shadow-2xl"}` : ""}`}>
            {ex.superset !== undefined && (
              <span className={`absolute -top-2 left-3 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sc.tag} ${hide}`}>Superset {letter(ex.superset)}</span>
            )}
            <div className={`relative flex gap-3 ${sorting ? "items-center" : "items-start"}`}>
              {sorting && <GripVertical size={18} className="muted shrink-0" />}
              <ExerciseThumb ex={lib.get(ex.name)} size={sorting ? 36 : 48} />
              <div className="min-w-0 flex-1">
                <h2 {...longPress(i)} className="select-none font-semibold [-webkit-touch-callout:none]" title="Hold to reorder">{lib.get(ex.name) ? <Link href={`/exercise/${lib.get(ex.name)!.id}${q}`} draggable={false} className={`underline-offset-2 hover:underline ${sorting ? "" : "after:absolute after:inset-0"}`}>{ex.name}</Link> : ex.name}</h2>
                {!isTimed(ex) && !sorting && <OneRM kg={Math.max(best ?? 0, ...ex.sets.filter((st) => st.done && countsPR(st.type)).map((st) => setMax(ex.name, st)))} added={isLoadedBodyweight(lib.get(ex.name)?.id)} u={u} />}
                {!sorting && (a.exercises[i + 1] || ex.superset !== undefined) && (
                  <button onClick={() => superset(i)} aria-pressed={ex.superset !== undefined}
                    className={`relative z-10 mt-1 flex items-center gap-1 text-xs font-semibold ${ex.superset !== undefined ? sc.text : "muted"}`}>
                    <Link2 size={13} />{ex.superset !== undefined ? "Unlink superset" : "Superset"}
                  </button>
                )}
                {!sorting && (ex.timed || timedByDefault(lib.get(ex.name)?.id)) && <button onClick={() => edit((x) => { const on = !isTimed(x[i]); x[i].timed = on; if (on) x[i].sets.forEach((s) => { s.secs ??= 30; }); })}
                  className="muted relative z-10 mt-1 flex items-center gap-1 text-xs font-semibold">
                  {isTimed(ex) ? <><Hash size={13} />Log reps instead</> : <><Clock size={13} />Log time instead</>}
                </button>}
              </div>
              {sorting && <span className="muted shrink-0 text-xs">{ex.sets.length} {ex.sets.length === 1 ? "set" : "sets"}</span>}
              {eq && !sorting && (
                <Link href={`/map${q ? q + "&" : "?"}e=${eq.id}`} className="relative z-10 flex shrink-0 items-center gap-1 rounded-sm bg-zinc-100 px-2.5 py-1 text-xs font-medium dark:bg-zinc-800">
                  <MapPin size={12} />{eq.name}
                </Link>
              )}
            </div>
            {/* Sets fold away instantly on hold (so the row lands under the finger) and unfold on a spring after the drop. */}
            <div className={`grid ${sorting ? "grid-rows-[0fr]" : "grid-rows-[1fr] transition-[grid-template-rows] duration-[var(--spring-ms)] ease-[var(--spring)]"}`}>
            <div className={`min-h-0 overflow-y-clip transition-opacity ${sorting ? "opacity-0" : "opacity-100 duration-300"}`}>
            <div className={`mt-3 grid ${isTimed(ex) ? "grid-cols-[2.25rem_1fr_1fr_2.25rem_2.5rem_1.5rem]" : "grid-cols-[2.25rem_1fr_1fr_2.75rem_2.5rem_1.5rem]"} items-center gap-2 text-xs`}>
              <span className="muted">Set</span><span className="muted text-center">{u}</span><span className="muted text-center">{isTimed(ex) ? "Time" : "Reps"}</span>{isTimed(ex) ? <span /> : <span className="muted text-center">1RM</span>}<span /><span />
              {ex.sets.map((st, j) => {
                const max = countsPR(st.type) ? setMax(ex.name, st) : 0;
                const pr = st.done && max > (best ?? 0);
                return (
                  <div key={j} className={`col-span-full grid grid-cols-subgrid items-center rounded-md transition-colors duration-300 -mx-1.5 px-1.5 py-1 ${st.done ? `[&_.num]:bg-transparent ${pr ? "bg-amber-400/20 ring-1 ring-amber-400/50" : "bg-lime-500/20"}` : ""}`}>
                    <button onClick={() => setTyping({ i, j })} aria-label={`Set ${labels[j]}: ${st.type ? setTypes[st.type].label : "normal"}. Change set type`}
                      className={`flex h-9 items-center gap-1 rounded-lg font-bold tabular-nums ${st.type ? setTypes[st.type].color : ""}`}>
                      {labels[j]}{pr && <span role="img" aria-label="PR" className="flex"><Icon name="trophy" size={16} /></span>}
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
            </div>
            </div>
          </section>
        );
      })}

      {sorting && <div aria-hidden className="h-screen" />}{/* room below so the page can scroll the held row under the finger */}
      <button onClick={() => setPicking(true)} className="btn-ghost flex w-full items-center justify-center gap-2"><Icon name="plus-circle" size={20} />Add exercise</button>
      <button onClick={() => confirm("Discard this workout?") && setActive(() => null)} className="w-full py-2 text-sm font-medium text-red-500">Discard workout</button>
      {editingStart && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Timers" onClick={() => setEditingStart(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-bold">Timers<InfoTip text={help.hold} /></h2>
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
              Rest timer
              <button role="switch" aria-checked={restOn} aria-label="Rest timer" onClick={toggleRest}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${restOn ? "bg-lime-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-[var(--spring-ms)] ease-[var(--spring)] ${restOn ? "left-[1.375rem]" : "left-0.5"}`} />
              </button>
            </div>
            <div className={`flex items-center justify-between gap-3 text-sm font-medium transition-opacity ${restOn ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!restOn}>
              Rest between sets
              <div className="flex items-center gap-1">
                <button aria-label="15 seconds less rest" onClick={() => changeRest(-15)} className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 font-bold dark:bg-zinc-800">−</button>
                <span className="w-12 text-center font-semibold tabular-nums">{mmss(restSecs)}</span>
                <button aria-label="15 seconds more rest" onClick={() => changeRest(15)} className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 font-bold dark:bg-zinc-800">+</button>
              </div>
            </div>
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
