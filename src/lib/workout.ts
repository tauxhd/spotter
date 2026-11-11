import { timedByDefault, type Exercise, type ExerciseLog, type PostExercise } from "./data";
import { countsPR, countsVolume, e1rm, mmss } from "./lifting";

// Turn the sets ticked in a workout into what gets saved: done exercises, PRs, the post's exercise list, volume and set count.
export function summarize(exs: ExerciseLog[], library: Exercise[], prev: Record<string, number>) {
  const lib = new Map(library.map((e) => [e.name, e]));
  const isTimed = (e: ExerciseLog) => e.timed ?? timedByDefault(lib.get(e.name)?.id);
  const done = exs.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })).filter((e) => e.sets.length);
  const prs = done
    .filter((e) => !isTimed(e) && Math.max(0, ...e.sets.filter((x) => countsPR(x.type)).map((x) => e1rm(x.kg, x.reps))) > (prev[e.name] ?? 0))
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

  const volume = done.reduce((v, e) => v + e.sets.filter((x) => countsVolume(x.type)).reduce((w, x) => w + x.kg * x.reps, 0), 0);
  const sets = done.reduce((n, e) => n + e.sets.length, 0);
  return { done, prs, exercises, volume, sets };
}
