import Image from "next/image";

// Empty / not-found states with a ChatGPT illustration (public/empty).
export type EmptyArt = "workouts" | "followers" | "comments" | "routines" | "exercises" | "search" | "podium" | "not-found" | "stats";

export default function EmptyState({ art, title, text, size = 120, className = "", children }:
  { art: EmptyArt; title: string; text?: React.ReactNode; size?: number; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`flex flex-col items-center py-8 text-center ${className}`}>
      <Image src={`/empty/${art}.webp`} alt="" width={size} height={size} />
      <p className="mt-3 font-semibold">{title}</p>
      {text && <p className="muted mt-0.5 max-w-xs text-sm">{text}</p>}
      {children}
    </div>
  );
}
