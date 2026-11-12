"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Plus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Icon from "@/components/Icon";
import { useStore } from "@/lib/store";
import { calSplit, demoNow, foodBySlug, foods, highProtein, slug } from "@/lib/data";
import { nutrition } from "@/lib/nutrition";
import MeButton from "@/components/MeButton";
import InfoTip from "@/components/InfoTip";
import { help } from "@/lib/help";

const macros = [
  { k: "p", label: "Protein", icon: "protein", bar: "bg-sky-500" },
  { k: "c", label: "Carbs", icon: "carbs", bar: "bg-amber-500" },
  { k: "f", label: "Fat", icon: "fat", bar: "bg-pink-500" },
] as const;

// A cafeteria dish: photo, calories and macros against your daily targets, where the calories come from, log it.
export default function FoodPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { s, me, addFood } = useStore();
  const [added, setAdded] = useState(false);
  const f = foodBySlug(id);
  if (!f) return <EmptyState art="not-found" title="Dish not found" text="It may have left the menu." className="mt-16" />;

  const { targets } = nutrition(me, s.food, s.weights);
  const split = calSplit(f);
  const today = demoNow().toDateString();
  const times = s.food.filter((x) => x.name === f.name && new Date(x.at).toDateString() === today).length;
  const more = foods.filter((x) => x.stall === f.stall && x.name !== f.name);
  const q = typeof window !== "undefined" ? location.search : "";

  function add() { // shows at once; the store saves it in the background
    addFood({ name: f!.name, kcal: f!.kcal, p: f!.p, c: f!.c, f: f!.f });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">{f.stall}</h1>
        <MeButton size={32} className="justify-self-end" />
      </header>

      <section className="-mx-4 border-b border-zinc-200 px-4 pb-4 dark:border-zinc-800/80">
        <Image src={`/food/${slug(f.name)}.webp`} alt="" width={512} height={512} priority className="mx-auto aspect-square w-full max-w-72 rounded-2xl bg-zinc-900 object-cover" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{f.name} <InfoTip text={help.portion} label="About these numbers" size={17} /></h2>
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold uppercase tracking-wide">
          <span className="rounded-sm bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{f.stall}</span>
          {highProtein(f) && <span className="rounded-sm bg-lime-100 px-2 py-0.5 text-lime-700 dark:bg-lime-400/10 dark:text-lime-400">High protein</span>}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-3">
          <Icon name="kcal" size={40} />
          <div className="flex-1">
            <p className="text-3xl font-bold tabular-nums leading-none">{f.kcal}<span className="muted ml-1 text-sm font-normal">kcal</span></p>
            <p className="muted mt-1 text-sm">{Math.round((f.kcal / targets.kcal) * 100)}% of your {targets.kcal} kcal day</p>
          </div>
        </div>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-sm" aria-label="Where the calories come from">
          {macros.map((m) => <div key={m.k} className={m.bar} style={{ width: `${split[m.k] * 100}%` }} />)}
        </div>
        <div className="mt-1.5 flex justify-between text-xs">
          {macros.map((m) => <span key={m.k} className="muted"><span className="font-semibold text-zinc-900 dark:text-zinc-100">{Math.round(split[m.k] * 100)}%</span> {m.label.toLowerCase()}</span>)}
        </div>
      </section>

      <section className="card space-y-3">
        {macros.map((m) => (
          <div key={m.k}>
            <div className="flex items-center gap-2 text-sm">
              <Icon name={m.icon} size={20} />
              <span className="flex-1 font-semibold">{m.label}</span>
              <span className="font-bold tabular-nums">{f[m.k]}g</span>
              <span className="muted w-24 text-right text-xs tabular-nums">{Math.round((f[m.k] / targets[m.k]) * 100)}% of {targets[m.k]}g</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
              <div className={`anim-grow h-full rounded-sm ${m.bar}`} style={{ width: `${Math.min(100, (f[m.k] / targets[m.k]) * 100)}%` }} />
            </div>
          </div>
        ))}
      </section>

      <div className="py-4">
        <button onClick={add} className="btn flex w-full items-center justify-center gap-2">
          {added ? <><Check size={18} />Added to today</> : <><Plus size={18} strokeWidth={2.5} />Add to today&apos;s log</>}
        </button>
        {times > 0 && <p className="muted mt-2 text-center text-xs">Logged {times}× today</p>}
      </div>

      {more.length > 0 && (
        <section className="-mx-4 border-t border-zinc-200 px-4 pt-4 dark:border-zinc-800/80">
          <h2 className="font-semibold">More from {f.stall}</h2>
          <ul className="mt-1">
            {more.map((x) => (
              <li key={x.name}>
                <Link href={`/eat/${slug(x.name)}${q}`} className="flex items-center gap-3 py-2.5 transition active:scale-[0.98]">
                  <Image src={`/food/${slug(x.name)}.webp`} alt="" width={48} height={48} className="shrink-0 rounded-xl bg-zinc-900" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.name}</p>
                    <p className="muted text-xs tabular-nums">{x.kcal} kcal · {x.p}g protein</p>
                  </div>
                  <ChevronRight size={18} className="muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
