"use client";
// Stats: a month calendar with the days you trained filled in. Arrows step through months.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { trainedDays, type PostLike } from "@/lib/progress";

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function TrainCalendar({ posts }: { posts: PostLike[] }) {
  const [now] = useState(() => new Date());
  const [at, setAt] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const days = trainedDays(posts, at.y, at.m);
  const lead = (new Date(at.y, at.m, 1).getDay() + 6) % 7, len = new Date(at.y, at.m + 1, 0).getDate();
  const step = (d: number) => setAt(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const isNow = at.y === now.getFullYear() && at.m === now.getMonth();

  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{MONTH[at.m]} {at.y} <span className="muted text-sm font-normal">· {days.size} day{days.size === 1 ? "" : "s"} trained</span></h2>
        <div className="flex">
          <button onClick={() => step(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center"><ChevronLeft size={18} /></button>
          <button onClick={() => step(1)} disabled={isNow} aria-label="Next month" className="grid h-8 w-8 place-items-center disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="muted py-1 font-semibold">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {Array.from({ length: len }, (_, i) => {
          const d = i + 1, n = days.get(d) ?? 0, today = isNow && d === now.getDate();
          return (
            <span key={d} title={n ? `${n} workout${n > 1 ? "s" : ""}` : undefined}
              className={`mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full tabular-nums ${n ? "bg-lime-500 font-bold text-zinc-950" : "muted"} ${today ? "ring-2 ring-lime-500 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950" : ""}`}>{d}</span>
          );
        })}
      </div>
    </section>
  );
}
