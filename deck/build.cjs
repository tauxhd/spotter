// Builds the Spotter brief deck (deck/Spotter-brief.pptx) from the images in deck/assets (deck/prep.py makes them from the
// screenshots deck/capture.cjs takes of the demo account).
//   NODE_PATH=<folder with pptxgenjs>/node_modules node deck/build.cjs
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const SKILL = process.env.PPTX_SKILL || "C:/Users/user/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/local-agent-mode-sessions/skills-plugin/459906e1-3be8-4f0b-b61c-8bad264864dd/df2e8979-3f4b-4148-8c51-93db0493db9e/skills/pptx";
const OUT = path.join(__dirname, "Spotter-brief.pptx");
const A = (n) => path.join(__dirname, "assets", n);

// The app's own look: near-black, lime as the one accent. Colours are scheme colours, so the deck restyles from the theme.
const THEME = {
  name: "Spotter", headFontFace: "Arial", bodyFontFace: "Calibri",
  colors: { dk1: "FAFAFA", lt1: "09090B", dk2: "A1A1AA", lt2: "18181B", accent1: "A3E635", accent2: "84CC16", accent3: "27272A", accent4: "3F3F46", accent5: "FACC15", accent6: "F87171", hlink: "A3E635", folHlink: "84CC16" },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "Spotter: the APU SweatZone, connected";
pres.author = "Spotter team";
pres.subject = "App brief for the APU Cloud Innovation Hackathon 2026";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const FOOT = "Spotter  ·  APU Cloud Innovation Hackathon 2026";

// ---- layouts (what pptxgenjs calls slide masters): the frame of each kind of slide ----
const footer = (color) => [
  { text: { text: FOOT, options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color, margin: 0, isTextBox: true, objectName: "Footer" } } },
];
const title = (x, w, h, color, extra = {}) => ({ placeholder: { options: { name: "title", type: "title", x, y: 0.5, w, h, fontSize: 36, bold: true, color, align: "left", valign: "top", margin: 0, ...extra }, text: "" } });
pres.defineSlideMaster({
  title: "COVER", background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 2.2, w: 6.2, h: 1.5, fontSize: 80, bold: true, color: C.text1, align: "left", valign: "middle", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "sub", type: "body", x: 0.6, y: 3.75, w: 6.2, h: 0.8, fontSize: 28, color: C.accent1, align: "left", valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({ title: "TEXT_LEFT", background: { color: C.background1 }, objects: [title(0.6, 6.3, 1.4, C.text1), ...footer(C.text2)], slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });
pres.defineSlideMaster({ title: "TEXT_RIGHT", background: { color: C.background1 }, objects: [title(7.0, 5.7, 1.4, C.text1), ...footer(C.text2)], slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });
pres.defineSlideMaster({ title: "WIDE", background: { color: C.background1 }, objects: [title(0.6, 12.1, 0.8, C.text1), ...footer(C.text2)], slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });
pres.defineSlideMaster({ title: "LIME", background: { color: C.accent1 }, objects: [title(0.6, 12.1, 0.8, C.background1), ...footer(C.background1)], slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.background1, align: "right" } });

// ---- helpers ----
const png = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
/** an image at (x, y) with height h (or width w), keeping its proportions */
function img(s, file, x, y, { h, w, alt }) {
  const [pw, ph] = png(A(file));
  if (h) w = (h * pw) / ph; else h = (w * ph) / pw;
  s.addImage({ path: A(file), x, y, w, h, altText: alt || "", objectName: file.replace(".png", "") });
  return { w, h };
}
const phone = (s, name, x, y, h, alt) => img(s, `phone-${name}.png`, x, y, { h, alt: alt || `Spotter screen: ${name}` });
const card = (s, name, x, y, o) => img(s, `card-${name}.png`, x, y, { alt: `Spotter component: ${name}`, ...o });

/** three phones in an overlapping, staggered row (the last one on top of the middle one, and so on) */
function trio(s, names, x0, alts = []) {
  const ys = [1.7, 1.3, 1.9];
  names.forEach((n, i) => phone(s, n, x0 + i * 2.05, ys[i], 4.9, alts[i]));
}
/** icon + bold head + description rows: [icon, head, desc] */
function rows(s, items, x, y, w, gap = 1.12) {
  items.forEach(([icon, head, desc], i) => {
    const yy = y + i * gap;
    s.addShape(pres.ShapeType.roundRect, { x, y: yy, w: 0.66, h: 0.66, fill: { color: C.accent3 }, rectRadius: 0.14, objectName: `Icon tile ${i + 1}` });
    s.addImage({ path: A(`icon-${icon}.png`), x: x + 0.1, y: yy + 0.1, w: 0.46, h: 0.46, altText: "", objectName: `Icon ${icon}` });
    s.addText([
      { text: head, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } },
      { text: desc, options: { fontSize: 14, color: C.text2 } },
    ], { x: x + 0.88, y: yy - 0.04, w: w - 0.88, h: gap - 0.12, valign: "top", margin: 0, isTextBox: true, objectName: `Row ${i + 1}` });
  });
}
let section;
const slide = (master, sec) => {
  if (sec && sec !== section) { pres.addSection({ title: sec }); section = sec; }
  return pres.addSlide({ masterName: master, sectionTitle: sec });
};
const T = (s, text) => s.addText(text, { placeholder: "title" });

