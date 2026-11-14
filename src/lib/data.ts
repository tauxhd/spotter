// ponytail: all mock data for the prototype. Each export becomes a Supabase table/query later.

export type Sex = "M" | "F";
export type Lift = "squat" | "bench" | "deadlift";

export const faculties = ["Computing", "Technology", "Engineering", "Business", "Accounting", "Design", "Psychology"];

// Class timetable for today ("HH:MM"), used to find workout gaps.
export const classes = [
  { code: "CT046", name: "Data Structures & Algorithms", start: "08:30", end: "10:30", room: "B-06-08" },
  { code: "CT127", name: "Cloud Infrastructure", start: "11:00", end: "13:00", room: "S-07-02" },
  { code: "CT098", name: "IoT Systems", start: "15:00", end: "17:00", room: "Tech Lab 4-01" },
];

// Name, hours and ID check-in from APU Student Affairs (SweatZone page). Capacity is a guess.
export const gym = { name: "APU SweatZone", open: "09:00", close: "21:00", capacity: 60 };

// Typical % full for each hour from 09:00 to 20:00 (would come from historical clock-in data).
export const crowdByHour: Record<number, number> = {
  9: 30, 10: 28, 11: 35, 12: 50, 13: 40, 14: 32, 15: 38, 16: 55, 17: 78, 18: 92, 19: 85, 20: 45,
};

// Floor plan of the SweatZone, from the team's full layout (units = pixels of that drawing, 640 x 1152). `tables` are the
// plain boxes (tables, storage): drawn, not tappable. Every machine has an id (map pins, ?e=<id>), a name, a zone and a
// short label for the map.
export const floor = {
  outline: "354,91 608,91 608,1106 77,1106 77,230 354,230",
  viewBox: "68 82 556 1034",
  tables: [
    [97, 313, 61, 37], [506, 318, 69, 37], [97, 604, 69, 38], [506, 604, 69, 38], [94, 841, 69, 37], [507, 862, 69, 38],
    [354, 144, 20, 75], [152, 230, 65, 22], [77, 642, 23, 94], [117, 642, 28, 94], [78, 764, 80, 27], [469, 602, 22, 42],
  ] as [number, number, number, number][],
  door: [600, 949, 16, 123] as [number, number, number, number], // the entrance, in the east wall
};

type Equip = { id: string; name: string; label: string; zone: string; x: number; y: number; w: number; h: number };
const row = (id: string, name: string, label: string, zone: string, list: [number, number][], w: number, h: number): Equip[] =>
  list.map(([x, y], i) => ({ id: `${id}${i + 1}`, name: `${name} ${i + 1}`, label, zone, x, y, w, h }));

