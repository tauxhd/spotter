"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Hash, Link2, Trash2 } from "lucide-react";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import WeightInput from "@/components/WeightInput";
import { fromUnit } from "@/lib/units";
import Icon from "@/components/Icon";
import ExercisePicker from "@/components/ExercisePicker";
import SetTypeSheet from "@/components/SetTypeSheet";
import { useStore } from "@/lib/store";
import { setTypes, supersetColor, templates, timedByDefault, type Exercise, type ExerciseLog } from "@/lib/data";
import { mmss, parseResult, setLabels } from "@/lib/lifting";

// Create / edit a routine. ?id=<routine> edits, ?from=<example name> starts from an example, nothing = blank.
function Editor() {
  const params = useSearchParams();
  const { s, u, saveRoutine, deleteRoutine } = useStore();
  const router = useRouter();
  const id = params.get("id");
  const existing = s.routines.find((r) => r.id === id);
  const example = templates.find((t) => t.name === params.get("from"));
  const [name, setName] = useState(existing?.name ?? (example ? `${example.name} day` : ""));
  const [list, setList] = useState<ExerciseLog[]>(() => structuredClone(existing?.exercises ?? example?.exercises ?? []));
  const [picking, setPicking] = useState(false);
  const [typing, setTyping] = useState<{ i: number; j: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const lib = new Map(s.library.map((e) => [e.name, e]));
  const back = "/train" + (typeof window !== "undefined" ? location.search.replace(/[?&](id|from)=[^&]*/g, "").replace(/^&/, "?") : "");

  const edit = (fn: (x: ExerciseLog[]) => void) => setList((l) => { const x = structuredClone(l); fn(x); return x; });
  const add = (e: Exercise) => {
    const bw = e.equipment === "bodyweight" || e.equipment === "cardio" || e.equipment === "other";
    const timed = timedByDefault(e.id);
    edit((x) => { x.push({ name: e.name, ...(timed ? { timed } : {}), sets: [0, 1, 2].map(() => (timed ? { kg: 0, reps: 0, secs: 30 } : { kg: bw ? 0 : fromUnit(u === "lb" ? 45 : 20, u), reps: 10 })) }); });
    setPicking(false);
  };
  const superset = (i: number) => edit((x) => {
    if (x[i].superset !== undefined) { const g = x[i].superset; delete x[i].superset; const left = x.filter((e) => e.superset === g); if (left.length < 2) left.forEach((e) => delete e.superset); return; }
    if (!x[i + 1]) return;
    const g = x[i + 1].superset ?? Date.now();
    x[i].superset = g; x[i + 1].superset = g;
  });
  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);
  const groups = [...new Set(list.map((e) => e.superset).filter((g) => g !== undefined))];

  async function save() {
    if (!name.trim()) return setErr("Give the routine a name");
    if (!list.length) return setErr("Add at least one exercise");
    setSaving(true);
    setErr("");
    try {
      await saveRoutine({ id: existing?.id, name, exercises: list.map((e) => ({ ...e, sets: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps, ...(type ? { type } : {}), ...(secs !== undefined ? { secs } : {}) })) })) });
      router.push(back);
    } catch (x) { setErr((x as Error).message); setSaving(false); }
  }

  if (id && !existing) return <EmptyState art="not-found" title="Routine not found" text="It may have been deleted." className="mt-16" />;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={back} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><ArrowLeft size={18} /></Link>
        <h1 className="h-title flex-1">{existing ? "Edit routine" : "New routine"}</h1>
        <button onClick={save} disabled={saving} className="btn py-2 text-sm">{saving ? "Saving…" : "Save"}</button>
      </header>

      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Routine name, e.g. Upper A" aria-label="Routine name"
        className="w-full rounded-xl bg-white px-3 py-3 text-lg font-semibold outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
      {err && <p className="text-sm text-red-600">{err}</p>}

      {list.length === 0 && (
        <EmptyState art="exercises" title="No exercises yet" text="Add some below and set the target sets, weight and reps." />
      )}

      {list.map((ex, i) => {
        const labels = setLabels(ex.sets, setTypes);
        const sc = supersetColor(ex.superset === undefined ? 0 : groups.indexOf(ex.superset));
        return (
          <section key={ex.name} className={`card relative ${ex.superset !== undefined ? `border-l-4 ${sc.bar}` : ""}`}>
            {ex.superset !== undefined && <span className={`absolute -top-2 left-3 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sc.tag}`}>Superset {String.fromCharCode(65 + groups.indexOf(ex.superset))}</span>}
            <div className="flex items-start gap-3">
              <ExerciseThumb ex={lib.get(ex.name)} size={44} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{ex.name}</h2>
                {(list[i + 1] || ex.superset !== undefined) && (
                  <button onClick={() => superset(i)} className={`mt-0.5 flex items-center gap-1 text-xs font-semibold ${ex.superset !== undefined ? sc.text : "muted"}`}>
                    <Link2 size={13} />{ex.superset !== undefined ? "Unlink superset" : "Superset"}
                  </button>
                )}
                {(ex.timed || timedByDefault(lib.get(ex.name)?.id)) && <button onClick={() => edit((x) => { const on = !isTimed(x[i]); x[i].timed = on; if (on) x[i].sets.forEach((s) => { s.secs ??= 30; }); })}
                  className="muted mt-0.5 flex items-center gap-1 text-xs font-semibold">
                  {isTimed(ex) ? <><Hash size={13} />Log reps instead</> : <><Clock size={13} />Log time instead</>}
                </button>}
              </div>
              <button aria-label={`Remove ${ex.name}`} onClick={() => edit((x) => { x.splice(i, 1); })} className="muted p-1"><Trash2 size={16} /></button>
            </div>
            <div className="mt-3 grid grid-cols-[3.25rem_1fr_1fr_2rem] items-center gap-2 text-xs">
              <span className="muted">Set</span><span className="muted text-center">{u}</span><span className="muted text-center">{isTimed(ex) ? "Target time" : "Reps"}</span><span />
              {ex.sets.map((st, j) => (
                <div key={j} className="contents">
                  <button onClick={() => setTyping({ i, j })} aria-label={`Set ${labels[j]}: ${st.type ? setTypes[st.type].label : "normal"}. Change set type`}
                    className={`grid h-9 place-items-center rounded-lg bg-zinc-100 font-bold dark:bg-zinc-800 ${st.type ? setTypes[st.type].color : ""}`}>{labels[j]}</button>
                  <WeightInput aria-label={`Set ${labels[j]} weight, ${u}`} placeholder="0" kg={st.kg} unit={u} onKg={(v) => edit((x) => { x[i].sets[j].kg = v; })} />
                  {isTimed(ex)
                    ? <input key={`${j}-${st.secs}`} aria-label={`Set ${labels[j]} target time, minutes:seconds`} className="num" defaultValue={mmss(st.secs ?? 0)}
                        onBlur={(e) => { const v = parseResult(e.target.value, "time"); edit((x) => { x[i].sets[j].secs = v ?? 0; }); }} />
                    : <input aria-label={`Set ${labels[j]} reps`} inputMode="numeric" className="num" value={st.reps}
                        onChange={(e) => edit((x) => { x[i].sets[j].reps = Number(e.target.value.replace(/\D/g, "")) || 0; })} />}
                  <button aria-label={`Remove set ${labels[j]}`} onClick={() => edit((x) => { x[i].sets.splice(j, 1); if (!x[i].sets.length) x.splice(i, 1); })} className="grid place-items-center opacity-70 transition hover:opacity-100 active:scale-90"><Icon name="cross" size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => edit((x) => { const l = x[i].sets.at(-1)!; x[i].sets.push({ kg: l.kg, reps: l.reps, ...(l.secs !== undefined ? { secs: l.secs } : {}) }); })}
              className="muted mt-3 flex items-center gap-1.5 text-sm font-medium"><Icon name="plus" size={14} />Add set</button>
          </section>
        );
      })}

      <button onClick={() => setPicking(true)} className="btn-ghost flex w-full items-center justify-center gap-2"><Icon name="plus-circle" size={20} />Add exercise</button>
      {existing && (
        <button onClick={async () => { if (confirm(`Delete "${existing.name}"?`)) { await deleteRoutine(existing.id); router.push(back); } }}
          className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-red-500"><Trash2 size={16} />Delete routine</button>
      )}

      {picking && <ExercisePicker taken={list.map((e) => e.name)} onPick={add} onClose={() => setPicking(false)} />}
      {typing && list[typing.i]?.sets[typing.j] && (
        <SetTypeSheet current={list[typing.i].sets[typing.j].type} onClose={() => setTyping(null)}
          onPick={(t) => { edit((x) => { const st = x[typing.i].sets[typing.j]; if (t) st.type = t; else delete st.type; }); setTyping(null); }} />
      )}
    </div>
  );
}

export default function RoutinePage() {
  return <Suspense><Editor /></Suspense>;
}
