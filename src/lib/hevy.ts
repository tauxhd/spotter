// Import from Hevy: read the CSV Hevy exports (Hevy > Settings > Export Data > Export Workout Data) and turn each workout
// into what Spotter saves when you finish one (a workout + a post), with PRs worked out in date order like the app does.
import type { Exercise, ExerciseLog, PostExercise, SetT } from "./data.ts";
import { bests, heaviest, baseOf, liftsOf, type Lifts } from "./lifting.ts";
import { bodyFor, volumeBodyFor } from "./strength.ts";
import { summarize } from "./workout.ts";

// RFC 4180 CSV: quoted fields, "" inside quotes, line breaks inside quotes
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// "Nov 12, 2026, 9:17 PM", "12 Nov 2026, 21:17" or ISO; read as the phone's local time, like Hevy wrote it
export function parseDate(s: string): Date | null {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) { const d = new Date(t.replace(" ", "T")); return isNaN(+d) ? null : d; }
  const m = t.match(/^(?:([A-Za-z]{3})[a-z]* (\d{1,2})|(\d{1,2}) ([A-Za-z]{3})[a-z]*),? (\d{4}),? (\d{1,2}):(\d{2})(?: ?([AaPp])\.?[Mm]\.?)?/);
  if (!m) return null;
  const mon = MON.indexOf((m[1] ?? m[4]).toLowerCase()), day = Number(m[2] ?? m[3]);
  let h = Number(m[6]); const ap = m[8]?.toLowerCase();
  if (ap === "p" && h < 12) h += 12; if (ap === "a" && h === 12) h = 0;
  return mon < 0 ? null : new Date(Number(m[5]), mon, day, h, Number(m[7]));
}

export type HevySet = { kg: number; reps: number; secs?: number; type?: SetT["type"] };
export type HevyWorkout = { title: string; note: string; start: Date; end: Date; exercises: { name: string; superset?: string; sets: HevySet[] }[] };
const TYPE: Record<string, SetT["type"]> = { warmup: "warmup", failure: "failure", dropset: "drop" };

