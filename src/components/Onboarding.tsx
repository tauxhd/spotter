"use client";
import { useState } from "react";
import Icon, { type IconName } from "./Icon";
import type { Sex } from "@/lib/data";
import type { Unit } from "@/lib/units";
import WeightInput from "./WeightInput";
import InfoTip from "./InfoTip";
import { help } from "@/lib/help";

type P = { name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; tp?: string | null; course?: string | null; bio?: string | null; unit?: Unit;
  goal?: string | null; activity?: number | null; height?: number | null; age?: number | null; goal_bw?: number | null };

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

// Edit profile: bio, bodyweight, lifts. (First launch is the Quest.)
export default function Onboarding({ initial, onSave }: { initial: P; onSave: (p: P) => Promise<void> }) {
  const [p, setP] = useState<P>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const unit = p.unit ?? "kg";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = (n: number) => Math.round(n * 100) / 100;
    try { await onSave({ ...p, bw: r(p.bw), squat: r(p.squat), bench: r(p.bench), deadlift: r(p.deadlift), bio: p.bio?.trim() || null }); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Records p={p} />

      <section className="card">
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
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 font-semibold">Body &amp; bests <span className="muted text-sm font-normal">({unit})</span><InfoTip text={help.bodyBests} /></p>
          <div role="radiogroup" aria-label="Preferred weight unit" className="flex rounded-sm bg-zinc-100 p-0.5 text-sm font-semibold dark:bg-zinc-900">
            {(["kg", "lb"] as const).map((x) => (
              <button type="button" key={x} role="radio" aria-checked={unit === x} onClick={() => setP({ ...p, unit: x })}
                className={`rounded-sm px-3 py-1 ${unit === x ? "bg-lime-500 text-zinc-950" : "muted"}`}>{x}</button>
            ))}
          </div>
        </div>
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

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy || p.bw < 30 || p.bw > 250} className="btn w-full">{busy ? "Saving…" : "Save"}</button>
    </form>
  );
}
