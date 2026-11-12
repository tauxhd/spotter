// Strength standards for every loaded exercise. Each one is tied to squat (S), bench (B), deadlift (D) or bodyweight (BW)
// by a ratio from common strength tables (e.g. incline ≈ 82% of flat bench, OHP ≈ 65%, RDL ≈ 75% of deadlift), so its
// Beginner→Elite levels are the anchor's levels times that ratio. Dumbbells are per dumbbell; cables / machines the stack.
// ponytail: one ratio per exercise from general tables, not measured per gym; good enough to place a lifter roughly.

type Anchor = "S" | "B" | "D" | "BW";

const TABLE = `
B 1 barbell-bench-press
B 0.95 paused-bench-press-barbell reverse-grip-bench-press-barbell
B 0.92 spoto-press larsen-press
B 0.97 wide-grip-bench-press-barbell
B 0.9 floor-press-barbell pin-press close-grip-bench-press
B 1.05 board-press decline-bench-press
B 0.85 close-grip-floor-press smith-incline-press
B 0.82 incline-bench-press
B 0.75 guillotine-press close-grip-incline-bench-press
B 0.5 landmine-press
B 0.4 landmine-squeeze-press barbell-pullover
B 0.7 jm-press pec-deck
B 0.45 skull-crusher skull-crusher-barbell rope-pushdown wide-grip-curl-barbell
B 0.42 incline-skull-crusher-ez-bar preacher-curl drag-curl-barbell preacher-curl-barbell
B 0.5 decline-skull-crusher-ez-bar barbell-curl
B 0.4 overhead-triceps-extension-ez-bar overhead-cable-extension reverse-pec-deck straight-arm-pulldown
B 0.6 california-press
B 0.35 landmine-triceps-extension face-pull
B 0.65 overhead-press
B 0.62 seated-overhead-press-barbell
B 0.85 push-press-barbell
B 0.58 behind-the-neck-press
B 0.55 z-press-barbell bradford-press
B 0.6 viking-press
B 0.45 landmine-shoulder-press upright-row wide-grip-upright-row-barbell cable-curl
B 0.35 sots-press
B 0.25 front-raise-barbell cable-crossover
B 0.15 landmine-lateral-raise
B 0.48 ez-bar-curl close-grip-curl-ez-bar
B 0.38 spider-curl-ez-bar reverse-curl-barbell reverse-curl-ez-bar
B 0.3 landmine-curl
B 0.85 lat-pulldown close-grip-pulldown seated-cable-row machine-row
B 0.55 bar-pushdown
B 0.2 low-to-high-cable-fly high-to-low-cable-fly
B 0.08 cable-lateral-raise
B 1 chest-press-machine
B 0.9 incline-chest-press-machine
B 0.4 dumbbell-bench-press single-arm-bench-press-dumbbell
B 0.35 incline-dumbbell-press dumbbell-pullover
B 0.42 decline-dumbbell-press
B 0.38 low-incline-bench-press-dumbbell neutral-grip-bench-press-dumbbell floor-press-dumbbell alternating-bench-press-dumbbell
B 0.33 reverse-grip-bench-press-dumbbell
B 0.25 squeeze-press-dumbbell incline-squeeze-press-dumbbell
B 0.3 close-grip-press-dumbbell dumbbell-overhead-extension
B 0.2 dumbbell-fly incline-chest-fly-dumbbell decline-chest-fly-dumbbell floor-fly-dumbbell dumbbell-curl alternating-bicep-curl-dumbbell seated-bicep-curl-dumbbell cross-body-hammer-curl-dumbbell
B 0.1 around-the-world-dumbbell lateral-raise
B 0.26 dumbbell-shoulder-press
B 0.25 standing-shoulder-press-dumbbell waiter-curl-dumbbell
B 0.27 single-arm-shoulder-press-dumbbell
B 0.23 arnold-press
B 0.22 z-press-dumbbell clean-and-press-dumbbell hammer-curl
B 0.33 push-press-dumbbell
B 0.09 seated-lateral-raise-dumbbell
B 0.08 lean-away-lateral-raise-dumbbell rear-delt-fly prone-incline-rear-delt-raise-dumbbell scaption-dumbbell triceps-kickback two-arm-kickback-dumbbell
B 0.11 front-raise alternating-front-raise-dumbbell
B 0.18 upright-row-dumbbell
B 0.07 cuban-press-dumbbell
B 0.06 external-rotation-dumbbell incline-y-raise-dumbbell incline-t-raise-dumbbell
B 0.05 lu-raise-dumbbell
B 0.17 incline-dumbbell-curl concentration-curl drag-curl-dumbbell zottman-curl-dumbbell seated-incline-hammer-curl-dumbbell
B 0.15 spider-curl reverse-curl-dumbbell
B 0.16 preacher-curl-dumbbell
B 0.12 single-arm-overhead-extension-dumbbell tate-press-dumbbell lunge-to-press-dumbbell
B 0.14 lying-triceps-extension-dumbbell incline-skull-crusher-dumbbell cross-body-triceps-extension-dumbbell rolling-triceps-extension-dumbbell decline-triceps-extension-dumbbell floor-skull-crusher-dumbbell
B 0.15 man-maker-dumbbell devil-press-dumbbell
D 1 deadlift
D 1.1 rack-pull
D 1.05 block-pull trap-bar-deadlift
D 0.9 deficit-deadlift barbell-shrug
D 0.82 snatch-grip-deadlift
D 0.85 paused-deadlift
D 0.8 jefferson-deadlift
D 1 sumo-deadlift-barbell
D 0.7 behind-the-back-shrug-barbell stiff-leg-deadlift-barbell
D 0.75 romanian-deadlift clean-pull
D 0.65 snatch-grip-romanian-deadlift
D 0.3 single-leg-landmine-romanian-deadlift meadows-row dumbbell-row romanian-deadlift-dumbbell side-bend-barbell
D 0.6 barbell-row t-bar-row hang-clean-dumbbell clean-high-pull snatch-pull
D 0.55 pendlay-row hang-clean
D 0.62 yates-row
D 0.45 seal-row-barbell snatch-grip-high-pull power-snatch hang-snatch sumo-deadlift-dumbbell
D 0.5 landmine-row-two-arm hang-power-clean
D 0.25 bent-over-row-dumbbell gorilla-row-dumbbell
D 0.22 seal-row-dumbbell chest-supported-row
D 0.35 kroc-row-dumbbell shrug-dumbbell deadlift-dumbbell
D 0.15 renegade-row-dumbbell
D 0.2 wide-row-dumbbell single-leg-romanian-deadlift-dumbbell swing-dumbbell kettlebell-swing side-bend-dumbbell
D 0.28 stiff-leg-deadlift-dumbbell
D 0.6 power-clean clean-and-jerk split-jerk
D 0.65 squat-clean
D 0.58 push-jerk
D 0.48 squat-snatch
D 0.42 hang-power-snatch
D 0.5 snatch-balance
D 0.18 snatch-dumbbell
S 1 back-squat
S 0.82 front-squat
S 0.9 paused-squat-barbell standing-calf-raise-barbell
S 0.95 box-squat-barbell
S 0.97 high-bar-squat
S 1.03 low-bar-squat
S 0.8 zercher-squat
S 0.6 overhead-squat seated-calf-raise-barbell hip-abduction
S 0.92 safety-bar-squat
S 0.85 pin-squat
S 0.45 bulgarian-split-squat-barbell walking-lunge-barbell good-morning seated-leg-curl
S 0.5 reverse-lunge-barbell landmine-squat thruster-barbell glute-bridge-dumbbell hip-thrust-dumbbell
S 0.4 step-up-barbell lying-leg-curl sumo-squat-dumbbell
S 0.7 hack-squat-barbell seated-calf-raise
S 1.05 smith-squat
S 1.2 hack-squat glute-bridge-barbell
S 2.2 leg-press
S 0.55 leg-extension
S 1 standing-calf-raise b-stance-hip-thrust-barbell
S 1.3 hip-thrust
S 1.1 kas-glute-bridge-barbell
S 0.35 seated-good-morning goblet-squat calf-raise-dumbbell landmine-thruster
S 0.32 heel-elevated-goblet-squat
S 0.2 goblet-cossack-squat step-up-dumbbell curtsy-lunge-dumbbell
S 0.3 squat-dumbbell frog-pump-dumbbell seated-calf-raise-dumbbell
S 0.25 front-squat-dumbbell split-squat-dumbbell single-leg-hip-thrust-dumbbell single-leg-calf-raise-dumbbell
S 0.22 bulgarian-split-squat walking-lunge reverse-lunge-dumbbell forward-lunge-dumbbell
S 0.18 lateral-lunge-dumbbell thruster-dumbbell
S 0.15 lateral-step-up-dumbbell hamstring-curl-dumbbell
S 0.1 cable-kickback
BW 0.8 cable-crunch
BW 0.2 weighted-crunch-dumbbell weighted-sit-up-dumbbell
BW 0.1 russian-twist-dumbbell
BW 0.12 woodchop-dumbbell
BW 0.25 turkish-get-up-dumbbell
B 0.1 cable-rear-delt-fly
D 0.35 rear-delt-row-barbell
B 0.3 cable-rear-delt-row
BW 0.3 cable-woodchop
BW 0.25 pallof-press-cable
BW 0.6 torso-rotation-machine
B 0.2 kettlebell-windmill
B 0.35 single-arm-lat-pulldown
B 0.85 machine-lat-pulldown
B 0.6 pullover-machine
D 0.6 cable-shrug
D 0.9 machine-shrug smith-machine-shrug
D 1 trap-bar-shrug
B 0.9 iso-lateral-high-row-machine
D 0.55 t-bar-row-machine
B 0.4 single-arm-cable-row
B 0.7 wide-grip-cable-row
D 0.3 kettlebell-row
S 0.6 back-extension-machine hip-adduction-machine
S 0.4 reverse-hyperextension cable-pull-through curtsy-lunge-barbell
S 0.25 good-morning-dumbbell
D 0.4 kettlebell-deadlift
BW 0.35 weighted-back-extension
S 0.12 cable-hip-adduction cable-hip-abduction
B 0.5 machine-rear-delt-row
D 0.35 kettlebell-shrug
S 0.35 cable-good-morning kettlebell-sumo-squat lateral-step-up-barbell
S 1.2 hip-thrust-machine
S 1.3 smith-hip-thrust
S 0.3 glute-kickback-machine
`;

