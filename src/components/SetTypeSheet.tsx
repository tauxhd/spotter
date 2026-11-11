"use client";
import { useState } from "react";
import { Info, X } from "lucide-react";
import { setTypes, type SetType } from "@/lib/data";

const normal = { label: "Normal", short: "1", color: "", hint: "Numbered working set" };

// Compact set-type picker, centred on screen: 2-column grid, descriptions behind an (i) button so it never needs scrolling.
export default function SetTypeSheet({ current, onPick, onClose }: {
  current?: SetType; onPick: (t: SetType | undefined) => void; onClose: () => void;
}) {
  const options = [[undefined, normal], ...Object.entries(setTypes)] as [SetType | undefined, typeof normal][];
  const [info, setInfo] = useState<string | null>(null); // label of the option whose description is open
  const shown = options.find(([, v]) => v.label === info)?.[1];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label="Set type" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Set type</h2>
          <button aria-label="Close" onClick={onClose} className="muted p-1"><X size={18} /></button>
        </div>

        <ul className="grid grid-cols-2 gap-1.5">
          {options.map(([k, v]) => {
            const on = current === k;
            return (
              <li key={k ?? "normal"} className={`flex items-center rounded-xl transition ${on ? "bg-lime-400/15 ring-1 ring-lime-500" : "bg-zinc-100 dark:bg-zinc-800/70"}`}>
                <button onClick={() => onPick(k)} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2 text-left">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-xs font-bold dark:bg-zinc-900 ${v.color}`}>{v.short}</span>
                  <span className="truncate text-sm font-semibold">{v.label}</span>
                </button>
                <button onClick={() => setInfo(info === v.label ? null : v.label)} aria-label={`What is ${v.label}?`} aria-expanded={info === v.label}
                  className={`shrink-0 p-2 ${info === v.label ? "text-lime-500" : "muted"}`}><Info size={15} /></button>
              </li>
            );
          })}
        </ul>

        {shown && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800/70" role="note">
            <b className={`shrink-0 ${shown.color}`}>{shown.short}</b><span><b>{shown.label}:</b> {shown.hint}</span>
          </p>
        )}

      </div>
    </div>
  );
}
