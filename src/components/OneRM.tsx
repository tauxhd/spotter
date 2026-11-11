import Icon from "./Icon";
import { w, type Unit } from "@/lib/units";

// Best estimated 1RM from sets you've actually logged. Pull-ups / dips read "+30 kg" (weight added on top of bodyweight).
export default function OneRM({ kg, added, u, className = "" }: { kg?: number; added?: boolean; u: Unit; className?: string }) {
  if (!kg || kg <= 0) return null;
  return (
    <span className={`muted flex items-center gap-1 text-xs ${className}`}>
      <Icon name="medal" size={14} />1RM
      <b className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{added ? "+" : ""}{w(Math.round(kg * 10) / 10, u)}</b>
    </span>
  );
}
