// Diet maths behind Eat (shared by the website and the phone app): maintenance calories, daily targets from your goal,
// and the weight trend. Maintenance starts from the Mifflin-St Jeor formula; once there are two weeks of food logs and
// weigh-ins it leans on your own data instead: average intake minus the energy in the trend-weight change.
import type { Sex } from "./data";

export type Goal = "lean-bulk" | "cut" | "fat-loss" | "recomp" | "maintain";
// kcal = multiplier on maintenance; p / f = grams per kg of bodyweight (carbs fill the rest)
export const goals: Record<Goal, { label: string; hint: string; kcal: number; p: number; f: number }> = {
  "lean-bulk": { label: "Lean bulk", hint: "Gain muscle with minimal fat gain", kcal: 1.08, p: 2, f: 0.9 },
  cut: { label: "Cut for trained lifters", hint: "Lose fat with higher protein to protect muscle", kcal: 0.78, p: 2.4, f: 0.7 },
  "fat-loss": { label: "General fat loss", hint: "Lose body fat at a sustainable pace", kcal: 0.85, p: 2, f: 0.8 },
  recomp: { label: "Recomposition", hint: "Build muscle while gradually losing fat", kcal: 0.95, p: 2.2, f: 0.8 },
  maintain: { label: "Maintain", hint: "Maintain your current body weight", kcal: 1, p: 1.8, f: 0.9 },
};
export const activities = [
  { v: 1.375, label: "Light", hint: "1–3 sessions a week, desk days" },
  { v: 1.55, label: "Moderate", hint: "3–5 sessions a week" },
  { v: 1.725, label: "High", hint: "6+ sessions or an active job" },
];

export type Body = { sex: Sex; bw: number; height?: number | null; age?: number | null; activity?: number | null; goal?: string | null; goal_bw?: number | null };
type Food = { kcal: number; at: string };
type Weight = { kg: number; at: string };

export const DAY = 864e5;
const KCAL_PER_KG = 7700; // energy in a kg of body-weight change
export const dayOf = (t: number | string) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const round = (v: number, to: number) => Math.round(v / to) * to;

export const bodyOf = (b: Body) => ({
  height: b.height ?? (b.sex === "F" ? 160 : 172), age: b.age ?? 21, activity: b.activity ?? 1.55,
  goal: (b.goal && b.goal in goals ? b.goal : "lean-bulk") as Goal,
});

export function formulaTdee(b: Body) {
  const { height, age, activity } = bodyOf(b);
  return round((10 * b.bw + 6.25 * height - 5 * age + (b.sex === "M" ? 5 : -161)) * activity, 10);
}

// Calories per day (days with anything logged), oldest first.
export function dailyIntake(food: Food[]) {
  const m = new Map<number, number>();
  for (const f of food) m.set(dayOf(f.at), (m.get(dayOf(f.at)) ?? 0) + f.kcal);
  return [...m].map(([day, kcal]) => ({ day, kcal })).sort((a, b) => a.day - b.day);
}

// One weigh-in per day (the latest), each with its 7-day moving average: the trend that hides water-weight noise.
export function weightTrend(weights: Weight[]) {
  const m = new Map<number, number>();
  for (const w of [...weights].sort((a, b) => +new Date(a.at) - +new Date(b.at))) m.set(dayOf(w.at), w.kg);
  const days = [...m].sort((a, b) => a[0] - b[0]);
  return days.map(([day, kg]) => {
    const win = days.filter(([d]) => d > day - 7 * DAY && d <= day);
    return { day, kg, trend: win.reduce((s, [, k]) => s + k, 0) / win.length };
  });
}