export function readHevy(text: string): HevyWorkout[] {
  const [head, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (n: string) => head.findIndex((h) => h.trim().toLowerCase() === n);
  const C = { title: col("title"), start: col("start_time"), end: col("end_time"), note: col("description"), ex: col("exercise_title"), ss: col("superset_id"), type: col("set_type"), kg: col("weight_kg"), reps: col("reps"), secs: col("duration_seconds") };
  if (C.title < 0 || C.start < 0 || C.ex < 0) throw new Error("This doesn't look like a Hevy export. In Hevy: Settings > Export Data > Export Workout Data.");
  const out = new Map<string, HevyWorkout>();
  for (const r of rows) {
    const start = parseDate(r[C.start] ?? ""); if (!start) continue;
    const key = `${r[C.title]}|${r[C.start]}`;
    let w = out.get(key);
    if (!w) { w = { title: r[C.title] || "Workout", note: r[C.note] ?? "", start, end: parseDate(r[C.end] ?? "") ?? start, exercises: [] }; out.set(key, w); }
    const name = r[C.ex], ss = r[C.ss] || undefined, last = w.exercises.at(-1);
    const ex = last && last.name === name && last.superset === ss ? last : (w.exercises.push({ name, superset: ss, sets: [] }), w.exercises.at(-1)!);
    const secs = Number(r[C.secs]) || 0, t = TYPE[(r[C.type] ?? "").trim().toLowerCase()];
    ex.sets.push({ kg: Number(r[C.kg]) || 0, reps: Number(r[C.reps]) || 0, ...(secs ? { secs } : {}), ...(t ? { type: t } : {}) });
  }
  return [...out.values()].sort((a, b) => +a.start - +b.start);
}

// Hevy names for movements Spotter files under another name; anything else matches by name (ignoring case and spaces)
const SAME: Record<string, string> = {
  "Triceps Extension (Dumbbell)": "Overhead Triceps Extension (Dumbbell)", "Pull Up (Weighted)": "Pull Up", "Push Up (Weighted)": "Push Up",
  "Triceps Dip (Weighted)": "Triceps Dip", "Triceps Pushdown": "Triceps Pushdown (Bar)", "Sumo Deadlift": "Sumo Deadlift (Barbell)",
  "Full Squat": "Squat (Barbell)", "Front Squat": "Front Squat (Barbell)", "Russian Twist (Weighted)": "Russian Twist (Dumbbell)",
  "Seated Calf Raise": "Seated Calf Raise (Machine)", "Butterfly (Pec Deck)": "Pec Deck (Machine Fly)", "Seated Cable Row - Bar Grip": "Seated Cable Row",
  "Lunge (Dumbbell)": "Forward Lunge (Dumbbell)", "Clean and Press": "Clean and Press (Barbell)",
  "Treadmill": "Running (Treadmill)", "Running": "Running (Treadmill)", "Spinning": "Cycling (Stationary Bike)", "Cycling": "Cycling (Stationary Bike)",
  "Lateral Leg Raises": "Side Lying Leg Raise", "Seated Cable Row - V Grip (Cable)": "Seated Cable Row", "Standing Cable Glute Kickbacks": "Glute Kickback (Cable)",
  "Triceps Rope Pushdown": "Triceps Pushdown (Rope)", "Scapular Pull Ups": "Scapular Pull Up", "Chest Fly (Machine)": "Pec Deck (Machine Fly)",
  "Kettlebell Windmill": "Windmill (Kettlebell)", "Kettble ball Windmill": "Windmill (Kettlebell)", "Bulgarian Split Squat (Dumbbell)": "Bulgarian Split Squat",
  "Dumbbell Step Up": "Step Up (Dumbbell)", "Step Up": "Step Up (Bodyweight)", "Weighted Plank": "Plank", "Chest Supported Incline Row (Dumbbell)": "Chest Supported Row (Dumbbell)",
  "Walking Lunge": "Walking Lunge (Dumbbell)", "Lunge": "Bodyweight Lunge", "Lateral Lunge": "Lateral Lunge (Dumbbell)", "Seated Incline Curl (Dumbbell)": "Incline Curl (Dumbbell)",
  "Standing Calf Raise (Dumbbell)": "Calf Raise (Dumbbell)", "Shoulder Taps": "Plank Shoulder Tap", "Back Extension (Weighted Hyperextension)": "Weighted Back Extension",
  "Pull Up (Band)": "Band Assisted Pull Up", "Pull Up (Assisted)": "Assisted Pull Up (Machine)", "Around The World": "Around the World (Dumbbell)", "touch down": "Touch Downs",
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function nameIn(library: Exercise[], hevy: string) {
  const want = SAME[hevy] ?? hevy;
  return library.find((e) => e.name === want)?.name ?? library.find((e) => norm(e.name) === norm(want))?.name ?? hevy;
}

export type Converted = { at: string; workout: { title: string; exercises: ExerciseLog[] }; post: { title: string; note: string | null; exercises: PostExercise[]; volume: number; prs: string[]; duration_min: number } };
// Hevy workouts -> Spotter rows, oldest first. `before` = sessions already in Spotter, so PRs only count real records.
export function convert(ws: HevyWorkout[], library: Exercise[], p: Lifts & { bw: number }, before: { at: string; exercises: ExerciseLog[] }[] = []) {
  const body = bodyFor(library, p.bw), volBody = volumeBodyFor(library, p.bw);
  const done = [...before];
  const out: Converted[] = [];
  const unmatched = new Set<string>();
  for (const w of ws) {
    const exercises: ExerciseLog[] = w.exercises.map((e) => {
      const name = nameIn(library, e.name);
      if (!library.some((x) => x.name === name)) unmatched.add(name);
      return { name, ...(e.superset !== undefined ? { superset: Number(e.superset) || 0 } : {}), ...(e.sets.some((s) => s.secs) ? { timed: true } : {}), sets: e.sets.map((s) => ({ ...s, done: true })) };
    });
    const sum = summarize(exercises, library, bests(baseOf(p), done as never, body), body, volBody);
    if (!sum.done.length) continue;
    const at = w.start.toISOString();
    done.push({ at, exercises: sum.done });
    out.push({
      at, workout: { title: w.title.slice(0, 80), exercises: sum.done },
      post: { title: w.title.slice(0, 80), note: w.note.slice(0, 500) || null, exercises: sum.exercises, volume: Math.round(sum.volume), prs: sum.prs, duration_min: Math.min(600, Math.max(1, Math.round((+w.end - +w.start) / 60000))) },
    });
  }
  return { items: out, lifts: liftsOf(heaviest(baseOf(p), done as never)), unmatched: [...unmatched] };
}

// Hevy's public API (GET /v1/workouts with the user's API key, Hevy Pro) -> the same shape the CSV gives
export type ApiWorkout = {
  title: string; description?: string | null; start_time: string; end_time?: string | null;
  exercises: { title: string; superset_id?: number | null; sets: { type?: string; weight_kg?: number | null; reps?: number | null; duration_seconds?: number | null }[] }[];
};
export function fromApi(ws: ApiWorkout[]): HevyWorkout[] {
  return ws.map((w) => ({
    title: w.title || "Workout", note: w.description ?? "", start: new Date(w.start_time), end: new Date(w.end_time ?? w.start_time),
    exercises: w.exercises.map((e) => ({
      name: e.title, superset: e.superset_id === null || e.superset_id === undefined ? undefined : String(e.superset_id),
      sets: e.sets.map((s) => {
        const secs = s.duration_seconds || 0, t = TYPE[(s.type ?? "").toLowerCase()];
        return { kg: s.weight_kg || 0, reps: s.reps || 0, ...(secs ? { secs } : {}), ...(t ? { type: t } : {}) };
      }),
    })),
  })).filter((w) => !isNaN(+w.start)).sort((a, b) => +a.start - +b.start);
}
