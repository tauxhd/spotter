// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadedBodyweightIds } from "./strength.ts";

test("loaded bodyweight ids are real exercises", () => {
  const lib: { id: string }[] = JSON.parse(readFileSync(new URL("../../supabase/exercises.json", import.meta.url), "utf8"));
  const ids = new Set(lib.map((e) => e.id));
  assert.deepEqual(loadedBodyweightIds().filter((id) => !ids.has(id)), []);
});