// ===== 1. cover =====
{
  const s = slide("COVER", "The app");
  s.addImage({ path: A("logo.png"), x: 0.6, y: 0.6, w: 0.8, h: 0.8, altText: "Spotter logo", objectName: "Logo" });
  s.addText([
    { text: "APU CLOUD INNOVATION HACKATHON 2026", options: { breakLine: true } },
    { text: "SMART CAMPUS TRACK" },
  ], { x: 0.6, y: 1.5, w: 5.4, h: 0.6, fontSize: 13, bold: true, color: C.accent1, charSpacing: 2, margin: 0, valign: "top", isTextBox: true, objectName: "Event" });
  s.addText("Spotter", { placeholder: "title" });
  s.addText("The APU SweatZone, connected.", { placeholder: "sub" });
  s.addText("Clock in with a scan, log every lift, eat smart from the campus cafeteria and climb the ranks. One app for every student at the gym.", { x: 0.6, y: 4.7, w: 5.3, h: 1.4, fontSize: 16, color: C.text2, valign: "top", margin: 0, isTextBox: true, objectName: "Intro" });
  phone(s, "workout-sets", 6.5, 1.6, 4.6, "Live workout with logged sets");
  phone(s, "board", 10.55, 1.6, 4.6, "Ranks leaderboard");
  phone(s, "home", 8.2, 0.95, 5.5, "Gym home screen: clock in and live crowd");
  s.addNotes("Spotter is the APU SweatZone gym app: one place to clock in, see how busy it is, find any machine, train, eat and rank. Built for the APU Cloud Innovation Hackathon 2026, Smart Campus track.");
}

// ===== 2. the problem =====
{
  const s = slide("TEXT_LEFT", "The app");
  T(s, "Gym life still runs on guesswork");
  rows(s, [
    ["id-card", "Check-in on paper", "Students queue at the counter to show an ID card."],
    ["crowd", "Arriving blind", "No way to know how packed the SweatZone is before walking over."],
    ["book", "Lifts in a notebook", "Routines, PRs and progress live in notes apps and memory."],
    ["eat", "Calories by guesswork", "Cafeteria dishes have no macros, so eating for a goal is a guess."],
  ], 0.6, 2.2, 6.6, 1.2);
  s.addShape(pres.ShapeType.roundRect, { x: 7.9, y: 1.0, w: 4.85, h: 5.5, fill: { color: C.accent1 }, rectRadius: 0.25, objectName: "Gap panel" });
  s.addText([
    { text: "THE GAP", options: { bold: true, fontSize: 13, color: C.background1, charSpacing: 2, breakLine: true } },
    { text: "Nobody knows who trains, who lifts what, or who could represent APU.", options: { bold: true, fontSize: 30, color: C.background1, breakLine: true } },
    { text: " ", options: { fontSize: 10, breakLine: true } },
    { text: "The SweatZone has no shared record of its students: no head count, no lift history, no way to spot talent.", options: { fontSize: 16, color: C.background1 } },
  ], { x: 8.35, y: 1.45, w: 3.95, h: 4.6, valign: "top", margin: 0, isTextBox: true, objectName: "Gap statement" });
  s.addNotes("Before Spotter: you queue to show an ID at the counter, walk over without knowing how busy it is, keep lifts in a notebook, and guess at the calories in a cafeteria meal. And APU has no record of any of it.");
}

