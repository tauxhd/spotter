"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import LiftTable from "@/components/LiftTable";
import { useStore } from "@/lib/store";
import { bodyFor, isLoadedBodyweight } from "@/lib/strength";
import { rankedLifts } from "@/lib/workout";
import MeButton from "@/components/MeButton";
import InfoTip from "@/components/InfoTip";
import { help } from "@/lib/help";

// Every set you've done of one exercise, ranked by the 1RM it works out to.
export default function AllLifts() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { s, me, u } = useStore();
  const ex = s.library.find((e) => e.id === id);
  if (!ex) return s.library.length ? <EmptyState art="not-found" title="Exercise not found" className="mt-16" /> : null;
  const lifts = rankedLifts(s.sessions, ex.name, bodyFor(s.library, Number(me.bw))(ex.name));

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">All lifts</h1>
        <MeButton size={32} className="justify-self-end" />
      </header>
      <p className="font-semibold">{ex.name}</p>
      <p className="muted mb-2 flex items-center gap-1.5 text-xs">{lifts.length} different sets, strongest first<InfoTip text={help.lifts} size={13} /></p>
      {lifts.length ? <LiftTable lifts={lifts} u={u} added={isLoadedBodyweight(id)} ranked /> : <EmptyState art="stats" title="No sets logged yet" className="mt-6" />}
    </div>
  );
}
