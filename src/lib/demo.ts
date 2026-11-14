// The demo account behind the landing page's phone preview (/?demo=1): a made-up student with ~8 weeks of random but
// believable training, meals and weigh-ins. Lives only in the browser tab; nothing is read from or written to anyone's data.
import { foods, type ExerciseLog } from "./data";
import type { FoodEntry, Profile, Routine, Session, WeightEntry } from "./store";

const pickOne = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
const jitter = (n: number, by: number) => n + (Math.random() * 2 - 1) * by;
const round = (kg: number) => Math.round(kg / 2.5) * 2.5;
const iso = (daysAgo: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
};

// exercise, starting top-set kg (8 weeks ago), weekly gain, reps
const DAYS: { title: string; lifts: [string, number, number, number][] }[] = [
  { title: "Push", lifts: [["Bench Press (Barbell)", 60, 1.25, 6], ["Incline Bench Press (Dumbbell)", 20, 0.6, 10], ["Shoulder Press (Dumbbell)", 16, 0.5, 10], ["Cable Crossover", 12, 0.4, 12], ["Chest Dip", 0, 0, 10]] },
  { title: "Pull", lifts: [["Deadlift (Barbell)", 110, 2.5, 5], ["Pull Up", 0, 0, 8], ["Seated Cable Row", 50, 1.25, 10], ["Lat Pulldown (Cable)", 50, 1, 10], ["Bicep Curl (Dumbbell)", 12, 0.3, 12]] },
  { title: "Legs", lifts: [["Squat (Barbell)", 80, 2, 5], ["Romanian Deadlift (Barbell)", 70, 1.5, 8], ["Leg Press (Machine)", 140, 3, 10], ["Leg Extension (Machine)", 40, 1, 12], ["Standing Calf Raise (Machine)", 50, 1, 15]] },
];

function workout(day: (typeof DAYS)[number], weeksAgo: number): ExerciseLog[] {
  return day.lifts.map(([name, kg, gain, reps]) => {
    const top = round(Math.max(0, kg + gain * (8 - weeksAgo)));
    return { name, sets: [0.9, 1, 1].map((k) => ({ kg: round(top * k), reps: Math.max(1, Math.round(jitter(reps, 1))), done: true })) };
  });
}

export function demoAccount() {
  const sessions: Session[] = [];
  for (let d = 56; d >= 1; d--) {
    if (![1, 3, 5].includes(d % 7)) continue; // three days a week
    const day = DAYS[sessions.length % 3];
    sessions.unshift({ id: `demo-w${d}`, at: iso(d, 17), title: day.title, exercises: workout(day, Math.floor(d / 7)) });
  }
  const food: FoodEntry[] = [];
  for (let d = 13; d >= 0; d--) {
    for (const hour of d === 0 ? [9, 13] : [9, 13, 19]) {
      const f = pickOne(foods);
      food.push({ id: `demo-f${d}-${hour}`, name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, at: iso(d, hour) });
    }
  }
  const weights: WeightEntry[] = Array.from({ length: 20 }, (_, i) => ({ id: `demo-kg${i}`, kg: Math.round(jitter(75 - i * 0.15, 0.3) * 10) / 10, at: iso(57 - i * 3, 8) }));
  // after-lunch weigh-ins on the same days: ~0.7 kg heavier (the meal), drawn as their own line
  weights.push(...weights.map((w, i) => ({ id: `demo-fed${i}`, kg: Math.round(jitter(w.kg + 0.7, 0.2) * 10) / 10, at: iso(57 - i * 3, 14), fed: true })));
  const best = (name: string) => Math.max(...sessions.flatMap((s) => s.exercises.filter((e) => e.name === name).flatMap((e) => e.sets.map((x) => x.kg))));
  const me: Profile = {
    id: "demo", name: pickOne(["Aiden Lim", "Hafiz Rahman", "Ravi Kumar", "Daniel Tan", "Jason Wong"]), faculty: "Computing", sex: "M", bw: weights[19].kg,
    squat: best("Squat (Barbell)"), bench: best("Bench Press (Barbell)"), deadlift: best("Deadlift (Barbell)"), intake: null,
    avatar_url: null, tp: null, course: "BSc (Hons) Computer Science", bio: "Demo account: everything here is made up.", unit: "kg",
    height: 176, age: 21, goal: "cut", activity: 1.55, goal_bw: 72,
  };
  const routines: Routine[] = DAYS.map((d) => ({ id: `demo-r-${d.title}`, name: `${d.title} day`, exercises: workout(d, 0) }));
  return { me, sessions, food, weights, routines };
}
