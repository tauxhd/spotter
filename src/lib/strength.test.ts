// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadedBodyweightIds } from "./strength.ts";
import { addSets } from "./data.ts";

test("muscle split: main muscle full sets, other areas half", () => {
  const m = addSets({}, { muscle: "chest", secondary: ["triceps", "shoulders"] }, 4);
  assert.deepEqual(m, { Chest: 4, Arms: 2, Shoulders: 2 });
  addSets(m, { muscle: "triceps", secondary: ["chest", "forearms"] }, 2); // forearms is also Arms: counted once, not on top of the main
  assert.deepEqual(m, { Chest: 5, Arms: 4, Shoulders: 2 });
});

test("loaded bodyweight ids are real exercises", () => {
  const lib: { id: string }[] = JSON.parse(readFileSync(new URL("../../supabase/exercises.json", import.meta.url), "utf8"));
  const ids = new Set(lib.map((e) => e.id));
  assert.deepEqual(loadedBodyweightIds().filter((id) => !ids.has(id)), []);
});
