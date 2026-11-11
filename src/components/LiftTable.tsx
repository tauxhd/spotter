import type { RankedLift } from "@/lib/workout";
import { w, type Unit } from "@/lib/units";

const day = (t: number) => new Date(t).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "2-digit" });

// Lifts ranked by the 1RM they work out to, with the date each was first done. ranked = numbered list of whole sets.
export default function LiftTable({ lifts, u, added, ranked }: { lifts: RankedLift[]; u: Unit; added?: boolean; ranked?: boolean }) {
  const kg = (v: number) => (added ? (v > 0 ? `+${w(v, u)}` : "BW") : w(v, u));
  const cols = ranked ? "grid-cols-[2rem_1fr_auto_4.5rem]" : "grid-cols-[2.5rem_1fr_auto_4.5rem]";
  return (
    <>
      <div className={`muted grid ${cols} gap-2 border-b border-zinc-100 py-2 text-xs font-semibold dark:border-zinc-800/60`}>
        <span>{ranked ? "#" : "Reps"}</span><span>{ranked ? "Set" : "Best"}</span><span>Date</span><span className="text-right">Est. 1RM</span>
      </div>
      <ul>
        {lifts.map((l, i) => (
          <li key={`${l.kg}x${l.reps}`} className={`grid ${cols} items-center gap-2 border-b border-zinc-100 py-2.5 tabular-nums last:border-0 dark:border-zinc-800/60`}>
            <span className={ranked ? "muted text-sm" : "font-semibold"}>{ranked ? i + 1 : l.reps}</span>
            <span>{ranked ? `${kg(l.kg)} × ${l.reps}` : kg(l.kg)}</span>
            <span className="muted text-xs">{day(l.at)}</span>
            <span className={`text-right ${i === 0 ? "font-semibold text-lime-600 dark:text-lime-400" : "muted"}`}>{added ? "+" : ""}{w(Math.round(l.orm * 10) / 10, u)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