// ===== 3. overview =====
{
  const s = slide("WIDE", "The app");
  T(s, "From the door to your last set");
  phone(s, "home", 0.6, 1.55, 5.4, "Gym home screen");
  const items = [
    ["qr", "Clock in with a scan", "The door QR replaces the ID check"],
    ["crowd", "Live crowd", "Head count and the quietest hour"],
    ["map", "3D gym map", "Find any machine in the SweatZone"],
    ["barbell", "Train", "Routines, sets, rest timer and PRs"],
    ["stats", "Muscles hit", "A 3D body model of what you trained"],
    ["eat", "Eat smart", "43 APU cafeteria dishes with macros"],
    ["ranks", "Ranks", "13 events, DOTS and weight classes"],
    ["feed", "Social feed", "Share, like, comment and follow"],
  ];
  items.forEach(([icon, head, desc], i) => {
    const x = 4.1 + (i % 2) * 4.45, y = 1.75 + Math.floor(i / 2) * 1.25;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 4.25, h: 1.1, fill: { color: C.background2 }, line: { color: C.accent3, width: 1 }, rectRadius: 0.16, objectName: `Feature card ${i + 1}` });
    s.addImage({ path: A(`icon-${icon}.png`), x: x + 0.2, y: y + 0.27, w: 0.56, h: 0.56, altText: "", objectName: `Icon ${icon}` });
    s.addText([
      { text: head, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } },
      { text: desc, options: { fontSize: 14, color: C.text2 } },
    ], { x: x + 0.95, y: y + 0.12, w: 3.15, h: 0.86, valign: "middle", margin: 0, isTextBox: true, objectName: `Feature text ${i + 1}` });
  });
  s.addNotes("Eight things in one app: clock in, live crowd, the 3D map, training, the muscle model, the cafeteria, ranks and the social feed.");
}

// ===== 4. clock in =====
{
  const s = slide("TEXT_LEFT", "Gym and 3D map");
  T(s, "Clock in with a scan");
  rows(s, [
    ["qr", "Scan the door QR", "A poster on the SweatZone door; one scan clocks you in. No more ID check at the counter."],
    ["crowd", "A live head count", "Every clock-in and clock-out feeds a live count out of 60 people."],
    ["calendar", "Opening hours built in", "Shows Open until 21:00, or when it opens, so nobody walks over to a closed gym."],
  ], 0.6, 2.2, 6.0, 1.45);
  phone(s, "home", 6.9, 1.3, 5.5, "Gym home screen with Scan to clock in");
  card(s, "poster", 9.75, 2.3, { h: 4.0, alt: "The printable door poster with the clock-in QR code" });
  s.addNotes("The door poster has a QR code. Scanning it opens the check-in page and clocks the student in. That replaces showing an ID at the counter, and gives the gym a live head count out of its 60-person capacity.");
}