export const equipment: Equip[] = [
  { id: "dbs", name: "Dumbbell Rack", label: "Dumbbells", zone: "Free weights", x: 377, y: 91, w: 218, h: 43 },
  { id: "dbseat1", name: "Dumbbell Bench 1", label: "DB bench", zone: "Free weights", x: 404, y: 158, w: 17, h: 48 },
  { id: "dbseat2", name: "Dumbbell Bench 2", label: "DB bench", zone: "Free weights", x: 457, y: 158, w: 16, h: 48 },
  { id: "bench1", name: "Flat Bench Press", label: "Bench", zone: "Benches & racks", x: 542, y: 161, w: 65, h: 64 },
  { id: "bench2", name: "Incline Bench Press", label: "Incline", zone: "Benches & racks", x: 508, y: 253, w: 66, h: 63 },
  { id: "rack", name: "Squat Rack", label: "Squat rack", zone: "Benches & racks", x: 258, y: 232, w: 85, h: 67 },
  { id: "rig", name: "Pull-up Rig & Squat Stations", label: "Rig", zone: "Benches & racks", x: 278, y: 368, w: 151, h: 148 },
  { id: "tower", name: "Pull-up & Dip Tower", label: "Dip tower", zone: "Benches & racks", x: 162, y: 299, w: 38, h: 59 },
  { id: "cable", name: "Cable Crossover", label: "Cable crossover", zone: "Cables", x: 407, y: 289, w: 91, h: 77 },
  { id: "latpd", name: "Lat Pulldown", label: "Lat pulldown", zone: "Cables", x: 273, y: 567, w: 46, h: 59 },
  { id: "cablestack", name: "Cable Station", label: "Cable", zone: "Cables", x: 322, y: 548, w: 50, h: 52 },
  { id: "calf", name: "Standing Calf Raise", label: "Calf raise", zone: "Machines", x: 98, y: 361, w: 41, h: 45 },
  { id: "squatm", name: "Squat Machine", label: "Squat machine", zone: "Machines", x: 98, y: 410, w: 41, h: 38 },
  { id: "legpress1", name: "Leg Press 1", label: "Leg press", zone: "Machines", x: 93, y: 454, w: 54, h: 49 },
  { id: "legpress2", name: "Leg Press 2", label: "Leg press", zone: "Machines", x: 93, y: 526, w: 54, h: 49 },
  { id: "preacher", name: "Preacher Curl Machine", label: "Preacher", zone: "Machines", x: 543, y: 372, w: 41, h: 43 },
  { id: "pecdeck", name: "Pec Deck / Rear Delt", label: "Pec deck", zone: "Machines", x: 548, y: 426, w: 54, h: 43 },
  { id: "shoulder", name: "Shoulder Press Machine", label: "Shoulder press", zone: "Machines", x: 548, y: 478, w: 54, h: 50 },
  { id: "abs", name: "Ab Crunch Machine", label: "Ab crunch", zone: "Machines", x: 542, y: 538, w: 43, h: 42 },
  { id: "pecfly", name: "Chest Fly Machine", label: "Chest fly", zone: "Machines", x: 375, y: 575, w: 44, h: 44 },
  { id: "legext", name: "Leg Extension", label: "Leg extension", zone: "Machines", x: 325, y: 604, w: 45, h: 56 },
  ...row("bike", "Spin Bike", "Bike", "Cardio", [[311, 680], [311, 726], [311, 778], [311, 831], [311, 882]], 40, 41),
  ...row("tm", "Treadmill", "Treadmill", "Cardio", [[512, 679], [512, 734], [512, 789], [135, 1034], [216, 1034], [288, 1034], [367, 1034], [444, 1034]], 48, 49),
];

// Machines of one kind grouped (Treadmill 1-8 -> "Treadmill" with 8 units), in plan order: the map's compact picker.
export const equipKinds = equipment.reduce<{ zone: string; name: string; items: Equip[] }[]>((a, e) => {
  const name = e.name.replace(/ \d+$/, "");
  const k = a.find((g) => g.name === name);
  if (k) k.items.push(e); else a.push({ zone: e.zone, name, items: [e] });
  return a;
}, []);

// Where each exercise is done in the gym (map pin). Names match the exercise library (supabase/exercises.json).
export const exercises: Record<string, { equip: string }> = {
  "Squat (Barbell)": { equip: "rack" },
  "Front Squat (Barbell)": { equip: "rack" },
  "Romanian Deadlift (Barbell)": { equip: "rig" },
  "Deadlift (Barbell)": { equip: "rig" },
  "Bench Press (Barbell)": { equip: "bench1" },
  "Incline Bench Press (Barbell)": { equip: "bench2" },
  "Bench Press (Dumbbell)": { equip: "dbseat2" },
  "Incline Bench Press (Dumbbell)": { equip: "dbseat2" },
  "Shoulder Press (Dumbbell)": { equip: "dbseat1" },
  "Bicep Curl (Dumbbell)": { equip: "dbs" },
  "Pull Up": { equip: "tower" },
  "Chest Dip": { equip: "tower" },
  "Cable Crossover": { equip: "cable" },
  "Low to High Cable Fly": { equip: "cable" },
  "High to Low Cable Fly": { equip: "cable" },
  "Straight Arm Pulldown (Cable)": { equip: "cable" },
  "Bicep Curl (Cable)": { equip: "cable" },
  "Lat Pulldown (Cable)": { equip: "latpd" },
  "Lat Pulldown (Machine)": { equip: "latpd" },
  "Lat Pulldown - Close Grip (Cable)": { equip: "latpd" },
  "Seated Cable Row": { equip: "cablestack" },
  "Standing Calf Raise (Machine)": { equip: "calf" },
  "Hack Squat (Machine)": { equip: "squatm" },
  "Leg Press (Machine)": { equip: "legpress1" },
  "Leg Extension (Machine)": { equip: "legext" },
  "Preacher Curl (EZ Bar)": { equip: "preacher" },
  "Pec Deck (Machine Fly)": { equip: "pecfly" },
  "Reverse Pec Deck (Machine)": { equip: "pecdeck" },
  "Running (Treadmill)": { equip: "tm1" },
  "Cycling (Stationary Bike)": { equip: "bike1" },
};
// Names used before the library existed (old workouts / posts) -> library names.
export const oldNames: Record<string, string> = {
  "Back Squat": "Squat (Barbell)", "Romanian Deadlift": "Romanian Deadlift (Barbell)", "Leg Press": "Leg Press (Machine)",
  "Leg Curl": "Lying Leg Curl (Machine)", "Bench Press": "Bench Press (Barbell)", "Incline Bench Press": "Incline Bench Press (Barbell)",
  "Cable Fly": "Cable Crossover", "Dumbbell Shoulder Press": "Shoulder Press (Dumbbell)", "Deadlift": "Deadlift (Barbell)",
  "Lat Pulldown": "Lat Pulldown (Cable)", "Seated Row": "Seated Cable Row", "Dumbbell Curl": "Bicep Curl (Dumbbell)",
};

