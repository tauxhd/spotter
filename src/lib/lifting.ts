// Strength maths: DOTS score, estimated 1RM, workout gap finder.

const DOTS = {
  M: [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093],
  F: [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706],
};

// DOTS: bodyweight-adjusted total used in powerlifting to compare lifters pound for pound.
export function dots(totalKg: number, bwKg: number, sex: "M" | "F") {
  const bw = Math.min(Math.max(bwKg, 40), sex === "M" ? 210 : 150);
  const [a, b, c, d, e] = DOTS[sex];
  return (totalKg * 500) / (a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4);
}

// Epley estimated 1-rep max; a true single counts as-is.
export const e1rm = (kg: number, reps: number) => (reps <= 1 ? kg : kg * (1 + reps / 30));

type Logged = { exercises: { name: string; sets: { kg: number; reps: number; done?: boolean; type?: string }[] }[] };

// Best estimated 1RM per exercise: starting values merged with every completed set logged since.
export function bests(base: Record<string, number>, sessions: Logged[]) {
  const out = { ...base };
  for (const s of sessions)
    for (const ex of s.exercises)
      for (const set of ex.sets)
        if (set.done && set.kg > 0 && set.reps > 0 && countsPR(set.type as T)) out[ex.name] = Math.max(out[ex.name] ?? 0, e1rm(set.kg, set.reps));
  return out;
}

// Free windows between classes (within gym hours) at least minLen minutes long.
export function gaps(busy: { start: number; end: number }[], open: number, close: number, from: number, minLen = 60) {
  const out: { start: number; end: number }[] = [];
  let cur = Math.max(open, from);
  for (const b of [...busy].sort((x, y) => x.start - y.start)) {
    if (b.start - cur >= minLen) out.push({ start: cur, end: b.start });
    cur = Math.max(cur, b.end + 15); // 15 min to walk over / change
  }
  if (close - cur >= minLen) out.push({ start: cur, end: close });
  return out;
}

// Leaderboard lifts <-> exercise bests. Rounded down to the nearest 2.5 kg plate jump.
export const plate = (kg: number) => Math.floor(kg / 2.5) * 2.5;
type Lifts = { squat: number; bench: number; deadlift: number };
export const baseOf = (p: Lifts): Record<string, number> => ({ "Squat (Barbell)": p.squat, "Bench Press (Barbell)": p.bench, "Deadlift (Barbell)": p.deadlift });
export const liftsOf = (b: Record<string, number>): Lifts => ({ squat: plate(b["Squat (Barbell)"] ?? 0), bench: plate(b["Bench Press (Barbell)"] ?? 0), deadlift: plate(b["Deadlift (Barbell)"] ?? 0) });

// IPF weight class for a bodyweight, e.g. "-74" or "120+".
export function weightClass(bw: number, limits: number[]) {
  const c = limits.find((l) => bw <= l);
  return c ? `-${c}` : `${limits.at(-1)}+`;
}

type U = "kg" | "reps" | "cm" | "sec" | "time";
const mss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const fmtResult = (v: number, unit: U) =>
  unit === "kg" ? `${v} kg` : unit === "reps" ? `${v} reps` : unit === "cm" ? `${v} cm` : unit === "sec" ? `${v.toFixed(1)} s` : mss(v);

// What a student types -> stored number. "time" accepts m:ss or plain seconds. null = not a valid result.
export function parseResult(text: string, unit: U): number | null {
  const t = text.trim();
  const m = unit === "time" && /^(\d{1,3}):([0-5]\d)$/.exec(t);
  const v = m ? Number(m[1]) * 60 + Number(m[2]) : /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
  return v > 0 && v < 100000 ? v : null;
}

// Which sets count. Warm-up and assisted sets don't add volume; only full-effort sets can set a PR.
type T = "warmup" | "failure" | "drop" | "deload" | "assisted" | "restpause" | "partial" | undefined;
export const countsVolume = (t: T) => t !== "warmup" && t !== "assisted";
export const countsPR = (t: T) => t === undefined || t === "failure" || t === "drop" || t === "restpause";

// Labels for a list of sets: normal sets are numbered 1, 2, 3…; typed sets show their letter.
export function setLabels(sets: { type?: T }[], short: Record<string, { short: string }>) {
  let n = 0;
  return sets.map((s) => (s.type ? short[s.type].short : String(++n)));
}

// Seconds <-> "m:ss" for timed sets.
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const hhmmss = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${mmss(s % 3600).padStart(5, "0")}` : mmss(s));