// ===== 5. live crowd + best time =====
{
  const s = slide("TEXT_RIGHT", "Gym and 3D map");
  T(s, "Know how busy it is, and when to go");
  phone(s, "home-scroll", 0.6, 1.3, 5.6, "Best time to train and timetable");
  card(s, "crowd", 2.9, 1.7, { w: 3.7, alt: "Live crowd card: 55 of 60 people, Packed, with an hourly chart" });
  rows(s, [
    ["crowd", "Live crowd", "A running count out of 60 and an hourly chart, labelled Quiet, Busy or Packed."],
    ["calendar", "Best time to train", "Picks the quietest free hour between your classes, from APU's public timetable feed."],
    ["intake", "Just add your intake code", "Your classes and rooms appear on the home screen next to the free slot."],
  ], 7.0, 2.2, 5.7, 1.35);
  s.addNotes("The home screen shows the live crowd and an hourly chart. 'Best time to train' looks at your own timetable, using APU's public timetable feed and your intake code, and finds the quietest hour that is free.");
}

// ===== 6. 3D map =====
{
  const s = slide("TEXT_LEFT", "Gym and 3D map");
  T(s, "Find any machine on a 3D map");
  rows(s, [
    ["map", "The whole SweatZone in 3D", "All 34 machines, racks and benches, modelled in Blender and placed where they stand."],
    ["target", "Tap or pick a machine", "Choose by zone (free weights, racks, cables, machines, cardio) and the camera glides to it."],
    ["barbell", "Exercises point to machines", "Every exercise shows the machine that does it, one tap from your workout."],
    ["building", "Floor plan view", "Switch to a flat plan with the entrance marked."],
  ], 0.6, 2.05, 6.0, 1.15);
  phone(s, "map3d", 7.0, 1.35, 5.5, "3D map of the SweatZone with the squat rack highlighted");
  phone(s, "mapplan", 9.75, 1.35, 5.5, "Floor plan view");
  s.addNotes("The whole gym is a 3D model built in Blender from the real floor plan and used in both the website and the Android app. Tap a machine or pick one by zone and the camera glides to it. Each exercise links to the machine you need.");
}

// ===== 7. routines =====
{
  const s = slide("TEXT_LEFT", "Training");
  T(s, "Routines that start in one tap");
  rows(s, [
    ["plus-circle", "Quick start", "Start an empty workout, or pick a routine and go."],
    ["edit", "Build your own", "Add exercises, sets, weights and supersets, then save the routine."],
    ["book", "Examples to start from", "Push, Pull and Legs templates you can edit and make your own."],
    ["calendar", "History", "Your last two sessions at a glance; the rest lives in your profile."],
  ], 0.6, 2.05, 5.4, 1.15);
  trio(s, ["train", "routine", "train-scroll"], 6.45, ["Train tab with routines", "Routine editor", "Example routines and history"]);
  s.addNotes("The Train tab: start an empty workout or one of your routines. Routines can be built from scratch or from the Push, Pull and Legs examples. History shows the last two sessions.");
}

// ===== 8. workout =====
{
  const s = slide("TEXT_RIGHT", "Training");
  T(s, "Log every set");
  phone(s, "workout-sets", 0.6, 1.2, 5.7, "Live workout with ticked sets and a rest timer");
  phone(s, "picker", 3.35, 2.1, 4.6, "Exercise picker");
  rows(s, [
    ["tick-box", "Sets with kg, reps and 1RM", "Tick a set to log it; each one shows an estimated one-rep max."],
    ["stopwatch", "Rest timer and supersets", "The timer starts when you tick a set (±15 s). Link exercises into supersets."],
    ["flame", "Seven set types", "Warm-up, failure, drop set, rest-pause, deload, assisted and partial reps."],
    ["medal", "PR detection", "Beat your history and a fanfare, a vibration and a gold badge celebrate it."],
    ["share", "Finish and share", "Add a title, photo or video, pick who sees it, and it posts to the feed."],
  ], 7.0, 1.85, 5.7, 1.02);
  s.addNotes("During a workout every set has kg, reps and an estimated 1RM. Ticking a set starts the rest timer. There are seven set types, supersets, and PR detection with a fanfare. Finishing lets you add a title, photo or video and share it to the feed.");
}