// Set types (normal sets have no type and are numbered 1, 2, 3…).
export type SetType = "warmup" | "failure" | "drop" | "deload" | "assisted" | "restpause" | "partial";
export const setTypes: Record<SetType, { label: string; short: string; color: string; hint: string }> = {
  warmup: { label: "Warm-up", short: "W", color: "text-amber-500", hint: "Light prep set. Not counted in volume or PRs" },
  failure: { label: "Failure", short: "F", color: "text-red-500", hint: "Taken to failure, no reps left" },
  drop: { label: "Drop set", short: "D", color: "text-sky-500", hint: "Weight lowered straight after the last set, no rest" },
  restpause: { label: "Rest-pause", short: "RP", color: "text-pink-500", hint: "10–20 s pause, then more reps with the same weight" },
  deload: { label: "Deload", short: "DL", color: "text-teal-500", hint: "Planned lighter recovery set. No PRs" },
  assisted: { label: "Assisted", short: "A", color: "text-violet-500", hint: "kg = assistance from a machine or band. Not counted in volume or PRs" },
  partial: { label: "Partial reps", short: "P", color: "text-orange-500", hint: "Shortened range of motion. No PRs" },
};
export type SetT = { kg: number; reps: number; done?: boolean; type?: SetType; secs?: number }; // secs = hold / duration for timed sets

// Exercises logged by time instead of reps (holds, carries, cardio). Students can still switch any exercise.
const TIMED = new Set([
  "plank", "side-plank", "copenhagen-plank", "side-plank-hip-dip", "hollow-body-hold", "superman-hold", "handstand-hold", "freestanding-handstand",
  "wall-sit", "l-sit", "v-sit", "front-lever", "tuck-front-lever", "back-lever", "tuck-planche", "straddle-planche", "human-flag", "elbow-lever",
  "planche-lean", "dead-hang", "farmers-carry", "suitcase-carry-dumbbell", "overhead-carry-dumbbell", "bear-crawl", "crab-walk", "treadmill-run",
  "rowing-machine", "stationary-bike", "jump-rope", "battle-ropes", "sprint", "stair-climb", "shadow-boxing", "sled-push", "lateral-shuffle",
  "high-knees", "butt-kicks", "jumping-jack",
]);
export const timedByDefault = (id?: string) => !!id && TIMED.has(id);

