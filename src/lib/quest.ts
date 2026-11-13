// The first-launch "quest" (shared by the website and the phone app): Spot the mascot talks you through sign-in, body,
// lifts and a nutrition plan, one step at a time, with XP for every step. Art: /quest/*.webp (ChatGPT-generated).
import type { Goal } from "./nutrition";

export type Pose = "wave" | "talk" | "think" | "jump" | "flex" | "thumbs" | "point" | "eat" | "celebrate";
export type StepId = "hello" | "login" | "found" | "body" | "lifts" | "goal" | "activity" | "stats" | "done";

export const steps: { id: StepId; pose: Pose; xp: number; say: (name: string) => string }[] = [
  { id: "hello", pose: "wave", xp: 0, say: () => "Hey! I’m Spot, your gym buddy at APU. Let’s set you up. It takes about a minute." },
  { id: "login", pose: "talk", xp: 50, say: () => "First things first: who are you? Make your account." },
  { id: "found", pose: "jump", xp: 100, say: (n) => `Nice to meet you, ${n}! Here’s your student card.` },
  { id: "body", pose: "think", xp: 60, say: () => "How much do you weigh? I need it for your DOTS score and your calories." },
  { id: "lifts", pose: "flex", xp: 60, say: () => "Got any PRs? Flex on me. Skip if you’re new, I’ll track them as you lift." },
  { id: "goal", pose: "point", xp: 80, say: () => "What’s the mission? Pick one, you can change it any time." },
  { id: "activity", pose: "thumbs", xp: 50, say: () => "How active are you in a normal week?" },
  { id: "stats", pose: "eat", xp: 100, say: () => "Last bit! Your height, age and the weight you’re aiming for, so I can plan your meals." },
  { id: "done", pose: "celebrate", xp: 0, say: (n) => `Quest complete, ${n}! Here’s your daily plan. Let’s go lift.` },
];

export const totalXp = steps.reduce((s, x) => s + x.xp, 0);

// What Spot says right after you pick something.
export const goalReply: Record<Goal, string> = {
  "lean-bulk": "Lean bulk! Slow, clean gains. Protein is your new best friend.",
  cut: "A cut for trained lifters. High protein keeps your muscle while the fat goes.",
  "fat-loss": "Fat loss at a pace you can actually stick to. Nice.",
  recomp: "Recomp: build muscle and lose fat at the same time. Ambitious, I like it.",
  maintain: "Maintain. Keep the weight, keep getting stronger.",
};
export const activityReply = (label: string) =>
  label === "High" ? "Beast mode. I’ll feed you accordingly." : label === "Light" ? "No worries, every session counts." : "Solid routine. That’s the sweet spot.";

export const bwReply = (kg: number) => (kg < 50 ? "Light and quick!" : kg < 75 ? "Nice, noted." : kg < 95 ? "Solid. Noted." : "Big unit. Respect.");

export const questArt = (name: string) => `/quest/${name}.webp`;
