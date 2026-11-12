// The words behind every (i) button, shared by the website and the phone app so both explain things the same way.
export const help = {
  crowd: "How busy the SweatZone usually is at each hour today, worked out from past clock-ins at the door. The highlighted bar is now.",
  cafeteria: "Typical APU cafeteria portions, so calories and macros are estimates. Tap + to log a dish, or tap the dish for its details.",
  portion: "A typical APU cafeteria portion. Calories and macros are estimates, so your plate may differ a little.",
  goal: "The outcome you want to work toward. It sets how far above or below maintenance your calories go, and how much protein you get.",
  body: (bw: number) => `Used for your starting maintenance estimate (the Mifflin-St Jeor formula). Your weight comes from your profile (${bw} kg).`,
  maintenance: (adaptive: boolean) => adaptive
    ? "The calories that keep your weight steady: what you ate over the last 4 weeks, minus the energy in your trend-weight change (7,700 kcal per kg)."
    : "The calories that keep your weight steady, from your weight, height, age and activity. Log meals and weigh in for 2 weeks and it switches to your own data.",
  targets: "Your maintenance adjusted for your goal, rounded to the nearest 50 kcal. Protein and fat scale with your bodyweight; carbs fill the rest.",
  trend: "Daily weigh-ins jump around with water and food. The purple line is the 7-day average, which shows where your weight is really heading.",
  intake: "Green is what you ate each day; the dashed orange line is your maintenance. Eat under the line to lose weight, over it to gain.",
  balance: "Your average daily intake this week minus your maintenance. Negative is a deficit (losing weight), positive is a surplus (gaining).",
  lifts: "Every different weight × reps you've done, strongest first. Warm-up and assisted sets are left out.",
  strength: "Your best estimated one-rep max against strength standards for your bodyweight and sex, from Beginner to Elite. The marks under the bar show the kg each level starts at.",
  examples: "Ready-made routines to start from. Tap Edit to copy one into your routines and change it.",
  muscles: "Sets you ticked this workout. An exercise's main muscle counts 1 set; other muscles it works count ½.",
  hold: "Hold exercises (planks, hangs, carries…) have a ▶ timer on each set. Switch them to reps with “Log reps instead”.",
  visits: "From your clock-ins at the SweatZone door. Only you can see this.",
  bodyBests: "Bodyweight is needed for DOTS. Lifts are optional: they put you on the leaderboard and update as you log sets. Everyone sees weights in their own unit.",
  heaviest: "The heaviest weight actually lifted for each, from ticked sets of at least 1 rep (warm-ups left out). Swipe for estimated one-rep maxes.",
  e1rm: "What could probably be lifted for a single rep, estimated from the weight and reps of every set. Swipe back for the heaviest weights actually lifted.",
  verified: "Verified = checked by a gym rep. Gym lifts come from logged sets; other events are self-reported.",
};

// Ranks: how the board you're looking at is scored, plus what "verified" means.
export const ranksHelp = (standard: string, p4p: string | undefined, lower: boolean | undefined, classSex: string, gym = false) =>
  `${gym ? "Gym lifts rank on the heaviest weight actually lifted for at least 1 rep, not an estimated 1RM, so light weight for lots of reps doesn't win. " : ""}${standard === "p4p" ? (p4p === "dots" ? "DOTS: your total adjusted for bodyweight, so every size competes fairly." : "Your lift divided by your bodyweight.")
    : standard === "class" ? `IPF weight classes, ${classSex === "M" ? "men" : "women"}: you only compete against lifters in your class.`
    : lower ? "Fastest time wins." : "Best result wins, any bodyweight."} ${help.verified}`;
