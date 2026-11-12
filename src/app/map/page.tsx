"use client";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { equipment, exercises, floor } from "@/lib/data";
import MeButton from "@/components/MeButton";

const Gym3D = dynamic(() => import("@/components/Gym3D"), { ssr: false }); // three.js only on this page

// The SweatZone: an isometric 3D view (components/Gym3D) or the flat floor plan (lib/data `floor` + `equipment`). Tap a
// machine to highlight it and see what it's for. The plain boxes are tables and storage, so they aren't tappable.

function GymMap() {
  const params = useSearchParams();
  const router = useRouter();
  const sel = params.get("e");
  const picked = equipment.find((e) => e.id === sel);
  const zones = [...new Set(equipment.map((e) => e.zone))];
  const usedFor = picked ? Object.entries(exercises).filter(([, v]) => v.equip === picked.id).map(([k]) => k) : [];

  const [plan, setPlan] = useState(false);
  const select = (id?: string) => {
    const p = new URLSearchParams(params);
    if (id) p.set("e", id); else p.delete("e");
    router.replace(`/map?${p}`, { scroll: false });
  };
  const t = params.get("t");

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={t ? `/?t=${t}` : "/"} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="h-title">Gym map</h1>
          <p className="muted text-sm">{picked ? `${picked.name} · ${picked.zone}` : "Tap any equipment"}</p>
        </div>
        <MeButton className="ml-auto" />
      </header>

      <div className="flex gap-2" role="group" aria-label="Map view">
        <button className="chip" aria-pressed={!plan} onClick={() => setPlan(false)}>3D</button>
        <button className="chip" aria-pressed={plan} onClick={() => setPlan(true)}>Floor plan</button>
      </div>

      {!plan ? <div className="card overflow-hidden p-0"><Gym3D sel={picked?.id} onPick={select} /></div> : <div className="card py-2">
        <svg viewBox={floor.viewBox} className="mx-auto max-h-[70dvh] w-full" role="img" aria-label="APU gym floor plan">
          <polygon points={floor.outline} className="fill-zinc-50 stroke-zinc-300 dark:fill-zinc-950 dark:stroke-zinc-700" strokeWidth="3" />
          {floor.tables.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="2" strokeDasharray="4 3" strokeWidth="1.5" aria-hidden
              className="fill-white stroke-zinc-300 dark:fill-zinc-900/60 dark:stroke-zinc-800" />
          ))}
          {equipment.map((e) => {
            const on = e.id === sel;
            const text = e.label;
            const tall = e.h > e.w * 1.5;
            const long = tall ? e.h : e.w, thin = tall ? e.w : e.h;
            const size = Math.min(14, (long * 1.7) / text.length, thin * 0.62);
            const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
            return (
              <g key={e.id} onClick={() => select(e.id)} className="cursor-pointer">
                <rect x={e.x} y={e.y} width={e.w} height={e.h} rx="4" strokeWidth="2"
                  className={on ? "fill-lime-400 stroke-lime-600" : "fill-zinc-200 stroke-zinc-400 hover:fill-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600"}>
                  {on && <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite" />}
                </rect>
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={size}
                  transform={tall ? `rotate(90 ${cx} ${cy})` : undefined}
                  className={on ? "pointer-events-none fill-zinc-950 font-bold" : "pointer-events-none fill-zinc-600 dark:fill-zinc-400"}>{text}</text>
              </g>
            );
          })}
        </svg>
      </div>}

      {picked && usedFor.length > 0 && (
        <section className="card"><p className="muted text-sm">Used for: {usedFor.join(", ")}</p></section>
      )}

      {zones.map((z) => (
        <section key={z}>
          <h2 className="muted mb-2 text-xs font-semibold uppercase tracking-wider">{z}</h2>
          <div className="flex flex-wrap gap-2">
            {equipment.filter((e) => e.zone === z).map((e) => (
              <button key={e.id} aria-pressed={e.id === sel} onClick={() => select(e.id)} className="chip">
                {e.name}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function MapPage() {
  return <Suspense><GymMap /></Suspense>;
}
