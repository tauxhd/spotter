import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, parseDate, readHevy } from "./hevy.ts";

const CSV = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push day","Nov 12, 2026, 9:17 PM","Nov 12, 2026, 10:06 PM","felt ""strong""","Bench Press (Barbell)","","",0,"warmup",20,10,,,
"Push day","Nov 12, 2026, 9:17 PM","Nov 12, 2026, 10:06 PM","felt ""strong""","Bench Press (Barbell)","","",1,"normal",100,5,,,
"Push day","Nov 12, 2026, 9:17 PM","Nov 12, 2026, 10:06 PM","felt ""strong""","Butterfly (Pec Deck)","0","",0,"normal",50,12,,,
"Push day","Nov 12, 2026, 9:17 PM","Nov 12, 2026, 10:06 PM","felt ""strong""","Plank","0","",0,"normal",,,,60,
"Legs","10 Nov 2026, 18:00","10 Nov 2026, 19:00","","Mystery Machine","","",0,"dropset",30,8,,,
`;
const library = [
  { id: "barbell-bench-press", name: "Bench Press (Barbell)", muscle: "chest", equipment: "barbell", secondary: [] },
  { id: "pec-deck", name: "Pec Deck (Machine Fly)", muscle: "chest", equipment: "machine", secondary: [] },
  { id: "plank", name: "Plank", muscle: "abs", equipment: "bodyweight", secondary: [] },
] as never;

test("Hevy dates in both orders, 12-hour clock", () => {
  assert.equal(parseDate("Nov 12, 2026, 9:17 PM")?.getHours(), 21);
  assert.equal(parseDate("12 Nov 2026, 00:05")?.getDate(), 12);
  assert.equal(parseDate("Nov 1, 2026, 12:30 AM")?.getHours(), 0);
});

test("reads workouts, set types, supersets, timed sets and quoted text", () => {
  const ws = readHevy(CSV);
  assert.deepEqual(ws.map((w) => w.title), ["Legs", "Push day"]);
  const push = ws[1];
  assert.equal(push.note, 'felt "strong"');
  assert.deepEqual(push.exercises.map((e) => `${e.name}:${e.sets.length}:${e.superset ?? "-"}`), ["Bench Press (Barbell):2:-", "Butterfly (Pec Deck):1:0", "Plank:1:0"]);
  assert.deepEqual(push.exercises[0].sets[0], { kg: 20, reps: 10, type: "warmup" });
  assert.deepEqual(push.exercises[2].sets[0], { kg: 0, reps: 0, secs: 60 });
});

test("converts to Spotter: names mapped, PRs in order, unknown exercises kept", () => {
  const { items, lifts, unmatched } = convert(readHevy(CSV), library, { squat: 0, bench: 0, deadlift: 0, bw: 70 });
  assert.equal(items.length, 2);
  const push = items[1];
  assert.deepEqual(push.workout.exercises.map((e) => e.name), ["Bench Press (Barbell)", "Pec Deck (Machine Fly)", "Plank"]);
  assert.ok(push.post.prs.includes("Bench Press (Barbell)"));
  assert.equal(push.post.duration_min, 49);
  assert.equal(lifts.bench, 100);
  assert.deepEqual(unmatched, ["Mystery Machine"]);
});

test("Hevy API workouts read the same as the CSV", async () => {
  const { fromApi } = await import("./hevy.ts");
  const [w] = fromApi([{ title: "Push day", description: null, start_time: "2026-11-12T13:17:00Z", end_time: "2026-11-12T14:06:00Z",
    exercises: [{ title: "Bench Press (Barbell)", superset_id: null, sets: [{ type: "warmup", weight_kg: 20, reps: 10 }, { type: "normal", weight_kg: 100, reps: 5 }] },
      { title: "Plank", superset_id: 0, sets: [{ type: "normal", weight_kg: null, reps: null, duration_seconds: 60 }] }] }]);
  assert.deepEqual(w.exercises.map((e) => `${e.name}:${e.superset ?? "-"}`), ["Bench Press (Barbell):-", "Plank:0"]);
  assert.deepEqual(w.exercises[0].sets[0], { kg: 20, reps: 10, type: "warmup" });
  assert.deepEqual(w.exercises[1].sets[0], { kg: 0, reps: 0, secs: 60 });
  assert.equal(w.note, "");
});
