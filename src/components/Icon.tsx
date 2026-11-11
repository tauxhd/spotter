import Image from "next/image";

// Custom illustrated icons (generated with ChatGPT, see public/icons). Decorative: pair with a text label.
export type IconName = "all" | "high-protein" | "kcal" | "protein" | "carbs" | "fat" | "camera" | "plate" | "target"
  | "gym" | "train" | "eat" | "ranks" | "feed" | "map" | "qr" | "calendar" | "crowd"
  | "p4p" | "squat" | "bench" | "deadlift" | "scale" | "barbell" | "faculty" | "medal" | "verified"
  | "ohp" | "clean" | "pullup" | "pushup" | "plank" | "vjump" | "broadjump" | "sprint" | "run"
  | "tick" | "tick-box" | "tick-circle" | "cross" | "cross-box" | "cross-circle" | "plus" | "plus-circle" | "trash";

export default function Icon({ name, size = 24, className = "" }: { name: IconName; size?: number; className?: string }) {
  return <Image src={`/icons/${name}.webp`} alt="" width={size} height={size} className={`shrink-0 ${className}`} />;
}
