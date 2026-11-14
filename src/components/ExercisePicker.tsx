"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, Plus, Search, Slash, X } from "lucide-react";
import ExerciseThumb from "./ExerciseThumb";
import EmptyState from "./EmptyState";
import { useStore } from "@/lib/store";
import type { Exercise } from "@/lib/data";
import { baseOf, heaviest } from "@/lib/lifting";
import { isLoadedBodyweight } from "@/lib/strength";
import OneRM from "./OneRM";
import { family, kit, pickerGroups } from "@/lib/muscles";

// Muscle filter, pictured by an anatomy figure with that group glowing (public/muscles). Groups live in lib/muscles (shared with the app).
const groups = pickerGroups;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// Full-screen library browser: search + muscle chips; tap exercises to select several (numbered in the order picked),
// then one button adds them all.
const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "abs", "quads", "hamstrings", "glutes", "calves", "full body", "cardio"];

// "Can't find it?": add the exercise yourself. It goes to custom_exercises (only you see it) and is picked straight away;
// we review that table later and add the good ones to the library properly.
function AddMissing({ q, onAdd }: { q: string; onAdd: (e: Exercise) => void }) {
  const { s, addExercise } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""), [muscle, setMuscle] = useState("chest"), [equipment, setEquipment] = useState("dumbbell");
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const field = "w-full rounded-lg bg-zinc-100 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800";
  if (!open) return (
    <button onClick={() => { setName(q.trim().replace(/\b\w/g, (c) => c.toUpperCase())); setErr(""); setOpen(true); }}
      className="card flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.99]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lime-500 ring-2 ring-lime-500/40"><Plus size={18} /></span>
      <span><span className="block font-medium">Can&apos;t find it?</span><span className="muted block text-xs">{q.trim() ? `Add “${q.trim()}” as your own exercise` : "Add your own exercise"}</span></span>
    </button>
  );
  async function save() {
    const n = name.trim();
    if (n.length < 2) return setErr("Give it a name");
    if (s.library.some((e) => e.name.toLowerCase() === n.toLowerCase())) return setErr("That one's already in the list: search for it");
    setBusy(true); setErr("");
    try { onAdd(await addExercise({ name: n, muscle, equipment })); setOpen(false); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save it"); }
    finally { setBusy(false); }
  }
  return (
    <div className="card space-y-2.5 p-3">
      <p className="font-semibold">Add your own exercise</p>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Exercise name" aria-label="Exercise name" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className="muted text-xs">Main muscle<select value={muscle} onChange={(e) => setMuscle(e.target.value)} className={`${field} mt-1 text-zinc-900 dark:text-zinc-100`}>{MUSCLES.map((m) => <option key={m} value={m}>{cap(m)}</option>)}</select></label>
        <label className="muted text-xs">Equipment<select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={`${field} mt-1 text-zinc-900 dark:text-zinc-100`}>{kit.slice(1).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <p className="muted text-xs">Only you will see it for now. We&apos;ll review it and add it to everyone&apos;s list.</p>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-ghost flex-1 py-2">Cancel</button>
        <button onClick={save} disabled={busy} className="btn flex-1 py-2 disabled:opacity-50">{busy ? "Adding…" : "Add and pick it"}</button>
      </div>
    </div>
  );
}

export default function ExercisePicker({ onPick, onClose, taken }: { onPick: (list: Exercise[]) => void; onClose: () => void; taken: string[] }) {
  const { s, me, u } = useStore();
  const logged = heaviest(baseOf(me), s.sessions);
  const [q, setQ] = useState("");
  const [g, setG] = useState("all");
  const [k, setK] = useState("any");
  const [picked, setPicked] = useState<Exercise[]>([]);
  const toggle = (e: Exercise) => setPicked((p) => (p.some((x) => x.id === e.id) ? p.filter((x) => x.id !== e.id) : [...p, e]));
  const inGroup = groups.find(([x]) => x === g)![1];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean); // every word, any order: "single leg rdl" finds Single Leg Romanian Deadlift
  const list = s.library.filter((e) => {
    if (!inGroup(e) || (k !== "any" && family(e.equipment) !== k)) return false;
    const hay = `${e.name} ${e.muscle} ${e.equipment}${/romanian deadlift/i.test(e.name) ? " rdl" : ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-100 dark:bg-zinc-950" role="dialog" aria-modal aria-label="Add exercise">
      <div className="mx-auto max-w-md space-y-3 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center gap-3">
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><X size={18} /></button>
          <h2 className="h-title">Add exercise</h2>
          <span className="muted ml-auto text-sm">{s.library.length} exercises</span>
        </header>
        <div className="relative">
          <Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" aria-label="Search exercises"
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-base outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pt-1" role="group" aria-label="Muscle">
          {groups.map(([x]) => {
            const on = g === x;
            return (
              <button key={x} aria-pressed={on} onClick={() => setG(x)} className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5">
                <span className={`rounded-full transition ${on ? "ring-2 ring-lime-500 shadow-[0_0_14px_rgb(132_204_22/0.55)]" : "opacity-70"}`}>
                  <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-700/60">
                    {x === "all" ? <Slash size={20} strokeWidth={1.75} className="text-zinc-300" /> : <Image src={`/muscles/${x.replace(" ", "-")}.webp`} alt="" width={44} height={44} />}
                  </span>
                </span>
                <span className={`text-[11px] font-semibold ${on ? "text-lime-600 dark:text-lime-400" : "muted"}`}>{cap(x)}</span>
              </button>
            );
          })}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto border-b border-zinc-200 px-4 dark:border-zinc-800" role="group" aria-label="Equipment">
          {kit.map(([x, label]) => <button key={x} aria-pressed={k === x} onClick={() => setK(x)} className="tab">{label}</button>)}
        </div>
        <p className="muted text-xs">{list.length} exercise{list.length === 1 ? "" : "s"}</p>
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {list.map((e) => {
            const has = taken.includes(e.name), n = picked.findIndex((x) => x.id === e.id) + 1;
            return (
              <li key={e.id}>
                <button disabled={has} onClick={() => toggle(e)} aria-pressed={n > 0} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition disabled:opacity-40 ${n ? "bg-lime-500/10" : ""}`}>
                  <ExerciseThumb ex={e} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{e.name}</span>
                    <span className="muted block text-xs">{cap(e.muscle)} · {cap(e.equipment)}{has ? " · added" : ""}</span>
                    <OneRM kg={logged[e.name]} added={isLoadedBodyweight(e.id)} u={u} className="mt-0.5" />
                  </span>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold transition ${n ? "anim-pop bg-lime-500 text-zinc-950" : "text-lime-500 ring-2 ring-lime-500/40"}`}>{n || <Plus size={16} />}</span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li><EmptyState art="search" size={96} title="No matches" text={q ? `Nothing called “${q}” with these filters.` : "Try another muscle or equipment filter."} /></li>}
        </ul>
        <AddMissing q={q} onAdd={(e) => setPicked((p) => [...p, e])} />
      </div>
      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-zinc-100 via-zinc-100 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 dark:from-zinc-950 dark:via-zinc-950">
          <button onClick={() => onPick(picked)} className="btn anim-slide-up mx-auto flex w-full max-w-md items-center justify-center gap-2 py-3.5 text-base">
            <Check size={18} strokeWidth={2.5} />Add {picked.length} exercise{picked.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}
