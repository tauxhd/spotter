"use client";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { equipKinds, equipment, exercises, floor } from "@/lib/data";
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
  const [tab, setTab] = useState<string>();
  const zone = tab ?? picked?.zone ?? zones[0]; // follows the picked machine until you choose a zone yourself
  const kind = equipKinds.find((k) => k.items.some((e) => e.id === sel));
  const select = (id?: string) => {
    setTab(undefined);
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
          {(([x, y, w, h]) => (
            <g aria-label="Entrance">
              <rect x={x} y={y} width={w} height={h} className="fill-lime-400" />
              <text x={x - 8} y={y + h / 2} textAnchor="middle" fontSize="13" transform={`rotate(-90 ${x - 8} ${y + h / 2})`} className="fill-lime-500 font-bold">Entrance</text>
            </g>
          ))(floor.door)}
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

      {/* compact picker: zone tabs, one scrolling row of machine kinds, then unit numbers for kinds with several */}
      <section className="space-y-3">
        <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4">
          {zones.map((z) => <button key={z} className="tab shrink-0" aria-pressed={z === zone} onClick={() => setTab(z)}>{z}</button>)}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {equipKinds.filter((k) => k.zone === zone).map((k) => (
            <button key={k.name} className="chip" aria-pressed={k === kind} onClick={() => select(k.items[0].id)}>
              {k.name}{k.items.length > 1 && <span className="ml-1 opacity-60">×{k.items.length}</span>}
            </button>
          ))}
        </div>
        {kind && kind.items.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {kind.items.map((e, i) => (
              <button key={e.id} aria-label={e.name} aria-pressed={e.id === sel} onClick={() => select(e.id)} className="chip grid h-8 w-8 place-items-center px-0">{i + 1}</button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MapPage() {
  return <Suspense><GymMap /></Suspense>;
}
