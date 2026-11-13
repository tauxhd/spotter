"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Icon from "./Icon";
import { useStore } from "@/lib/store";
import { hhmmss } from "@/lib/lifting";

// Floating reminder above the tab bar while a workout is running and you're on another tab. Tap to go back to it.
function OngoingWorkout({ q }: { q: string }) {
  const { s } = useStore();
  const a = s.active;
  const [, tick] = useState(0);
  useEffect(() => { if (!a) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [a]);
  if (!a) return null;
  const secs = Math.max(0, Math.floor((Date.now() - new Date(a.startedAt).getTime()) / 1000));
  const done = a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
  const total = a.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <>
    <div aria-hidden className="h-16" />{/* extra room at the page end so the card never covers the last item */}
    <Link href={`/train${q}`} aria-label={`Workout in progress, ${hhmmss(secs)}. Go back to it`}
      className="glass-bar anim-slide-up fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 mx-auto flex print:hidden max-w-md items-center gap-3 rounded-2xl px-3 py-2 shadow-lg ring-1 ring-black/5 active:scale-[0.98] dark:ring-white/10">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-500/15">
        <Icon name="train" size={22} />
        <span className="absolute right-0.5 top-0.5 h-2 w-2 animate-pulse rounded-full bg-lime-500" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">{a.title === "Workout" ? "Workout in progress" : a.title}</span>
        <span className="muted block text-xs tabular-nums">{hhmmss(secs)} · {done}/{total} sets</span>
      </span>
      <ChevronRight size={18} className="muted shrink-0" />
    </Link>
    </>
  );
}

const tabs = [
  { href: "/", label: "Gym", icon: "gym" },
  { href: "/train", label: "Train", icon: "train" },
  { href: "/eat", label: "Eat", icon: "eat" },
  { href: "/board", label: "Ranks", icon: "ranks" },
  { href: "/feed", label: "Feed", icon: "feed" },
] as const;

export default function Nav() {
  const path = usePathname();
  const t = useSearchParams().get("t"); // keep demo time across tabs
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <>
    {/* a sibling, not inside the nav: a blur nested in a blurred bar can't see the page behind it */}
    {!path.startsWith("/train") && <OngoingWorkout q={q} />}
    <nav className="glass-bar fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-[2rem] print:hidden">
      <ul className="flex justify-around p-1.5">
        {tabs.map(({ href, label, icon }) => {
          const active = href === "/" ? path === "/" || path === "/map" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href + q}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-[1.4rem] px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  active ? "bg-black/5 text-lime-600 ring-1 ring-black/5 dark:bg-white/10 dark:text-lime-400 dark:ring-white/10" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Icon name={icon} size={28} className={`transition ${active ? "scale-110" : "opacity-60 grayscale"}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}