// ===== 9. muscles =====
{
  const s = slide("TEXT_LEFT", "Training");
  T(s, "See exactly what you trained");
  rows(s, [
    ["stats", "A 3D body model", "Front and back views light up the muscles you worked, brighter for more sets."],
    ["target", "Balance radar", "Swipe to a radar chart to see which areas you are neglecting."],
    ["calendar", "Trends over time", "Muscle distribution over a week, a month, three months or a year in your stats."],
  ], 0.6, 2.2, 5.5, 1.4);
  card(s, "muscles", 6.35, 1.55, { h: 4.45, alt: "Muscles hit: 3D body model, front and back" });
  card(s, "radar", 9.7, 1.55, { h: 4.45, alt: "Muscles hit: balance radar" });
  s.addText("Muscles hit from a live workout: the model, then the radar", { x: 6.35, y: 6.2, w: 6.6, h: 0.3, fontSize: 12, color: C.text2, margin: 0, isTextBox: true, objectName: "Caption" });
  s.addNotes("Tap the small body in the workout header to see which muscles you have hit so far. The 3D model glows lime on the worked muscles, brighter for more sets; a radar chart shows balance. Your stats show the same over a week, month, three months or a year.");
}

// ===== 10. library =====
{
  const s = slide("TEXT_RIGHT", "Training");
  T(s, "450 exercises, built from scratch");
  trio(s, ["picker", "exercise", "exercise-scroll"], 0.45, ["Exercise picker with 450 exercises", "Exercise page with progress chart", "Personal records and strength level"]);
  rows(s, [
    ["all", "Our own dataset", "Every exercise written up and illustrated for Spotter, with its primary and secondary muscles."],
    ["category", "Filter by muscle and equipment", "Search by muscle group or equipment: barbell, dumbbell, cable, machine, bodyweight."],
    ["stats", "Progress per exercise", "Charts of heaviest weight, estimated 1RM and volume, plus personal and set records."],
    ["shield", "Strength level", "Compares your best 1RM with your bodyweight, from Beginner to Elite."],
  ], 7.0, 2.0, 5.7, 1.2);
  s.addNotes("The exercise library is our own dataset: 450 exercises, each written up and illustrated for Spotter. Each exercise has its own page with a progress chart, personal records, set records and a strength level compared with your bodyweight.");
}

// ===== 11. eat =====
{
  const s = slide("TEXT_LEFT", "Eating");
  T(s, "Eat smart from the APU cafeteria");
  rows(s, [
    ["eat", "43 dishes from 9 stalls", "Western, Indian, Malaysian, Arabic, Japanese, Kopitiam, Chinese and Burger, with calories and macros."],
    ["high-protein", "Search and filter", "Find a dish by name or stall, or filter for high protein."],
    ["camera", "Snap your meal", "Photograph your plate and AI (Gemini) estimates the calories and macros."],
    ["plus-circle", "One tap to log", "Add it to today and watch your calories and macros fill up."],
  ], 0.6, 2.05, 5.4, 1.2);
  trio(s, ["eat", "eat-scroll", "food"], 6.45, ["Eat tab with today's calories and macros", "APU cafeteria dishes", "A dish with its macros"]);
  s.addNotes("Every dish in the APU cafeteria, from nine stalls, with calories and macros in our own food dataset. You can search, filter for high protein, or photograph your meal and let AI estimate it. One tap adds it to today.");
}

// ===== 12. nutrition plan =====
{
  const s = slide("TEXT_RIGHT", "Eating");
  T(s, "Nutrition that follows your goal");
  phone(s, "plan", 0.6, 1.4, 5.3, "Nutrition plan setup");
  phone(s, "eat-progress", 3.35, 1.8, 5.0, "Progress tab with maintenance calories and weight trend");
  rows(s, [
    ["target", "Pick your mission", "Lean bulk, cut for trained lifters, general fat loss, recomposition or maintain."],
    ["scale", "Body and activity", "Height, age, weight and a light, moderate or high activity level set your daily targets."],
    ["kcal", "Maintenance calories", "Estimated from your own food and weight logs, with a formula as the fallback."],
    ["stats", "Weight trend and goal", "A daily weight log with a seven-day trend line and a goal weight."],
  ], 7.0, 2.0, 5.7, 1.2);
  s.addNotes("You choose a mission, enter your body and activity, and the app sets daily calorie and macro targets. The Progress tab estimates your maintenance calories from what you actually log, and tracks weight against your goal.");
}

