"use client";
// Best lifts on the stats page: swipe (or tap the dots) between the heaviest weights actually lifted and the estimated
// one-rep maxes, each with its total and DOTS. The phone app's twin is mobile/src/components/best-lifts.tsx.
import { useRef, useState } from "react";
import Icon from "./Icon";
import InfoTip from "./InfoTip";
import { dots } from "@/lib/lifting";
import type { Sex } from "@/lib/data";
import { w, wNum, type Unit } from "@/lib/units";

type Lifts = { squat: number; bench: number; deadlift: number };
export type LiftPage = { title: string; info: string; lifts: Lifts };

export default function BestLifts({ pages, bw, sex, u }: { pages: LiftPage[]; bw: number; sex: Sex; u: Unit }) {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });

  return (
    <section className="-mx-4 border-b border-zinc-200 py-4 dark:border-zinc-800/80">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="flex items-center gap-1.5 font-semibold">{pages[page].title}<InfoTip text={pages[page].info} /></h2>
        <div role="tablist" aria-label="Best lifts" className="flex items-center gap-1.5">
          {pages.map((pg, i) => (
            <button key={pg.title} role="tab" aria-selected={page === i} aria-label={pg.title} onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-300 ${page === i ? "w-5 bg-lime-500" : "w-2 bg-zinc-300 dark:bg-zinc-700"}`} />
          ))}
        </div>
      </div>
      <div ref={track} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {pages.map(({ title, lifts }) => {
          const total = lifts.squat + lifts.bench + lifts.deadlift;
          return (
            <div key={title} className="w-full shrink-0 snap-center px-4" aria-label={title}>
              <div className="grid grid-cols-4 text-center">
                {([["squat", "Squat", lifts.squat], ["bench", "Bench", lifts.bench], ["deadlift", "Deadlift", lifts.deadlift], ["ranks", "Total", total]] as const).map(([icon, k, v]) => (
                  <div key={k} className="flex flex-col items-center">
                    <Icon name={icon} size={44} />
                    <p className="mt-1.5 text-lg font-bold leading-tight tabular-nums">{v ? wNum(v, u) : "–"}</p>
                    <p className="muted text-xs">{k} {u}</p>
                  </div>
                ))}
              </div>
              <p className="muted mt-4 flex items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800/60">
                <Icon name="p4p" size={24} /><span className="font-semibold text-lime-600 dark:text-lime-400">{dots(total, bw, sex).toFixed(1)} DOTS</span> at {w(bw, u)} bodyweight
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
