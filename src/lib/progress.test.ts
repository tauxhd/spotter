import { test } from "node:test";
import assert from "node:assert/strict";
import { bestLifts, buckets, change, sharedLifts, trainedDays } from "./progress.ts";

const post = (at: string, volume: number, log: { kg: number; reps: number; type?: "warmup" }[] = [], name = "Bench Press (Barbell)") =>
  ({ at, volume, duration: 60, prs: [], exercises: [{ name, log }] });

test("monthly buckets end with the current month and add up each month", () => {
  const posts = [post("2026-10-03T10:00:00", 1000), post("2026-10-20T10:00:00", 500), post("2026-11-02T10:00:00", 800)];
  const b = buckets(posts, "month", new Date("2026-11-13T12:00:00"));
  assert.equal(b.length, 12);
  assert.equal(b[11].long, "November 2026");
  assert.deepEqual([b[10].workouts, b[10].volume, b[11].workouts], [2, 1500, 1]);
  assert.equal(change(b[11].workouts, b[10].workouts), -50);
  assert.equal(change(3, 0), null);
});

test("years go back to the first workout", () => {
  assert.deepEqual(buckets([post("2024-05-01T10:00:00", 1)], "year", new Date("2026-11-13T12:00:00")).map((x) => x.label), ["2024", "2025", "2026"]);
});

test("days trained in a month", () => {
  const d = trainedDays([post("2026-11-02T10:00:00", 1), post("2026-11-02T18:00:00", 1), post("2026-10-02T10:00:00", 1)], 2026, 10);
  assert.deepEqual([...d], [[2, 2]]);
});

test("best lifts skip warm-ups and only shared exercises are compared", () => {
  const a = bestLifts([post("2026-11-01T10:00:00", 0, [{ kg: 200, reps: 1, type: "warmup" }, { kg: 100, reps: 5 }])]);
  const b = bestLifts([post("2026-11-01T10:00:00", 0, [{ kg: 90, reps: 3 }]), post("2026-11-01T10:00:00", 0, [{ kg: 50, reps: 5 }], "Squat (Barbell)")]);
  assert.equal(a["Bench Press (Barbell)"].kg, 100);
  assert.deepEqual(sharedLifts(a, b).map((x) => x.name), ["Bench Press (Barbell)"]);
});
