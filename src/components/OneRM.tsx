import Icon from "./Icon";
import { w, type Unit } from "@/lib/units";

// "Best 1RM 98 kg" from logged sets, or "Est. 1RM ~80 kg" worked out from the student's main lifts. Pull-ups / dips read "+30 kg".
export default function OneRM({ logged, est, added, u, className = "" }: { logged?: number; est: number | null; added?: boolean; u: Unit; className?: string }) {
  const kg = logged || est;
  if (!kg && kg !== 0) return null;
  return (
    <span className={`muted flex items-center gap-1 text-xs ${className}`}>
      <Icon name="medal" size={14} />{logged ? "Best 1RM" : "Est. 1RM"}
      <b className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{logged ? "" : "~"}{added ? "+" : ""}{w(Math.round(kg * 10) / 10, u)}</b>
    </span>
  );
}