// Superset A, B, C… each get their own colour so linked exercises read as one block.
const SUPERSET_COLORS = [
  { bar: "border-l-lime-500", tag: "bg-lime-500 text-zinc-950", text: "text-lime-600 dark:text-lime-400" },
  { bar: "border-l-sky-500", tag: "bg-sky-500 text-zinc-950", text: "text-sky-600 dark:text-sky-400" },
  { bar: "border-l-violet-500", tag: "bg-violet-500 text-white", text: "text-violet-600 dark:text-violet-400" },
  { bar: "border-l-amber-500", tag: "bg-amber-500 text-zinc-950", text: "text-amber-600 dark:text-amber-400" },
  { bar: "border-l-pink-500", tag: "bg-pink-500 text-white", text: "text-pink-600 dark:text-pink-400" },
  { bar: "border-l-teal-500", tag: "bg-teal-500 text-zinc-950", text: "text-teal-600 dark:text-teal-400" },
];
export const supersetColor = (i: number) => SUPERSET_COLORS[Math.max(0, i) % SUPERSET_COLORS.length];
export type ExerciseLog = { name: string; sets: SetT[]; superset?: number; timed?: boolean }; // same superset id = done back to back

const s = (kg: number, reps: number, n: number): SetT[] => Array.from({ length: n }, () => ({ kg, reps }));

export const templates: { name: string; exercises: ExerciseLog[] }[] = [
  { name: "Legs", exercises: [
    { name: "Squat (Barbell)", sets: s(120, 5, 3) },
    { name: "Romanian Deadlift (Barbell)", sets: s(90, 8, 3) },
    { name: "Leg Press (Machine)", sets: s(160, 10, 3) },
    { name: "Lying Leg Curl (Machine)", sets: s(40, 12, 3) },
  ] },
  { name: "Push", exercises: [
    { name: "Bench Press (Barbell)", sets: s(85, 5, 3) },
    { name: "Incline Bench Press (Barbell)", sets: s(65, 8, 3) },
    { name: "Shoulder Press (Dumbbell)", sets: s(22, 10, 3) },
    { name: "Cable Crossover", sets: s(15, 12, 3) },
  ] },
  { name: "Pull", exercises: [
    { name: "Deadlift (Barbell)", sets: s(160, 3, 3) },
    { name: "Lat Pulldown (Cable)", sets: s(60, 10, 3) },
    { name: "Seated Cable Row", sets: s(55, 10, 3) },
    { name: "Bicep Curl (Dumbbell)", sets: s(14, 12, 3) },
  ] },
];


export const lifters = [
  { id: "u1", name: "Hafiz R.", sex: "M" as Sex, bw: 83, faculty: "Engineering", tp: "TP061037", course: "BEng (Hons) Mechatronic Engineering", squat: 200, bench: 135, deadlift: 240, verified: true },
  { id: "u2", name: "Jun Wei", sex: "M" as Sex, bw: 66, faculty: "Computing", tp: "TP061074", course: "BSc (Hons) Computer Science", squat: 165, bench: 110, deadlift: 210, verified: true },
  { id: "u3", name: "Priya S.", sex: "F" as Sex, bw: 58, faculty: "Business", tp: "TP061111", course: "BA (Hons) Business Management", squat: 115, bench: 62.5, deadlift: 145, verified: true },
  { id: "u4", name: "Daniel K.", sex: "M" as Sex, bw: 102, faculty: "Engineering", tp: "TP061148", course: "BEng (Hons) Mechatronic Engineering", squat: 230, bench: 160, deadlift: 260, verified: false },
  { id: "u5", name: "Nurul A.", sex: "F" as Sex, bw: 52, faculty: "Computing", tp: "TP061185", course: "BSc (Hons) Computer Science", squat: 95, bench: 50, deadlift: 125, verified: true },
  { id: "u6", name: "Kenji T.", sex: "M" as Sex, bw: 74, faculty: "Design", tp: "TP061222", course: "BA (Hons) Graphic Design & Multimedia", squat: 150, bench: 105, deadlift: 190, verified: true },
  { id: "u7", name: "Mei Ling", sex: "F" as Sex, bw: 63, faculty: "Design", tp: "TP061259", course: "BA (Hons) Graphic Design & Multimedia", squat: 105, bench: 55, deadlift: 135, verified: false },
  { id: "u8", name: "Ravi M.", sex: "M" as Sex, bw: 90, faculty: "Business", tp: "TP061296", course: "BA (Hons) Business Management", squat: 180, bench: 140, deadlift: 220, verified: true },
  { id: "u9", name: "Aisyah Z.", sex: "F" as Sex, bw: 70, faculty: "Engineering", tp: "TP061333", course: "BEng (Hons) Mechatronic Engineering", squat: 130, bench: 70, deadlift: 160, verified: true },
  { id: "u10", name: "Farhan I.", sex: "M" as Sex, bw: 60, faculty: "Computing", tp: "TP061370", course: "BSc (Hons) Computer Science", squat: 140, bench: 95, deadlift: 185, verified: false },
];

