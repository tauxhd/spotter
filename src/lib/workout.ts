import { timedByDefault, type Exercise, type ExerciseLog, type PostExercise } from "./data";
import { countsPR, countsVolume, e1rm, mmss } from "./lifting";

export type RankedLift = { kg: number; reps: number; at: number; orm: number };

// Every full-effort set of one exercise, each weight × reps once (the first time you did it), strongest 1RM first.
// body = bodyweight for pull-ups / dips, where kg is added weight.
export function rankedLifts(sessions: { at: string; exercises: ExerciseLog[] }[], name: string, body = 0): RankedLift[] {
  const seen = new Map<string, RankedLift>();
  for (const x of [...sessions].sort((a, b) => a.at.localeCompare(b.at)))
    for (const e of x.exercises) if (e.name === name)
      for (const st of e.sets)
        if (st.done && countsPR(st.type) && st.reps > 0 && st.kg + body > 0 && !seen.has(`${st.kg}x${st.reps}`))
          seen.set(`${st.kg}x${st.reps}`, { kg: st.kg, reps: st.reps, at: new Date(x.at).getTime(), orm: e1rm(st.kg + body, st.reps) - body });
  return [...seen.values()].sort((a, b) => b.orm - a.orm || a.reps - b.reps);
}

// Best set for each rep count (heaviest weight done for exactly that many reps), strongest 1RM first.
export const repRecords = (lifts: RankedLift[]) => lifts.filter((l, i) => lifts.findIndex((x) => x.reps === l.reps) === i);

// Session volume: kg × reps over ticked sets, warm-up and assisted sets left out (the live header and the saved post).
export const sessionVolume = (exs: ExerciseLog[]) =>
  exs.reduce((v, e) => v + e.sets.filter((x) => x.done && countsVolume(x.type)).reduce((w, x) => w + x.kg * x.reps, 0), 0);

// Turn the sets ticked in a workout into what gets saved: done exercises, PRs, the post's exercise list, volume and set count.
export function summarize(exs: ExerciseLog[], library: Exercise[], prev: Record<string, number>, body: (name: string) => number = () => 0) {
  const lib = new Map(library.map((e) => [e.name, e]));
  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);
  const done = exs.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length);
  const top1rm = (e: ExerciseLog) => { const b = body(e.name); return Math.max(0, ...e.sets.filter((x) => countsPR(x.type)).map((x) => e1rm(x.kg + b, x.reps) - b)); };
  const prs = done
    .filter((e) => !isTimed(e) && top1rm(e) > (prev[e.name] ?? 0))
    .map((e) => e.name);
  const groups = [...new Set(done.map((e) => e.superset).filter((g) => g !== undefined))];

  const exercises: PostExercise[] = done.map((e) => {
    const work = e.sets.filter((x) => countsVolume(x.type));
    const pool = work.length ? work : e.sets;
    const timed = isTimed(e);
    const top = timed
      ? pool.reduce((b, x) => ((x.secs ?? 0) > (b.secs ?? 0) ? x : b))
      : pool.reduce((b, x) => (e1rm(x.kg, x.reps) > e1rm(b.kg, b.reps) ? x : b));
    const best = timed ? (top.kg ? `${top.kg} kg × ${mmss(top.secs ?? 0)}` : mmss(top.secs ?? 0)) : top.kg ? `${top.kg} kg × ${top.reps}` : `BW × ${top.reps}`;
    const sup = e.superset !== undefined ? String.fromCharCode(65 + groups.indexOf(e.superset)) : undefined;
    return {
      id: lib.get(e.name)?.id, name: e.name, sets: e.sets.length, best,
      log: e.sets.map(({ kg, reps, type, secs }) => ({ kg, reps: timed ? 0 : reps, ...(type ? { type } : {}), ...(timed ? { secs: secs ?? 0 } : {}) })),
      ...(sup ? { superset: sup } : {}),
    };
  });

  const volume = sessionVolume(done);
  const sets = done.reduce((n, e) => n + e.sets.length, 0);
  return { done, prs, exercises, volume, sets };
}
