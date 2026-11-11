// The library only tags "back" / "abs" / "shoulders", so finer groups are picked out by exercise id.
export const LATS = /pull-up|chin-up|pulldown|pullover|muscle-up|lever|skin-the-cat|dead-hang/;
export const LOWER_BACK = /^deadlift$|deadlift-dumbbell|deficit-deadlift|paused-deadlift|snatch-grip-deadlift|rack-pull|block-pull|jefferson|back-extension|good-morning|superman|reverse-hyper|kettlebell-deadlift|pull-through/;
export const TRAPS = /shrug|upright-row|high-pull/;
export const REAR_DELTS = /rear-delt|reverse-pec-deck|face-pull|y-raise|t-raise|pull-apart|snow-angel|face-pull/;
export const OBLIQUES = /twist|side-bend|side-plank|woodchop|windshield|landmine-180|bicycle|anti-rotation|copenhagen|human-flag|pallof|oblique|torso-rotation|windmill/;
export const ADDUCTORS = /adduction|adductor|copenhagen|cossack|lateral-lunge|sumo-squat|sumo-deadlift/;
export const ABDUCTORS = /hip-abduction|clamshell|side-lying-leg-raise|lateral-walk|fire-hydrant|curtsy-lunge|lateral-step-up|lateral-shuffle/;

// "back" split for the workout tally and 3D body: lats, lower back, or upper back (traps, rhomboids, rear shoulder blade).
export const backPart = (id = "") => (LATS.test(id) ? "lats" : LOWER_BACK.test(id) ? "lower back" : "upper back");
export const muscleFor = (m: string, id?: string) => (m === "back" ? backPart(id) : m);