// Maintenance from the 28 days before `end` (today is still being eaten, so it never counts).
export function maintenance(b: Body, food: Food[], weights: Weight[], end: number) {
  const formula = formulaTdee(b);
  const intake = dailyIntake(food).filter((d) => d.day >= end - 28 * DAY && d.day < end);
  const trend = weightTrend(weights).filter((w) => w.day >= end - 28 * DAY && w.day < end);
  if (intake.length < 14 || trend.length < 2) return { kcal: formula, adaptive: false, days: intake.length };
  const avg = intake.reduce((s, d) => s + d.kcal, 0) / intake.length;
  const a = trend[0], z = trend.at(-1)!;
  const own = avg - ((z.trend - a.trend) * KCAL_PER_KG) / Math.max(7, (z.day - a.day) / DAY);
  const trust = Math.min(1, intake.length / 21); // three weeks of logs and it's all your own data
  return { kcal: round(Math.min(5000, Math.max(1200, own * trust + formula * (1 - trust))), 10), adaptive: true, days: intake.length };
}

export function targetsFor(b: Body, tdee: number) {
  const g = goals[bodyOf(b).goal];
  const kcal = round(tdee * g.kcal, 50), p = Math.round(b.bw * g.p), f = Math.round(b.bw * g.f);
  return { kcal, p, f, c: Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4)) };
}

// Everything the Eat tab shows, as of `now`.
export function nutrition(b: Body, food: Food[], weights: Weight[], now = Date.now()) {
  const today = dayOf(now);
  const m = maintenance(b, food, weights, today);
  const trend = weightTrend(weights);
  const week = dailyIntake(food).filter((d) => d.day >= today - 7 * DAY && d.day < today);
  const avg = week.length ? Math.round(week.reduce((s, d) => s + d.kcal, 0) / week.length) : null;
  const current = trend.at(-1)?.trend ?? b.bw;
  const start = trend[0]?.trend ?? b.bw, goalBw = b.goal_bw ?? null;
  return {
    goal: bodyOf(b).goal, ...m, prev: maintenance(b, food, weights, today - 7 * DAY).kcal,
    targets: targetsFor(b, m.kcal), trend, current,
    weekAvg: avg, balance: avg === null ? null : avg - m.kcal,
    goalBw, progress: goalBw === null || goalBw === start ? null : Math.max(0, Math.min(1, (current - start) / (goalBw - start))),
  };
}

// Maintenance at the start of each of the last `weeks` weeks, for the step line on the intake chart.
export function maintenanceSteps(b: Body, food: Food[], weights: Weight[], days: number, now = Date.now()) {
  const today = dayOf(now), out: { day: number; kcal: number }[] = [];
  for (let d = today - days * DAY; d <= today; d += 7 * DAY) out.push({ day: d, kcal: maintenance(b, food, weights, d).kcal });
  return out;
}

// --- self-check: `npx tsx src/lib/nutrition.ts` ---
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("nutrition.ts")) {
  const t0 = dayOf(Date.now()), at = (d: number) => new Date(t0 - d * DAY + 9 * 36e5).toISOString();
  const me: Body = { sex: "M", bw: 80, height: 180, age: 25, activity: 1.55 };
  console.assert(formulaTdee(me) === 2800, "formula", formulaTdee(me)); // (800 + 1125 - 125 + 5) * 1.55, to the nearest 10
  // 28 days at 2500 kcal while gaining 0.5 kg -> maintenance ~ 2500 - 0.5 * 7700 / 27
  const food = Array.from({ length: 28 }, (_, i) => ({ kcal: 2500, at: at(i + 1) }));
  const weights = Array.from({ length: 28 }, (_, i) => ({ kg: 80 + (0.5 * (27 - i)) / 27, at: at(i + 1) }));
  const n = nutrition(me, food, weights);
  console.assert(n.adaptive && Math.abs(n.kcal - 2400) < 60, "adaptive", n.kcal);
  console.assert(n.targets.kcal === Math.round((n.kcal * 1.08) / 50) * 50 && n.targets.p === 160, "targets", n.targets);
  console.assert(!nutrition(me, [], []).adaptive, "formula fallback");
  console.log("nutrition ok", n.kcal, n.targets);
}
