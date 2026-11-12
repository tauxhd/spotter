// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { hhmmss, mmss, bests, countsPR, countsVolume, dots, e1rm, fmtResult, gaps, parseResult, setLabels, weightClass } from "./lifting.ts";

test("dots matches published reference values", () => {
  // 90 kg man, 700 kg total ≈ 452.7 DOTS; 60 kg woman, 400 kg total ≈ 444
  assert.ok(Math.abs(dots(700, 90, "M") - 452.7) < 1);
  assert.ok(Math.abs(dots(400, 60, "F") - 444) < 3);
  // lighter lifter with the same total scores higher
  assert.ok(dots(500, 70, "M") > dots(500, 90, "M"));
});

test("e1rm", () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 5) - 114.6) < 0.1);       // Epley 116.7, Brzycki 112.5
  assert.equal(e1rm(100, 20), e1rm(100, 12));           // high reps read as 12s
  // pull-up at 74 kg bodyweight + 10 kg × 5: 1RM is on 84 kg total, reported as added weight
  const b = bests({}, [{ exercises: [{ name: "Pull-up", sets: [{ kg: 10, reps: 5, done: true }, { kg: 0, reps: 10, done: true }] }] }], () => 74);
  // 10 strict bodyweight reps (≈ +24.7 kg) beats +10 kg × 5 (≈ +22.3 kg)
  assert.ok(Math.abs(b["Pull-up"] - (e1rm(74, 10) - 74)) < 0.01);
  assert.ok(e1rm(74, 10) - 74 > e1rm(84, 5) - 74);
});

test("gaps between classes", () => {
  const busy = [{ start: 510, end: 630 }, { start: 660, end: 780 }, { start: 900, end: 1020 }];
  // from 07:00, gym 07:00-22:00: 07:00-08:30, 13:15-15:00, 17:15-22:00 (10:45-11:00 too short)
  assert.deepEqual(gaps(busy, 420, 1320, 420), [
    { start: 420, end: 510 }, { start: 795, end: 900 }, { start: 1035, end: 1320 },
  ]);
});

test("weight classes and result parsing", () => {
  const men = [59, 66, 74, 83, 93, 105, 120];
  assert.equal(weightClass(74, men), "-74");
  assert.equal(weightClass(74.1, men), "-83");
  assert.equal(weightClass(130, men), "120+");
  assert.equal(parseResult("9:45", "time"), 585);
  assert.equal(parseResult("585", "time"), 585);
  assert.equal(parseResult("12.4", "sec"), 12.4);
  assert.equal(parseResult("9:75", "time"), null);
  assert.equal(parseResult("-3", "reps"), null);
  assert.equal(fmtResult(585, "time"), "9:45");
  assert.equal(fmtResult(12, "sec"), "12.0 s");
});
test("set types: numbering, volume and PR rules", () => {
  const short = { warmup: { short: "W" }, failure: { short: "F" }, drop: { short: "D" }, assisted: { short: "A" } };
  assert.deepEqual(setLabels([{ type: "warmup" }, {}, {}, { type: "failure" }, { type: "drop" }, {}], short), ["W", "1", "2", "F", "D", "3"]);
  assert.equal(countsVolume("warmup"), false);
  assert.equal(countsVolume("drop"), true);
  assert.equal(countsPR("assisted"), false);
  assert.equal(countsPR("failure"), true);
  // a heavy assisted set (kg = assistance) must not become a PR
  const b = bests({}, [{ exercises: [{ name: "Pull Up", sets: [{ kg: 40, reps: 8, done: true, type: "assisted" }, { kg: 10, reps: 5, done: true }] }] }]);
  assert.equal(Math.round(b["Pull Up"]), 11);
});
test("timer formatting", () => {
  assert.equal(mmss(0), "0:00");
  assert.equal(mmss(75), "1:15");
  assert.equal(hhmmss(59 * 60 + 5), "59:05");
  assert.equal(hhmmss(3600 + 61), "1:01:01");
});
test("volume: the share of bodyweight a rep moves", async () => {
  const { volumeBodyFor, volumeShare } = await import("./strength.ts");
  const body = volumeBodyFor([{ name: "Pull Up", id: "pull-up" }, { name: "Push Up", id: "push-up" }, { name: "Bench", id: "barbell-bench-press" }], 80);
  assert.equal(body("Pull Up"), 80); // pull-ups / dips: all of it (+ any added kg)
  assert.equal(body("Push Up"), 48); // push-ups: 60%
  assert.equal(body("Bench"), 0); // loaded lifts: just the logged kg
  assert.equal(volumeShare("knee-push-up"), 0.45);
  assert.equal(volumeShare(undefined), 0);
});