// ===== 13. ranks =====
{
  const s = slide("TEXT_LEFT", "Ranks and community");
  T(s, "Climb the ranks");
  rows(s, [
    ["ranks", "13 events", "Powerlifting (squat, bench, deadlift, total), strength, calisthenics and athletics."],
    ["p4p", "Fair for everyone", "Rank open, pound for pound (DOTS) or by IPF weight class, men and women separately."],
    ["faculty", "By faculty", "Filter the board to a faculty and see who is strongest across campus."],
    ["target", "How far to the next rank", "A line like '150 kg to pass Kenji T.' shows exactly what it takes."],
  ], 0.6, 2.05, 5.4, 1.15);
  trio(s, ["board", "board-class", "board-squat"], 6.45, ["Ranks with a podium", "Weight class ranking", "Squat leaderboard"]);
  s.addNotes("Thirteen events across powerlifting, strength, calisthenics and athletics. Rank open, pound for pound using DOTS, or by IPF weight class, filter by faculty, and see exactly how far you are from the next place.");
}

// ===== 14. what APU gets (lime) =====
{
  const s = slide("LIME", "For APU");
  T(s, "What APU gets from Spotter");
  const cards = [
    ["medal", "Records of every lifter", "Who trains, how often and what they lift, kept per student with their course, faculty and intake."],
    ["ranks", "Competition selection", "Rank by event, weight class and faculty to pick lifters for inter-university competitions."],
    ["person", "Representation and reach", "Students are seen and recognised, and APU can reach and represent more of them."],
  ];
  cards.forEach(([icon, head, desc], i) => {
    const x = 0.6 + i * 4.15;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.9, w: 3.9, h: 4.1, fill: { color: C.background1 }, rectRadius: 0.22, objectName: `Benefit card ${i + 1}` });
    s.addShape(pres.ShapeType.roundRect, { x: x + 0.4, y: 2.3, w: 1.1, h: 1.1, fill: { color: C.accent3 }, rectRadius: 0.22, objectName: `Benefit icon tile ${i + 1}` });
    s.addImage({ path: A(`icon-${icon}.png`), x: x + 0.55, y: 2.45, w: 0.8, h: 0.8, altText: "", objectName: `Icon ${icon}` });
    s.addText([
      { text: head, options: { bold: true, fontSize: 24, color: C.text1, breakLine: true } },
      { text: " ", options: { fontSize: 8, breakLine: true } },
      { text: desc, options: { fontSize: 16, color: C.text2 } },
    ], { x: x + 0.4, y: 3.65, w: 3.1, h: 2.2, valign: "top", margin: 0, isTextBox: true, objectName: `Benefit text ${i + 1}` });
  });
  s.addText("Plus a live head count of the SweatZone, for planning opening hours and equipment.", { x: 0.6, y: 6.3, w: 12.1, h: 0.4, fontSize: 16, bold: true, color: C.background1, margin: 0, isTextBox: true, objectName: "Plus line" });
  s.addNotes("This is what Spotter gives APU: a record of every student who trains and what they lift, a way to select lifters for competitions by event, class and faculty, and better representation and reach for students. The live head count also helps plan the facility.");
}