// ---- leaderboard events ----
// unit: kg | reps | cm | sec (1 decimal) | time (m:ss). lower = smaller is better. p4p = how bodyweight is factored in.
export type Unit = "kg" | "reps" | "cm" | "sec" | "time";
export type EventDef = { id: string; name: string; group: string; unit: Unit; icon: string; lower?: boolean; p4p?: "dots" | "ratio" };
export const eventGroups = ["Powerlifting", "Strength", "Calisthenics", "Athletics"] as const;
export const events: EventDef[] = [
  { id: "total", name: "SBD total", group: "Powerlifting", unit: "kg", icon: "barbell", p4p: "dots" },
  { id: "squat", name: "Squat", group: "Powerlifting", unit: "kg", icon: "squat", p4p: "ratio" },
  { id: "bench", name: "Bench", group: "Powerlifting", unit: "kg", icon: "bench", p4p: "ratio" },
  { id: "deadlift", name: "Deadlift", group: "Powerlifting", unit: "kg", icon: "deadlift", p4p: "ratio" },
  { id: "ohp", name: "Overhead press", group: "Strength", unit: "kg", icon: "ohp", p4p: "ratio" },
  { id: "clean", name: "Power clean", group: "Strength", unit: "kg", icon: "clean", p4p: "ratio" },
  { id: "pullups", name: "Pull-ups", group: "Calisthenics", unit: "reps", icon: "pullup" },
  { id: "pushups", name: "Push-ups", group: "Calisthenics", unit: "reps", icon: "pushup" },
  { id: "plank", name: "Plank hold", group: "Calisthenics", unit: "time", icon: "plank" },
  { id: "vjump", name: "Vertical jump", group: "Athletics", unit: "cm", icon: "vjump" },
  { id: "broadjump", name: "Long jump", group: "Athletics", unit: "cm", icon: "broadjump" },
  { id: "sprint100", name: "100 m sprint", group: "Athletics", unit: "sec", icon: "sprint", lower: true },
  { id: "run2400", name: "2.4 km run", group: "Athletics", unit: "time", icon: "run", lower: true },
];
// SBD come from profiles (gym logs); everything else lives in the results table.
export const gymLifts = ["squat", "bench", "deadlift", "total"];

// IPF weight classes (kg). The last class is "+" (e.g. 120+).
export const weightClasses: Record<Sex, number[]> = { M: [59, 66, 74, 83, 93, 105, 120], F: [47, 52, 57, 63, 69, 76, 84] };

// Demo lifters' other results, by lifter id.
export const mockResults: Record<string, Record<string, number>> = {
  u1: { ohp: 85, clean: 110, pullups: 12, pushups: 45, plank: 150, vjump: 55, broadjump: 240, sprint100: 13.2, run2400: 720 },
  u2: { ohp: 62.5, clean: 85, pullups: 22, pushups: 60, plank: 180, vjump: 68, broadjump: 265, sprint100: 12.4, run2400: 600 },
  u3: { ohp: 37.5, clean: 50, pullups: 8, pushups: 30, plank: 200, vjump: 45, broadjump: 205, sprint100: 14.1, run2400: 690 },
  u4: { ohp: 100, clean: 120, pullups: 6, pushups: 35, plank: 90, vjump: 50, broadjump: 225, sprint100: 13.8, run2400: 840 },
  u5: { ohp: 30, clean: 42.5, pullups: 10, pushups: 35, plank: 240, vjump: 42, broadjump: 195, sprint100: 14.6, run2400: 660 },
  u6: { ohp: 70, clean: 95, pullups: 18, pushups: 55, plank: 160, vjump: 72, broadjump: 275, sprint100: 12.0, run2400: 585 },
  u7: { ohp: 35, clean: 47.5, pullups: 5, pushups: 25, plank: 150, vjump: 48, broadjump: 210, sprint100: 13.9, run2400: 640 },
  u8: { ohp: 90, clean: 105, pullups: 10, pushups: 50, plank: 120, vjump: 58, broadjump: 245, sprint100: 12.9, run2400: 750 },
  u9: { ohp: 45, clean: 60, pullups: 6, pushups: 32, plank: 180, vjump: 50, broadjump: 215, sprint100: 14.0, run2400: 705 },
  u10: { ohp: 60, clean: 80, pullups: 25, pushups: 70, plank: 210, vjump: 70, broadjump: 270, sprint100: 12.2, run2400: 560 },
};

