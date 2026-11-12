"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { equipment, exercises, floor } from "@/lib/data";
import MeButton from "@/components/MeButton";

// ponytail: 2D plan traced from the team's sketch. Swap in the Blender model (.glb via <model-viewer>) later;
// the equipment ids stay the same and become hotspot names.
const short: Record<string, string> = { dbs: "Dumbbells", dbseat1: "DB Bench", dbseat2: "DB Bench", bench1: "Bench", bench2: "Incline" };
const label = (e: { id: string }) => short[e.id] ?? e.id.slice(1); // unlabelled boxes show their number

function GymMap() {
  const params = useSearchParams();
  const router = useRouter();
  const sel = params.get("e");
  const picked = equipment.find((e) => e.id === sel);
  const zones = [...new Set(equipment.map((e) => e.zone))];
  const usedFor = picked ? Object.entries(exercises).filter(([, v]) => v.equip === picked.id).map(([k]) => k) : [];

  const select = (id: string) => {
    const p = new URLSearchParams(params);
    p.set("e", id);
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

      <div className="card py-2">
        <svg viewBox="155 130 625 1155" className="mx-auto max-h-[70dvh] w-full" role="img" aria-label="APU gym floor plan">
          <polygon points={floor.outline} className="fill-zinc-50 stroke-zinc-300 dark:fill-zinc-950 dark:stroke-zinc-700" strokeWidth="3" />
          {floor.pillars.map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} className="fill-zinc-300 dark:fill-zinc-700" aria-hidden />
          ))}
          {equipment.map((e) => {
            const on = e.id === sel;
            const text = label(e);
            const tall = e.h > e.w * 1.5;
            const long = tall ? e.h : e.w, thin = tall ? e.w : e.h;
            const size = Math.min(22, (long * 1.6) / text.length, thin * 0.7);
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
      </div>

      {picked && usedFor.length > 0 && (
        <section className="card"><p className="muted text-sm">Used for: {usedFor.join(", ")}</p></section>
      )}

      {zones.map((z) => (
        <section key={z}>
          <h2 className="muted mb-2 text-xs font-semibold uppercase tracking-wider">{z}</h2>
          <div className="flex flex-wrap gap-2">
            {equipment.filter((e) => e.zone === z).map((e) => (
              <button key={e.id} aria-pressed={e.id === sel} onClick={() => select(e.id)} className="chip">
                {e.name.startsWith("Unlabelled") ? `#${label(e)}` : e.name}
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
