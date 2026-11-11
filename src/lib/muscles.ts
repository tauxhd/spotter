// The library only tags "back" / "abs" / "shoulders", so finer groups are picked out by exercise id.
export const LATS = /pull-up|chin-up|pulldown|pullover|muscle-up|lever|skin-the-cat|dead-hang/;
export const LOWER_BACK = /^deadlift$|deadlift-dumbbell|deficit-deadlift|paused-deadlift|snatch-grip-deadlift|rack-pull|block-pull|jefferson|back-extension|good-morning|superman|reverse-hyper|kettlebell-deadlift|pull-through/;
export const TRAPS = /shrug|upright-row|high-pull/;
export const REAR_DELTS = /rear-delt|reverse-pec-deck|face-pull|y-raise|t-raise|pull-apart|snow-angel|face-pull/;
export const OBLIQUES = /twist|side-bend|side-plank|woodchop|windshield|landmine-180|bicycle|anti-rotation|copenhagen|human-flag|pallof|oblique|torso-rotation|windmill/;
export const ADDUCTORS = /adduction|adductor|copenhagen|cossack|lateral-lunge|sumo-squat|sumo-deadlift/;
export const ABDUCTORS = /hip-abduction|clamshell|side-lying-leg-raise|lateral-walk|fire-hydrant|curtsy-lunge|lateral-step-up|lateral-shuffle/;

// Exercise picker filters (website + phone app): muscle groups by tag or by exercise id, and equipment families.
type Ex = { id: string; muscle: string; equipment: string };
export const pickerGroups: [string, (e: Ex) => boolean][] = [
  ["all", () => true],
  ["chest", (e) => e.muscle === "chest" && !LATS.test(e.id)],
  ["shoulders", (e) => e.muscle === "shoulders" && !REAR_DELTS.test(e.id) && !TRAPS.test(e.id)],
  ["rear delts", (e) => REAR_DELTS.test(e.id)],
  ["biceps", (e) => e.muscle === "biceps"], ["triceps", (e) => e.muscle === "triceps"], ["forearms", (e) => e.muscle === "forearms"],
  ["abs", (e) => e.muscle === "abs" && !OBLIQUES.test(e.id)], ["obliques", (e) => OBLIQUES.test(e.id)],
  ["lats", (e) => LATS.test(e.id)], ["traps", (e) => TRAPS.test(e.id)],
  ["upper back", (e) => e.muscle === "back" && !LATS.test(e.id) && !LOWER_BACK.test(e.id) && !TRAPS.test(e.id) && !REAR_DELTS.test(e.id)],
  ["lower back", (e) => LOWER_BACK.test(e.id)],
  ["glutes", (e) => e.muscle === "glutes"],
  ["adductors", (e) => ADDUCTORS.test(e.id)], ["abductors", (e) => ABDUCTORS.test(e.id)], ["quads", (e) => e.muscle === "quads"], ["hamstrings", (e) => e.muscle === "hamstrings"],
  ["calves", (e) => e.muscle === "calves"], ["full body", (e) => e.muscle === "full body"], ["cardio", (e) => e.muscle === "cardio"],
];
export const kit = [["any", "Any equipment"], ["dumbbell", "Dumbbell"], ["barbell", "Barbell"], ["bodyweight", "Bodyweight"], ["cable", "Cable"], ["machine", "Machine"], ["other", "Other"]] as const;
// barbell family = barbell + EZ bar + Smith; bodyweight family = bodyweight + rings; other = kettlebell, cardio, misc
export const family = (e: string) => (["barbell", "ez-bar", "smith"].includes(e) ? "barbell" : ["bodyweight", "rings"].includes(e) ? "bodyweight" : ["dumbbell", "cable", "machine"].includes(e) ? e : "other");

// Finer split for the workout tally and 3D body: back → traps / lats / lower back / upper back (rhomboids, rear shoulder
// blade), shrug-type shoulder work → traps, abs → obliques for twisting / side work.
export function muscleFor(m: string, id = "") {
  if ((m === "back" || m === "shoulders") && TRAPS.test(id)) return "traps";
  if (m === "back") return LATS.test(id) ? "lats" : LOWER_BACK.test(id) ? "lower back" : "upper back";
  if (m === "abs" && OBLIQUES.test(id)) return "obliques";
  return m;
}
