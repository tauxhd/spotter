"use client";
// Workout: choose which exercises go in a superset with this one. Each superset has its own colour and letter; exercises
// already in another one show it, and picking them moves them over.
import { Check, X } from "lucide-react";
import { useState } from "react";
import ExerciseThumb from "./ExerciseThumb";
import type { Exercise, ExerciseLog } from "@/lib/data";

type Look = { tag: string; text: string };

export default function SupersetPicker({ exercises, i, lib, look, letter, onSave, onClose }: {
  exercises: ExerciseLog[]; i: number; lib: Map<string, Exercise>; look: (g?: number) => Look; letter: (g?: number) => string;
  onSave: (chosen: number[]) => void; onClose: () => void;
}) {
  const g = exercises[i].superset;
  const [pick, setPick] = useState(() => new Set(exercises.flatMap((e, k) => (k !== i && g !== undefined && e.superset === g ? [k] : []))));
  const toggle = (k: number) => setPick((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const tag = g !== undefined ? letter(g) : "new";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose} role="dialog" aria-modal aria-label="Superset">
      <div className="anim-slide-up flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl bg-white dark:bg-zinc-900 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 pb-2">
          <div>
            <h2 className="text-lg font-bold">Superset {tag !== "new" && <span className={look(g).text}>{tag}</span>}</h2>
            <p className="muted text-sm">Pick what you do back to back with <span className="font-semibold text-zinc-900 dark:text-zinc-100">{exercises[i].name}</span></p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center"><X size={20} /></button>
        </div>
        <ul className="overflow-y-auto px-3">
          {exercises.map((e, k) => k === i ? null : (
            <li key={`${e.name}-${k}`}>
              <button onClick={() => toggle(k)} aria-pressed={pick.has(k)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition active:bg-zinc-100 dark:active:bg-zinc-800">
                <ExerciseThumb ex={lib.get(e.name)} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.name}</span>
                  {e.superset !== undefined && e.superset !== g && <span className={`mt-0.5 inline-block rounded-sm px-1.5 text-[10px] font-bold uppercase ${look(e.superset).tag}`}>In superset {letter(e.superset)}</span>}
                </span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${pick.has(k) ? "border-lime-500 bg-lime-500 text-zinc-950" : "border-zinc-300 dark:border-zinc-600"}`}>{pick.has(k) && <Check size={16} strokeWidth={3} />}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {g !== undefined && <button onClick={() => onSave([])} className="btn-ghost flex-1 py-3 text-sm font-semibold">Remove superset</button>}
          <button onClick={() => onSave([...pick])} disabled={g === undefined && pick.size === 0} className="btn flex-1 py-3 font-semibold disabled:opacity-40">
            {pick.size ? `Superset ${pick.size + 1} exercises` : g !== undefined ? "Remove superset" : "Pick at least one"}
          </button>
        </div>
      </div>
    </div>
  );
}
