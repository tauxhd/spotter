// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estimate1rm, ratioIds } from "./strength.ts";

const lib: { id: string }[] = JSON.parse(readFileSync(new URL("../../supabase/exercises.json", import.meta.url), "utf8"));

test("every ratio points at a real exercise, once", () => {
  const ids = new Set(lib.map((e) => e.id));
  const all = ratioIds();
  assert.deepEqual(all.filter((id) => !ids.has(id)), []);
  assert.equal(new Set(all).size, all.length);
});

test("estimates are realistic", () => {
  const me = { squat: 157.5, bench: 97.5, deadlift: 175, bw: 74, sex: "M" as const };
  assert.equal(estimate1rm("barbell-bench-press", me), 97.5);
  assert.equal(estimate1rm("incline-bench-press", me), 80);       // 82% of bench
  assert.equal(estimate1rm("overhead-press", me), 62.5);          // 65% of bench
  assert.equal(estimate1rm("dumbbell-bench-press", me), 40);      // per dumbbell
  assert.equal(estimate1rm("pull-up", me), 32.5);                 // added on top of 74 kg
  assert.equal(estimate1rm("plank", me), null);                   // holds have no 1RM
  // no lifts entered: falls back to bodyweight standards
  assert.equal(estimate1rm("back-squat", { squat: 0, bench: 0, deadlift: 0, bw: 80, sex: "M" }), 100);
});
