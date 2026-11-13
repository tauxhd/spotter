"use client";
// Settings: bring your Hevy history over. Reads Hevy's CSV export in the browser, converts it like a finished workout,
// and saves it to your account (workouts already here are skipped, so running it twice is safe).
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { convert, readHevy } from "@/lib/hevy";
import { useStore } from "@/lib/store";

export default function HevyImport() {
  const { s, me, importHevy, demo } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy?: string; done?: string; err?: string; unmatched?: string[] }>({});

  async function pick(f?: File) {
    if (!f) return;
    setState({ busy: "Reading your Hevy export…" });
    try {
      const ws = readHevy(await f.text());
      if (!ws.length) throw new Error("No workouts found in that file.");
      setState({ busy: `Converting ${ws.length} workouts…` });
      const before = s.sessions.map((x) => ({ at: x.at, exercises: x.exercises }));
      const { items, lifts, unmatched } = convert(ws, s.library, { squat: Number(me.squat), bench: Number(me.bench), deadlift: Number(me.deadlift), bw: Number(me.bw) }, before);
      setState({ busy: `Saving ${items.length} workouts…` });
      const n = await importHevy(items, lifts);
      setState({ done: n ? `Imported ${n} workout${n === 1 ? "" : "s"} from Hevy${items.length > n ? ` (${items.length - n} were already here)` : ""}.` : "Everything in that file is already in Spotter.", unmatched });
    } catch (e) {
      setState({ err: (e as Error).message });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
      <h2 className="font-semibold">Import from Hevy</h2>
      <ol className="muted mt-1 list-decimal space-y-0.5 pl-5 text-sm">
        <li>In Hevy (app or hevy.com): Settings → Export Data → Export Workout Data.</li>
        <li>Pick the CSV file here. Your workouts, sets and PRs come over; photos don&apos;t.</li>
      </ol>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button onClick={() => input.current?.click()} disabled={!!state.busy || demo} className="btn mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
        <Upload size={16} />{state.busy ? "Importing…" : "Choose Hevy CSV"}
      </button>
      {demo && <p className="muted mt-2 text-xs">Create your own account to import (the demo doesn&apos;t save).</p>}
      {state.busy && <p className="muted mt-2 text-sm" aria-live="polite">{state.busy}</p>}
      {state.done && <p className="mt-2 text-sm font-semibold text-lime-600 dark:text-lime-400" aria-live="polite">{state.done}</p>}
      {state.err && <p className="mt-2 text-sm text-red-500" aria-live="polite">{state.err}</p>}
      {!!state.unmatched?.length && <p className="muted mt-1 text-xs">Not in Spotter&apos;s library, kept under their Hevy name: {state.unmatched.join(", ")}.</p>}
    </section>
  );
}
