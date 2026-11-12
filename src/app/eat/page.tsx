"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import EatProgress from "@/components/EatProgress";
import Icon from "@/components/Icon";
import { useStore } from "@/lib/store";
import { demoNow, foods, highProtein, slug, stalls } from "@/lib/data";
import { goals, nutrition } from "@/lib/nutrition";

type Food = Omit<(typeof foods)[number], "stall">;

// Dish illustration if it's a cafeteria item, otherwise a plain tile (photo / Gemini entries).
function Thumb({ name, size = 48 }: { name: string; size?: number }) {
  const known = foods.some((f) => f.name === name);
  return known
    ? <Image src={`/food/${slug(name)}.webp`} alt="" width={size} height={size} className="shrink-0 rounded-xl bg-zinc-900" />
    : <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-xl bg-zinc-900 text-lime-400"><Sparkles size={size / 2.4} /></span>;
}
const ALL = "All", HP = "High protein";

export default function Eat() {
  const { s, me, addFood, removeFood } = useStore();
  // Today / Progress; the hash keeps Progress open after visiting the plan page and coming back
  const [view, setViewRaw] = useState<"today" | "progress">(() => (typeof window !== "undefined" && location.hash === "#progress" ? "progress" : "today"));
  const setView = (v: "today" | "progress") => { setViewRaw(v); history.replaceState(null, "", v === "progress" ? "#progress" : location.pathname + location.search); };
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string>(ALL);
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState<(Food & { ai: boolean }) | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const today = demoNow().toDateString();
  const log = s.food.filter((f) => new Date(f.at).toDateString() === today);
  const sum = log.reduce((t, f) => ({ kcal: t.kcal + f.kcal, p: t.p + f.p, c: t.c + f.c, f: t.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 });

  const add = ({ name, kcal, p, c, f }: Food) => addFood({ name, kcal, p, c, f });

  // Photo -> /api/meal (Gemini). Without a GEMINI_API_KEY on the server it falls back to a demo guess so the flow still demos.
  async function analyse(photo: File) {
    setBusy(true);
    setGuess(null);
    const body = new FormData();
    body.append("photo", photo);
    const r = await fetch("/api/meal", { method: "POST", body }).catch(() => null);
    const ai = r?.ok ? await r.json() : null;
    if (!ai) await new Promise((ok) => setTimeout(ok, 1000));
    setGuess(ai ? { ...ai, ai: true } : { ...foods[Math.floor(Math.random() * foods.length)], ai: false });
    setBusy(false);
    if (file.current) file.current.value = "";
  }
  const macros = [
    { k: "p", label: "Protein", unit: "g", bar: "bg-sky-500", icon: "protein" },
    { k: "c", label: "Carbs", unit: "g", bar: "bg-amber-500", icon: "carbs" },
    { k: "f", label: "Fat", unit: "g", bar: "bg-pink-500", icon: "fat" },
  ] as const;
  const n = nutrition(me, s.food, s.weights);
  const targets = n.targets;
  const left = targets.kcal - Math.round(sum.kcal);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="h-title flex items-center gap-2"><Icon name="eat" size={34} />Eat</h1>
        <Link href={`/eat/plan${location.search}`} className="muted flex items-center gap-0.5 text-sm">{goals[n.goal].label} · {targets.kcal} kcal target<ChevronRight size={14} /></Link>
      </header>

      <div className="grid grid-cols-2 rounded-lg bg-zinc-100 p-0.5 text-sm font-semibold dark:bg-zinc-900" role="tablist">
        {(["today", "progress"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
            className={`rounded-md py-1.5 capitalize transition ${view === v ? "bg-white shadow-sm dark:bg-zinc-700" : "muted"}`}>{v}</button>
        ))}
      </div>

      {view === "progress" ? <EatProgress /> : <>

      <section className="card">
        <div className="flex items-center gap-3">
          <Icon name="target" size={44} />
          <div className="flex-1">
            <p className="text-3xl font-bold leading-none tabular-nums">{Math.abs(left)}</p>
            <p className="muted mt-1 text-sm">{left >= 0 ? "kcal left today" : "kcal over target"}</p>
          </div>
          <p className="muted self-start text-sm tabular-nums">{Math.round(sum.kcal)} / {targets.kcal}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
          <div className={`anim-grow h-full rounded-sm ${left >= 0 ? "bg-lime-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, (sum.kcal / targets.kcal) * 100)}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {macros.map((m, mi) => (
            <div key={m.k}>
              <p className="muted flex items-center gap-1 text-xs"><Icon name={m.icon} size={16} />{m.label}</p>
              <p className="text-sm font-semibold tabular-nums">{Math.round(sum[m.k])}<span className="muted font-normal">/{targets[m.k]}{m.unit}</span></p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                <div className={`anim-grow h-full rounded-sm ${m.bar}`} style={{ width: `${Math.min(100, (sum[m.k] / targets[m.k]) * 100)}%`, "--i": mi + 1 } as React.CSSProperties} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <label className="flex cursor-pointer items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-zinc-900 dark:bg-zinc-800">{busy ? <Sparkles size={22} className="animate-pulse text-lime-400" /> : <Icon name="camera" size={36} />}</span>
          <span className="flex-1">
            <span className="block font-semibold">{busy ? "Estimating macros…" : "Snap your meal"}</span>
            <span className="muted block text-sm">AI estimates calories and macros from a photo</span>
          </span>
          <input ref={file} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && analyse(e.target.files[0])} />
        </label>
        {guess && (
          <div className="mt-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <Thumb name={guess.name} size={56} />
              <div className="min-w-0">
                <p className="muted text-xs">{guess.ai ? "Gemini estimate · check before adding" : "Looks like (demo estimate)"}</p>
                <p className="font-semibold">{guess.name}</p>
                <p className="muted text-sm tabular-nums">{guess.kcal} kcal · P {guess.p} · C {guess.c} · F {guess.f}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => { add(guess); setGuess(null); }} className="btn flex-1 py-2 text-sm">Add to log</button>
              <button onClick={() => setGuess(null)} className="btn-ghost py-2 text-sm">Not it</button>
            </div>
          </div>
        )}
      </section>

      {log.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="plate" size={22} />Today</h2>
          <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {log.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                <Thumb name={f.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="muted text-xs tabular-nums">{f.kcal} kcal · P {f.p} · C {f.c} · F {f.f}</p>
                </div>
                <button aria-label={`Remove ${f.name}`} onClick={() => removeFood(f.id)} className="muted p-1"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">APU cafeteria</h2>
        <p className="muted -mt-1 text-xs">Typical portions, estimated. Tap + to log.</p>
        <div className="relative">
          <Search size={16} className="muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search food…" aria-label="Search food"
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-base outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-1" role="group" aria-label="Filter by stall">
          {[ALL, HP, ...stalls].map((x) => {
            const on = pick === x;
            return (
              <button key={x} aria-pressed={on} onClick={(e) => { setPick(x); e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }} className="flex w-16 shrink-0 flex-col items-center gap-1 transition active:scale-95">
                <span className={`grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-zinc-900 text-lime-400 ring-2 transition ${on ? "ring-lime-500" : "ring-transparent"}`}>
                  {x === ALL ? <Icon name="all" size={42} /> : x === HP ? <Icon name="high-protein" size={42} /> : <Image src={`/stalls/${slug(x)}.webp`} alt="" width={56} height={56} />}
                </span>
                <span className={`text-[11px] leading-tight ${on ? "font-bold" : "muted font-medium"}`}>{x === HP ? "High protein" : x}</span>
              </button>
            );
          })}
        </div>
        <ul>
          {foods.filter((f) => (pick === ALL || (pick === HP ? highProtein(f) : f.stall === pick)) && `${f.name} ${f.stall}`.toLowerCase().includes(q.toLowerCase())).map((f) => (
            <li key={f.stall + f.name} className="card relative flex gap-3 py-3 transition active:bg-zinc-100 dark:active:bg-zinc-900/60">
              <Thumb name={f.name} size={88} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    {/* the whole card opens the dish: this link stretches over it (the + button sits above) */}
                    <Link href={`/eat/${slug(f.name)}${location.search}`} className="font-semibold leading-snug after:absolute after:inset-0">{f.name}</Link>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-bold uppercase tracking-wide">
                      {pick !== f.stall && <span className="rounded-sm bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{f.stall}</span>}
                      {highProtein(f) && <span className="rounded-sm bg-lime-100 px-2 py-0.5 text-lime-700 dark:bg-lime-400/10 dark:text-lime-400">High protein</span>}
                    </div>
                  </div>
                  <button aria-label={`Add ${f.name}`} onClick={() => add(f)} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-500 text-zinc-950 shadow-sm shadow-lime-500/30 active:scale-95"><Plus size={18} strokeWidth={2.5} /></button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-y-0.5">
                  {([["kcal", f.kcal, "kcal"], ["protein", f.p, "prot"], ["carbs", f.c, "carb"], ["fat", f.f, "fat"]] as const).map(([icon, v, unit]) => (
                    <span key={icon} className="flex items-center gap-1 text-xs">
                      <Icon name={icon} size={14} />
                      <span className="font-bold tabular-nums">{v}{icon === "kcal" ? "" : "g"}</span>
                      <span className="muted text-[11px]">{unit}</span>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      </>}
    </div>
  );
}
