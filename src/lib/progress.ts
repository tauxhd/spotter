// Training over time and head to head (stats and compare pages, web and app): workouts / volume / time / sets per week,
// month or year with the change against the period before, days trained in a month, and best lifts for comparing two people.
import { countsPR, e1rm } from "./lifting.ts";
import type { SetType } from "./data";

type Logged = { kg: number; reps: number; type?: SetType; secs?: number };
export type PostLike = { at: string; volume: number; duration?: number | null; prs: string[]; exercises: { name: string; sets?: number; log?: Logged[] }[] };
export type Period = "week" | "month" | "year";
export type Metric = "workouts" | "volume" | "minutes" | "sets";
export type Bucket = Record<Metric, number> & { start: number; end: number; label: string; long: string; prs: number };

const COUNT = { week: 8, month: 12 }; // bars shown; years go back to the first workout (up to 6)
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const setsOf = (x: PostLike) => x.exercises.reduce((n, e) => n + (e.log?.length || e.sets || 1), 0);

function startOf(d: Date, p: Period) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  if (p === "week") x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  if (p !== "week") x.setDate(1);
  if (p === "year") x.setMonth(0);
  return x;
}
function shift(d: Date, p: Period, by: number) {
  const x = new Date(d);
  if (p === "week") x.setDate(x.getDate() + 7 * by);
  else if (p === "month") x.setMonth(x.getMonth() + by);
  else x.setFullYear(x.getFullYear() + by);
  return x;
}
function names(d: Date, p: Period) {
  if (p === "week") return { label: `${d.getDate()} ${MON[d.getMonth()]}`, long: `Week of ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}` };
  if (p === "month") return { label: d.getMonth() === 0 ? `Jan ’${String(d.getFullYear()).slice(2)}` : MON[d.getMonth()], long: `${MONTH[d.getMonth()]} ${d.getFullYear()}` };
  return { label: String(d.getFullYear()), long: String(d.getFullYear()) };
}

// One bucket per week / month / year, oldest first, ending with the current one.
export function buckets(posts: PostLike[], period: Period, now = new Date()): Bucket[] {
  const first = posts.reduce((m, x) => Math.min(m, new Date(x.at).getFullYear()), now.getFullYear());
  const n = period === "year" ? Math.min(6, now.getFullYear() - first + 1) : COUNT[period];
  const cur = startOf(now, period);
  return Array.from({ length: n }, (_, i) => {
    const s = shift(cur, period, i - n + 1), e = shift(s, period, 1);
    const ps = posts.filter((x) => { const t = new Date(x.at).getTime(); return t >= s.getTime() && t < e.getTime(); });
    return {
      start: s.getTime(), end: e.getTime(), ...names(s, period),
      workouts: ps.length, volume: ps.reduce((v, x) => v + x.volume, 0), minutes: ps.reduce((v, x) => v + (x.duration ?? 0), 0),
      sets: ps.reduce((v, x) => v + setsOf(x), 0), prs: ps.reduce((v, x) => v + x.prs.length, 0),
    };
  });
}

// % change from the period before (null when there's nothing to compare against)
export const change = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

// Workouts per day of one month: day of month -> count
export function trainedDays(posts: PostLike[], year: number, month: number) {
  const m = new Map<number, number>();
  for (const x of posts) { const d = new Date(x.at); if (d.getFullYear() === year && d.getMonth() === month) m.set(d.getDate(), (m.get(d.getDate()) ?? 0) + 1); }
  return m;
}

// Head to head: best estimated one-rep max per exercise (counting sets only: no warm-ups, timed or empty sets)
export type Best = { kg: number; reps: number; e1rm: number };
export function bestLifts(posts: PostLike[]) {
  const best: Record<string, Best> = {};
  for (const x of posts) for (const e of x.exercises) for (const l of e.log ?? []) {
    if (!countsPR(l.type) || l.kg <= 0 || l.reps <= 0 || l.secs) continue;
    const v = e1rm(l.kg, l.reps);
    if (!best[e.name] || v > best[e.name].e1rm) best[e.name] = { kg: l.kg, reps: l.reps, e1rm: v };
  }
  return best;
}
// Exercises both people have done, heaviest first
export function sharedLifts(a: Record<string, Best>, b: Record<string, Best>, limit = 10) {
  return Object.keys(a).filter((k) => b[k]).map((name) => ({ name, a: a[name], b: b[name] }))
    .sort((x, y) => Math.max(y.a.e1rm, y.b.e1rm) - Math.max(x.a.e1rm, x.b.e1rm)).slice(0, limit);
}

// One exercise's record for a person (the compare page opened from a workout's Compare button)
export type LiftStats = { e1rm: number; heaviest: number; best: Best | null; mostReps: number; bestVolume: number; sets: number; sessions: number; last: string | null };
export function liftStats(posts: PostLike[], name: string): LiftStats {
  const st: LiftStats = { e1rm: 0, heaviest: 0, best: null, mostReps: 0, bestVolume: 0, sets: 0, sessions: 0, last: null };
  for (const x of posts) {
    const logs = x.exercises.filter((e) => e.name === name).flatMap((e) => e.log ?? []);
    if (!logs.length) continue;
    st.sessions++;
    if (!st.last || x.at > st.last) st.last = x.at;
    for (const l of logs) {
      st.sets++;
      if (!countsPR(l.type) || l.secs) continue;
      st.heaviest = Math.max(st.heaviest, l.kg);
      st.mostReps = Math.max(st.mostReps, l.reps);
      st.bestVolume = Math.max(st.bestVolume, l.kg * l.reps);
      const v = l.kg > 0 && l.reps > 0 ? e1rm(l.kg, l.reps) : 0;
      if (v > st.e1rm) { st.e1rm = v; st.best = { kg: l.kg, reps: l.reps, e1rm: v }; }
    }
  }
  return st;
}
