"use client";
import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import ExerciseThumb from "./ExerciseThumb";
import EmptyState from "./EmptyState";
import { useStore } from "@/lib/store";
import type { Exercise } from "@/lib/data";
import { baseOf, bests } from "@/lib/lifting";
import { bodyFor, isLoadedBodyweight } from "@/lib/strength";
import OneRM from "./OneRM";

const groups = ["all", "chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "abs", "full body", "cardio"];
const kit = [["any", "Any equipment"], ["dumbbell", "Dumbbell"], ["barbell", "Barbell"], ["bodyweight", "Bodyweight"], ["cable", "Cable"], ["machine", "Machine"], ["other", "Other"]] as const;
// barbell family = barbell + EZ bar + Smith; bodyweight family = bodyweight + rings; other = kettlebell, cardio, misc
const family = (e: string) => (["barbell", "ez-bar", "smith"].includes(e) ? "barbell" : ["bodyweight", "rings"].includes(e) ? "bodyweight" : ["dumbbell", "cable", "machine"].includes(e) ? e : "other");
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// Full-screen library browser: search + muscle chips, tap to add.
export default function ExercisePicker({ onPick, onClose, taken }: { onPick: (e: Exercise) => void; onClose: () => void; taken: string[] }) {
  const { s, me, u } = useStore();
  const logged = bests(baseOf(me), s.sessions, bodyFor(s.library, Number(me.bw)));
  const [q, setQ] = useState("");
  const [g, setG] = useState("all");
  const [k, setK] = useState("any");
  const list = s.library.filter((e) => (g === "all" || e.muscle === g) && (k === "any" || family(e.equipment) === k) && `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-100 dark:bg-zinc-950" role="dialog" aria-modal aria-label="Add exercise">
      <div className="mx-auto max-w-md space-y-3 px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
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
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {groups.map((x) => <button key={x} aria-pressed={g === x} onClick={() => setG(x)} className="chip">{cap(x)}</button>)}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {kit.map(([x, label]) => <button key={x} aria-pressed={k === x} onClick={() => setK(x)} className="chip">{label}</button>)}
        </div>
        <p className="muted text-xs">{list.length} exercise{list.length === 1 ? "" : "s"}</p>
        <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {list.map((e) => {
            const has = taken.includes(e.name);
            return (
              <li key={e.id}>
                <button disabled={has} onClick={() => onPick(e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-40">
                  <ExerciseThumb ex={e} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{e.name}</span>
                    <span className="muted block text-xs">{cap(e.muscle)} · {cap(e.equipment)}{has ? " · added" : ""}</span>
                    <OneRM kg={logged[e.name]} added={isLoadedBodyweight(e.id)} u={u} className="mt-0.5" />
                  </span>
                  <Plus size={18} className="text-lime-500" />
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li><EmptyState art="search" size={96} title="No matches" text={q ? `Nothing called “${q}” with these filters.` : "Try another muscle or equipment filter."} /></li>}
        </ul>
      </div>
    </div>
  );
}