// Pull-ups and dips: the ratio is for total load (body + belt), compared against the anchor's standard.
const LOADED_BW = `
B 1.1 pull-up wide-grip-pull-up commando-pull-up typewriter-pull-up neutral-grip-pull-up
B 1.15 chin-up
B 0.95 towel-pull-up l-sit-pull-up muscle-up
B 0.85 ring-muscle-up archer-pull-up
B 1.35 chest-dip ring-dip
B 1.25 straight-bar-dip
B 1 korean-dip
`;

const parse = (t: string) => {
  const m = new Map<string, [Anchor, number]>();
  for (const line of t.trim().split("\n")) {
    const [a, r, ...ids] = line.trim().split(/\s+/);
    for (const id of ids) m.set(id, [a as Anchor, Number(r)]);
  }
  return m;
};
const RATIOS = parse(TABLE);
const BW_RATIOS = parse(LOADED_BW);

/** Pull-ups, dips etc.: logged kg is added weight, so the 1RM is worked out on bodyweight + added, shown as the added part. */
export const isLoadedBodyweight = (id?: string) => !!id && BW_RATIOS.has(id);
export const ratioIds = () => [...RATIOS.keys(), ...BW_RATIOS.keys()];

/** Volume: the share of your bodyweight one rep moves, on top of any added kg. Pull-ups, dips and the like lift all of it;
 *  push-ups about 60% (less on your knees or hands raised, more with feet raised). Everything else: just the logged kg. */
