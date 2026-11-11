// Estimated 1RM for every loaded exercise in the library, from the student's squat / bench / deadlift (or bodyweight).
// Ratios come from common strength-standard tables (e.g. incline ≈ 82% of flat bench, OHP ≈ 65%, RDL ≈ 75% of deadlift).
// Dumbbell numbers are per dumbbell; cable / machine numbers are the stack. Bodyweight lifts (pull-ups, dips) give the
// total load, and the 1RM is shown as weight added on top of bodyweight.
// ponytail: one ratio per exercise, not per person; logged sets replace the estimate as soon as there are any.

type Anchor = "S" | "B" | "D" | "BW";
export type Anchors = { squat: number; bench: number; deadlift: number; bw: number; sex: "M" | "F" };

// "anchor ratio id id id…"
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
`;

// Bodyweight lifts you can load with a belt: estimate is total load (body + plates), shown as the added part.
const LOADED_BW = `
B 1.1 pull-up wide-grip-pull-up commando-pull-up typewriter-pull-up
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

/** True for pull-ups, dips etc.: logged kg is added weight, 1RM is shown as "+x kg". */
export const isLoadedBodyweight = (id?: string) => !!id && BW_RATIOS.has(id);

// No lifts entered yet: typical intermediate standards from bodyweight.
function anchorKg(a: Anchor, x: Anchors) {
  const std = x.sex === "F" ? { S: 0.9, B: 0.55, D: 1.1 } : { S: 1.25, B: 0.9, D: 1.5 };
  if (a === "BW") return x.bw;
  const own = a === "S" ? x.squat : a === "B" ? x.bench : x.deadlift;
  return own > 0 ? own : std[a] * x.bw;
}

// Round to what you could actually load: 2.5 kg plates for heavy lifts, 1 kg for small dumbbells / stacks.
const roundLoad = (kg: number) => (kg >= 20 ? Math.round(kg / 2.5) * 2.5 : Math.round(kg));

/** Estimated 1RM in kg (added weight for loaded bodyweight lifts), or null for holds, cardio and pure bodyweight moves. */
export function estimate1rm(id: string | undefined, x: Anchors): number | null {
  if (!id) return null;
  const bw = BW_RATIOS.get(id);
  if (bw) return Math.max(0, roundLoad(anchorKg(bw[0], x) * bw[1] - x.bw));
  const r = RATIOS.get(id);
  return r ? roundLoad(anchorKg(r[0], x) * r[1]) : null;
}

/** For bests() / summarize(): bodyweight to add for pull-ups, dips etc., 0 for everything else. */
export function bodyFor(library: { name: string; id: string }[], bw: number) {
  const ids = new Map(library.map((e) => [e.name, e.id]));
  return (name: string) => (isLoadedBodyweight(ids.get(name)) ? bw : 0);
}

export const ratioIds =() => [...RATIOS.keys(), ...BW_RATIOS.keys()];
