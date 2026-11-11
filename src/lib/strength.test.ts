// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ratioIds, strengthLevel } from "./strength.ts";
import { addSets } from "./data.ts";
import { muscleFor } from "./muscles.ts";

test("every strength ratio points at a real exercise, once", () => {
  const lib: { id: string }[] = JSON.parse(readFileSync(new URL("../../supabase/exercises.json", import.meta.url), "utf8"));
  const ids = new Set(lib.map((e) => e.id));
  const all = ratioIds();
  assert.deepEqual(all.filter((id) => !ids.has(id)), []);
  assert.equal(new Set(all).size, all.length);
});

test("strength level", () => {
  // 74 kg man, bench thresholds 37 / 55.5 / 74 / 111 / 148 kg
  const b = strengthLevel("barbell-bench-press", 88.8, 74, "M")!;
  assert.equal(b.level, "Intermediate");
  assert.ok(Math.abs(b.pos - 0.6) < 0.01);
  assert.equal(b.pct, 62);
  assert.deepEqual(b.tiers, [37.5, 57.5, 75, 112.5, 150]);
  assert.equal(strengthLevel("barbell-bench-press", 20, 74, "M")!.level, "Beginner");
  assert.equal(strengthLevel("barbell-bench-press", 200, 74, "M")!.pos, 1);
  // pull-up: +0 kg at 74 kg = 74 kg total vs 1.1 × bench standards → Intermediate-ish
  assert.equal(strengthLevel("pull-up", 0, 74, "M")!.level, "Novice");
  assert.equal(strengthLevel("plank", 50, 74, "M"), null);
});

test("finer muscle parts for the workout tally / 3D body", () => {
  assert.equal(muscleFor("back", "barbell-shrug"), "traps");
  assert.equal(muscleFor("shoulders", "upright-row"), "traps");
  assert.equal(muscleFor("shoulders", "overhead-press"), "shoulders");
  assert.equal(muscleFor("back", "lat-pulldown"), "lats");
  assert.equal(muscleFor("back", "deadlift"), "lower back");
  assert.equal(muscleFor("back", "seated-cable-row"), "upper back");
  assert.equal(muscleFor("abs", "russian-twist"), "obliques");
  assert.equal(muscleFor("abs", "crunch"), "abs");
  assert.equal(muscleFor("chest", "bench-press"), "chest");
});

test("muscle split: main muscle full sets, other areas half", () => {
  const m = addSets({}, { muscle: "chest", secondary: ["triceps", "shoulders"] }, 4);
  assert.deepEqual(m, { Chest: 4, Arms: 2, Shoulders: 2 });
  addSets(m, { muscle: "triceps", secondary: ["chest", "forearms"] }, 2); // forearms is also Arms: not on top of the main
  assert.deepEqual(m, { Chest: 5, Arms: 4, Shoulders: 2 });
});