export type Comment = { by: string; text: string; uid?: string | null };
// One entry of the exercise library (Supabase "exercises" table).
export type Exercise = { id: string; name: string; muscle: string; equipment: string; secondary: string[]; lift: Lift | null; image: string };
export type Visibility = "everyone" | "friends" | "private";
// An exercise a student added from the picker because the library didn't have it (table custom_exercises, only theirs).
// It joins their library with no picture until we add it properly.
export type CustomRow = { id: string; name: string; muscle: string; equipment: string };
export const customExercise = (r: CustomRow): Exercise => ({ id: `custom-${r.id}`, name: r.name, muscle: r.muscle, equipment: r.equipment, secondary: [], lift: null, image: "" });
export const isCustom = (e: Exercise) => e.id.startsWith("custom-");
export type PostExercise = { id?: string; name: string; sets?: number; best: string; log?: { kg: number; reps: number; type?: SetType; secs?: number }[]; superset?: string };
export type Post = {
  id: string; by: string; faculty: string; at: string; title: string; note?: string;
  exercises: PostExercise[]; volume: number; prs: string[]; duration?: number | null;
  visibility?: Visibility; media?: { url: string; type: "video" | "image" } | null; likers?: { id: string; name: string; avatar?: string | null }[];
  likes: number; liked?: boolean; mine?: boolean; uid?: string | null; avatar?: string | null; comments: Comment[];
};

// APU cafeteria stalls and their menus. Macros are typical-portion estimates; the stalls / student reps would correct them.
export const stalls = ["Western", "Indian", "Malaysian", "Arabic", "Japanese", "Kopitiam", "Chinese", "Burger", "Other"] as const;
export type Stall = (typeof stalls)[number];

const menu = (stall: Stall, items: [string, number, number, number, number][]) =>
  items.map(([name, kcal, p, c, f]) => ({ stall, name, kcal, p, c, f }));

export const foods = [
  ...menu("Malaysian", [["Nasi lemak + fried chicken", 780, 32, 85, 34], ["Economy rice (1 meat, 2 veg)", 650, 28, 90, 18], ["Mee goreng mamak", 660, 18, 88, 26], ["Nasi goreng kampung", 680, 22, 90, 24], ["Ayam penyet", 820, 42, 80, 36]]),
  ...menu("Chinese", [["Chicken rice (roasted)", 600, 35, 75, 16], ["Wantan mee", 520, 22, 70, 16], ["Char kuey teow", 740, 23, 76, 38], ["Egg fried rice", 650, 18, 90, 22], ["Steamed fish + rice", 480, 35, 60, 8]]),
  ...menu("Indian", [["Roti canai + dhal", 420, 11, 54, 18], ["Chicken briyani", 850, 38, 100, 30], ["Thosai + chutney", 300, 8, 48, 8], ["Tandoori chicken + naan", 720, 48, 65, 26], ["Banana leaf rice (veg)", 700, 18, 110, 20]]),
  ...menu("Western", [["Grilled chicken + mash", 620, 48, 50, 22], ["Chicken chop + fries", 850, 45, 70, 42], ["Fish & chips", 780, 32, 75, 38], ["Spaghetti bolognese", 650, 28, 85, 20], ["Lamb chop + fries", 900, 50, 60, 50]]),
  ...menu("Arabic", [["Chicken mandi", 900, 50, 110, 28], ["Chicken shawarma wrap", 550, 35, 50, 22], ["Lamb kabsa", 950, 45, 105, 38], ["Falafel wrap", 520, 16, 65, 22], ["Hummus + pita", 400, 12, 50, 16]]),
  ...menu("Japanese", [["Chicken katsu don", 850, 38, 110, 26], ["Teriyaki chicken rice", 650, 40, 85, 14], ["Salmon sushi set (8 pcs)", 420, 22, 60, 10], ["Chicken ramen", 600, 32, 70, 20], ["Chicken karaage (6 pcs)", 450, 28, 18, 28]]),
  ...menu("Kopitiam", [["Kaya toast + 2 half-boiled eggs", 420, 16, 40, 22], ["Teh tarik", 160, 4, 26, 4], ["Milo ais", 220, 6, 38, 5], ["Kopi O kosong", 5, 0, 1, 0], ["Nasi lemak bungkus", 400, 10, 55, 16]]),
  ...menu("Burger", [["Chicken burger", 500, 28, 42, 24], ["Beef burger", 550, 30, 40, 30], ["Double beef cheeseburger", 850, 48, 42, 52], ["Ramly special", 600, 24, 45, 35], ["Fries (medium)", 350, 4, 44, 17]]),
  ...menu("Other", [["Whey shake (1 scoop + water)", 120, 24, 3, 1.5], ["Boiled eggs ×2", 140, 12, 1, 10], ["Banana", 105, 1.3, 27, 0.4]]),
];