const PUSH_UP_SHARE: Record<string, number> = { "knee-push-up": 0.45, "incline-push-up": 0.4, "decline-push-up": 0.7 };
export const volumeShare = (id?: string) => (!id ? 0 : BW_RATIOS.has(id) ? 1 : /push-up$/.test(id) ? PUSH_UP_SHARE[id] ?? 0.6 : 0);
/** For sessionVolume() / summarize(): kg of bodyweight a rep of this exercise moves. */
export function volumeBodyFor(library: { name: string; id: string }[], bw: number) {
  const ids = new Map(library.map((e) => [e.name, e.id]));
  return (name: string) => bw * volumeShare(ids.get(name));
}

/** For bests() / summarize(): bodyweight to add for pull-ups, dips etc., 0 for everything else. */
export function bodyFor(library: { name: string; id: string }[], bw: number) {
  const ids = new Map(library.map((e) => [e.name, e.id]));
  return (name: string) => (isLoadedBodyweight(ids.get(name)) ? bw : 0);
}

// 1RM as a multiple of bodyweight for Beginner, Novice, Intermediate, Advanced, Elite (common strength-standard tables).
const STD: Record<"M" | "F", Record<Anchor, number[]>> = {
  M: { S: [0.75, 1.25, 1.5, 2.25, 2.75], B: [0.5, 0.75, 1, 1.5, 2], D: [1, 1.5, 2, 2.5, 3], BW: [0.25, 0.5, 0.75, 1, 1.25] },
  F: { S: [0.5, 0.75, 1.25, 1.5, 2], B: [0.25, 0.5, 0.75, 1, 1.5], D: [0.5, 1, 1.25, 1.75, 2.5], BW: [0.15, 0.3, 0.5, 0.75, 1] },
};
export const LEVELS = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"] as const;
const PCT = [5, 20, 50, 80, 95]; // rough share of lifters below each standard

/** Where a 1RM sits: level name, position along the Beginner→Elite bar (0–1), rough percentile. Null if no standard. */
export function strengthLevel(id: string, oneRm: number, bw: number, sex: "M" | "F") {
  const loaded = BW_RATIOS.get(id);
  const r = loaded ?? RATIOS.get(id);
  if (!r || !(bw > 0) || !(oneRm >= 0)) return null;
  const load = loaded ? oneRm + bw : oneRm;
  const t = STD[sex][r[0]].map((m) => m * bw * r[1]);
  const i = t.findLastIndex((x) => load >= x); // -1 = under Beginner
  const frac = i < 0 ? load / t[0] : i === 4 ? 0 : (load - t[i]) / (t[i + 1] - t[i]);
  const pos = i < 0 ? 0 : i === 4 ? 1 : (i + frac) / 4;
  const pct = i < 0 ? PCT[0] * frac : i === 4 ? Math.min(99, PCT[4] + (4 * (load - t[4])) / (t[4] - t[3])) : PCT[i] + (PCT[i + 1] - PCT[i]) * frac;
  // kg each tier starts at, as logged (added weight for pull-ups / dips), rounded up to a 2.5 kg plate jump
  const tiers = t.map((x) => Math.max(0, Math.ceil((x - (loaded ? bw : 0)) / 2.5) * 2.5));
  return { level: LEVELS[Math.max(0, i)], pos, pct: Math.max(1, Math.round(pct)), tiers };
}