// ===== 15. social =====
{
  const s = slide("TEXT_RIGHT", "Ranks and community");
  T(s, "A gym with a social side");
  trio(s, ["feed", "user", "userstats"], 0.45, ["Live feed of workouts", "A student profile with a posted workout", "Profile stats: streak, volume and heaviest lifts"]);
  rows(s, [
    ["feed", "A live feed", "Finished workouts post with volume, time, PR count and the exercises, as they happen."],
    ["heart", "Likes and comments", "React to friends' sessions; likes and comments appear in real time."],
    ["person", "Follow and follow back", "Follow classmates; once they follow back you can see when they are training."],
    ["stats", "Profiles with real stats", "Workouts, weekly streak, time trained, total volume, heaviest lifts and DOTS."],
  ], 7.0, 2.0, 5.7, 1.2);
  s.addNotes("Finished workouts are shared to a live feed with likes and comments in real time. You can follow classmates, and once they follow back you can see when they are training. Each profile shows workouts, streak, volume, heaviest lifts and DOTS.");
}

// ===== 16. onboarding =====
{
  const s = slide("TEXT_LEFT", "Ranks and community");
  T(s, "Onboarding is a quest");
  rows(s, [
    ["person", "Spot, your gym buddy", "A friendly mascot talks you through setup one step at a time, with XP for each step."],
    ["id-card", "Sign in with APU", "Enter your TP number and your student card appears with course, faculty and intake."],
    ["target", "Set your mission", "Body weight, PRs, goal and activity turn into a daily nutrition plan."],
    ["settings", "Change it any time", "Edit your profile, units (kg or lb) and plan from Settings."],
  ], 0.6, 2.05, 5.4, 1.15);
  trio(s, ["quest-hello", "quest-found", "quest-5"], 6.45, ["Onboarding quest: meet Spot", "Student card after signing in with a TP number", "Pick your mission"]);
  s.addNotes("First launch is a quest with Spot the mascot. Sign in with an APU TP number and the student card appears with course, faculty and intake, then weight, PRs, goal and activity become a daily plan. The demo build accepts any TP number and password.");
}

// ===== 17. platforms =====
{
  const s = slide("WIDE", "Under the hood");
  T(s, "On the web and on Android");
  img(s, "wide-landing-hero.png", 0.6, 1.75, { w: 6.9, alt: "The Spotter landing page: a scroll-driven tour of the app" });
  rows(s, [
    ["gym", "Website", "A Next.js app that works in any phone browser, with a landing page and a live demo."],
    ["camera", "Android app", "A native Expo app with camera QR clock-in and haptics, from the same shared logic."],
    ["stats", "Shared logic", "Lifting maths, DOTS, nutrition and the 3D gym live in one TypeScript library."],
    ["shield", "Demo mode", "Try the whole app on a made-up student account; nothing is saved."],
  ], 7.9, 1.8, 4.8, 1.2);
  s.addNotes("The same product ships as a website and a native Android app. They share one TypeScript library for lifting maths, DOTS, nutrition and the 3D gym. The landing page has a scroll-driven tour and a live demo on a made-up account.");
}