// Image paths: /food/<slug>.webp for dishes, /stalls/<slug>.webp for stalls (illustrations generated with ChatGPT).
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// "High protein" = at least a quarter of the calories from protein.
export const highProtein = (x: { kcal: number; p: number }) => x.kcal > 0 && (x.p * 4) / x.kcal >= 0.25;
export const foodBySlug = (id: string) => foods.find((f) => slug(f.name) === id);
// Share of a dish's calories from protein / carbs / fat (4 / 4 / 9 kcal per gram).
export const calSplit = (x: { p: number; c: number; f: number }) => {
  const t = x.p * 4 + x.c * 4 + x.f * 9 || 1;
  return { p: (x.p * 4) / t, c: (x.c * 4) / t, f: (x.f * 9) / t };
};

export const targets = { kcal: 2600, p: 150, c: 310, f: 80 };

// ---- time helpers ----

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Demo override: add ?t=17:30 to any URL to pretend it's that time today.
export function demoNow() {
  const d = new Date();
  const t = typeof window !== "undefined" && window.location?.search && new URLSearchParams(window.location.search).get("t"); // (no location in the phone app)
  if (t && /^\d{1,2}:\d{2}$/.test(t)) d.setHours(Math.floor(toMin(t) / 60), toMin(t) % 60); // keep real seconds so posts still sort newest-first
  return d;
}

export const minsOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const crowdAt = (min: number) => {
  const h = Math.floor(min / 60);
  const a = crowdByHour[h] ?? 0, b = crowdByHour[h + 1] ?? a;
  return Math.round(a + ((b - a) * (min % 60)) / 60); // linear between hours
};

export const timeAgo = (iso: string, now = new Date()) => {
  const m = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

// Library entry for a logged / posted exercise (by id, its name, or a pre-library name).
export const findExercise = (lib: Exercise[], id?: string, name?: string) =>
  lib.find((e) => e.id === id) ?? lib.find((e) => e.name === name || e.name === oldNames[name ?? ""]);

// Library muscle -> body area used for "muscle split" bars.
const BUCKETS: Record<string, string> = {
  chest: "Chest", back: "Back", shoulders: "Shoulders", biceps: "Arms", triceps: "Arms", forearms: "Arms",
  quads: "Legs", hamstrings: "Legs", glutes: "Legs", calves: "Legs", abs: "Core",
};
export const bodyArea = (muscle?: string) => BUCKETS[muscle ?? ""] ?? "Full body";

// Fractional sets: the main muscle's area gets the full sets, every other area the exercise works gets half.
export function addSets(m: Record<string, number>, ex: { muscle: string; secondary: string[] } | undefined, n: number) {
  const main = bodyArea(ex?.muscle);
  m[main] = (m[main] ?? 0) + n;
  for (const a of new Set((ex?.secondary ?? []).map((x) => BUCKETS[x]).filter(Boolean))) if (a !== main) m[a] = (m[a] ?? 0) + n / 2;
  return m;
}
