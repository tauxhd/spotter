// The library only tags "back" / "abs" / "shoulders", so finer groups are picked out by exercise id.
export const LATS = /pull-up|chin-up|pulldown|pullover|muscle-up|lever|skin-the-cat|dead-hang/;
export const LOWER_BACK = /^deadlift$|deadlift-dumbbell|deficit-deadlift|paused-deadlift|snatch-grip-deadlift|rack-pull|block-pull|jefferson|back-extension|good-morning|superman|reverse-hyper|kettlebell-deadlift|pull-through/;
export const TRAPS = /shrug|upright-row|high-pull/;
export const REAR_DELTS = /rear-delt|reverse-pec-deck|face-pull|y-raise|t-raise|pull-apart|snow-angel|face-pull/;
export const OBLIQUES = /twist|side-bend|side-plank|woodchop|windshield|landmine-180|bicycle|anti-rotation|copenhagen|human-flag|pallof|oblique|torso-rotation|windmill/;
export const ADDUCTORS = /adduction|adductor|copenhagen|cossack|lateral-lunge|sumo-squat|sumo-deadlift/;
export const ABDUCTORS = /hip-abduction|clamshell|side-lying-leg-raise|lateral-walk|fire-hydrant|curtsy-lunge|lateral-step-up|lateral-shuffle/;

// Finer split for the workout tally and 3D body: back → traps / lats / lower back / upper back (rhomboids, rear shoulder
// blade), shrug-type shoulder work → traps, abs → obliques for twisting / side work.
export function muscleFor(m: string, id = "") {
  if ((m === "back" || m === "shoulders") && TRAPS.test(id)) return "traps";
  if (m === "back") return LATS.test(id) ? "lats" : LOWER_BACK.test(id) ? "lower back" : "upper back";
  if (m === "abs" && OBLIQUES.test(id)) return "obliques";
  return m;
}
