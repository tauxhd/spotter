import { test } from "node:test";
import assert from "node:assert/strict";
import { setSuperset } from "./workout.ts";

const ex = (name: string, superset?: number) => ({ name, sets: [], ...(superset !== undefined ? { superset } : {}) });
const shape = (xs: { name: string; superset?: number }[]) => xs.map((x) => x.name + (x.superset !== undefined ? `:${x.superset}` : "")).join(" ");

test("picked exercises become one superset and move together", () => {
  assert.equal(shape(setSuperset([ex("A"), ex("B"), ex("C"), ex("D")], 0, [2, 3], 7)), "A:7 C:7 D:7 B");
});
test("two supersets keep their own ids; taking the last partner dissolves the old group", () => {
  const w = [ex("A", 1), ex("B", 1), ex("C"), ex("D")];
  assert.equal(shape(setSuperset(w, 2, [3], 9)), "A:1 B:1 C:9 D:9");
  assert.equal(shape(setSuperset(w, 2, [1], 9)), "A B:9 C:9 D");
});
test("unticking everything removes the superset", () => {
  assert.equal(shape(setSuperset([ex("A", 1), ex("B", 1), ex("C")], 0, [])), "A B C");
});

test("warm-ups climb from the empty bar to ~80%, never reaching the working weight", async () => {
  const { warmups } = await import("./workout.ts");
  assert.deepEqual(warmups(100).map((s) => `${s.kg}x${s.reps}`), ["20x10", "40x5", "60x3", "80x2"]);
  assert.deepEqual(warmups(40).map((s) => s.kg), [20, 22.5, 30]);
  assert.deepEqual(warmups(20), []);
});