// ===== 18. architecture =====
{
  const s = slide("WIDE", "Under the hood");
  T(s, "How it is built");
  const head = (t, x, w) => s.addText(t, { x, y: 1.6, w, h: 0.35, fontSize: 13, bold: true, color: C.accent1, charSpacing: 2, margin: 0, isTextBox: true, objectName: `Header ${t}` });
  const box = (x, y, w, h, t, sub, name, accent = false) => {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: accent ? C.accent1 : C.background2 }, line: { color: C.accent3, width: 1 }, rectRadius: 0.16, objectName: name });
    s.addText([
      { text: t, options: { bold: true, fontSize: 18, color: accent ? C.background1 : C.text1, breakLine: true } },
      { text: sub, options: { fontSize: 14, color: accent ? C.background1 : C.text2 } },
    ], { x: x + 0.25, y: y + 0.1, w: w - 0.5, h: h - 0.2, valign: "middle", margin: 0, isTextBox: true, objectName: name + " text" });
  };
  head("CLIENTS", 0.6, 3.6); head("SHARED LIBRARY", 4.85, 3.6); head("SERVICES", 9.1, 3.6);
  box(0.6, 2.1, 3.6, 2.05, "Website", "Next.js 15 (App Router) and Tailwind v4", "Website");
  box(0.6, 4.4, 3.6, 2.05, "Android app", "Expo and React Native, with camera QR and haptics", "Android app");
  box(4.85, 2.1, 3.6, 4.35, "One TypeScript library", "Lifting maths and PR rules\nStrength standards, DOTS, IPF classes\nNutrition plans and targets\nThe 3D gym scene (three.js)\nThe onboarding quest", "Shared library", true);
  box(9.1, 2.1, 3.6, 0.95, "Supabase", "Postgres with row-level security, anonymous auth, Realtime", "Supabase");
  box(9.1, 3.2, 3.6, 0.95, "Gemini", "Meal photo to calories and macros", "Gemini");
  box(9.1, 4.3, 3.6, 0.95, "APU timetable feed", "Public feed, looked up by intake code", "Timetable feed");
  box(9.1, 5.4, 3.6, 1.05, "Blender to glTF", "The 3D SweatZone model, drawn with three.js", "Blender model");
  [3.15, 5.2].forEach((y, i) => {
    s.addShape(pres.ShapeType.line, { x: 4.3, y, w: 0.45, h: 0, line: { color: C.accent2, width: 2.5, endArrowType: "triangle" }, objectName: `Arrow clients ${i + 1}` });
  });
  s.addShape(pres.ShapeType.line, { x: 8.55, y: 4.3, w: 0.45, h: 0, line: { color: C.accent2, width: 2.5, endArrowType: "triangle" }, objectName: "Arrow services" });
  s.addNotes("Two clients, the Next.js website and the Expo Android app, share one TypeScript library with the app's logic. Supabase stores the data and powers real-time feeds; Gemini reads meal photos; the timetable comes from APU's public feed; the 3D gym is a Blender model drawn with three.js.");
}

// ===== 19. numbers + close =====
{
  const s = slide("WIDE", "Under the hood");
  T(s, "Spotter in numbers");
  const stats = [["450", "exercises we wrote and illustrated"], ["43", "dishes from 9 APU cafeteria stalls"], ["34", "machines placed in the 3D gym"], ["13", "events on the leaderboards"], ["2", "platforms: website and Android"]];
  stats.forEach(([n, cap], i) => {
    const x = 0.6 + i * 2.45;
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.75, w: 2.25, h: 2.2, fill: { color: C.background2 }, line: { color: C.accent3, width: 1 }, rectRadius: 0.18, objectName: `Stat tile ${i + 1}` });
    s.addText([
      { text: n, options: { bold: true, fontSize: 54, color: C.accent1, breakLine: true } },
      { text: cap, options: { fontSize: 14, color: C.text2 } },
    ], { x: x + 0.2, y: 1.9, w: 1.85, h: 1.9, valign: "middle", margin: 0, isTextBox: true, objectName: `Stat text ${i + 1}` });
  });
  img(s, "wide-video-frame.png", 0.6, 4.3, { w: 4.3, alt: "A frame from the Spotter demo video" });
  s.addText([
    { text: "Watch the 49-second demo video", options: { bold: true, fontSize: 20, color: C.text1, breakLine: true } },
    { text: "Every screen in this deck is the real app, running on a demo account.", options: { fontSize: 16, color: C.text2, breakLine: true } },
    { text: " ", options: { fontSize: 10, breakLine: true } },
    { text: "Built for the APU Cloud Innovation Hackathon 2026, Smart Campus track", options: { fontSize: 16, color: C.text1, breakLine: true } },
    { text: "github.com/tauxhd/spotter", options: { fontSize: 16, bold: true, color: C.accent1 } },
  ], { x: 5.4, y: 4.4, w: 7.3, h: 2.2, valign: "top", margin: 0, isTextBox: true, objectName: "Closing text" });
  s.addNotes("Spotter in numbers: 450 exercises, 43 cafeteria dishes across nine stalls, 34 machines in the 3D gym, 13 leaderboard events and two platforms. The demo video shows the whole app in 49 seconds.");
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  const { applyTheme } = require(SKILL + "/scripts/apply_theme.js");
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
