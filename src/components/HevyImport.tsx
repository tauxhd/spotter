"use client";
// Settings: bring your Hevy history over, two ways. Sync: paste your Hevy API key once (Hevy Pro: Settings > Developer),
// then one tap fetches every workout (and new ones later). Or pick Hevy's CSV export. Both convert like a finished workout
// and skip workouts already here, so syncing again only adds what's new.
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import { convert, fromApi, readHevy, type ApiWorkout, type HevyWorkout } from "@/lib/hevy";
import { useStore } from "@/lib/store";

const KEY = "spotter:hevyKey"; // on this device only

export default function HevyImport() {
  const { s, me, importHevy, demo } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy?: string; done?: string; err?: string; unmatched?: string[] }>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [key, setKey] = useState("");
  useEffect(() => { try { setSaved(localStorage.getItem(KEY)); } catch {} }, []);

  // converted, saved, summarised: shared by the API sync and the CSV file
  async function bring(ws: HevyWorkout[]) {
    if (!ws.length) throw new Error("No workouts found in your Hevy history.");
    setState({ busy: `Converting ${ws.length} workouts…` });
    const before = s.sessions.map((x) => ({ at: x.at, exercises: x.exercises }));
    const { items, lifts, unmatched } = convert(ws, s.library, { squat: Number(me.squat), bench: Number(me.bench), deadlift: Number(me.deadlift), bw: Number(me.bw) }, before);
    setState({ busy: `Saving ${items.length} workouts…` });
    const n = await importHevy(items, lifts);
    setState({ done: n ? `Imported ${n} workout${n === 1 ? "" : "s"} from Hevy${items.length > n ? ` (${items.length - n} were already here)` : ""}.` : "You're up to date: everything from Hevy is already in Spotter.", unmatched });
  }

  async function sync(k: string) {
    setState({ busy: "Fetching your workouts from Hevy…" });
    try {
      const r = await fetch("/api/hevy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: k.trim() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't reach Hevy");
      try { localStorage.setItem(KEY, k.trim()); } catch {}
      setSaved(k.trim()); setKey("");
      await bring(fromApi(j.workouts as ApiWorkout[]));
    } catch (e) { setState({ err: (e as Error).message }); }
  }

  async function pick(f?: File) {
    if (!f) return;
    setState({ busy: "Reading your Hevy export…" });
    try { await bring(readHevy(await f.text())); } catch (e) { setState({ err: (e as Error).message }); }
    finally { if (input.current) input.current.value = ""; }
  }

  const busy = !!state.busy || demo;
  return (
    <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
      <h2 className="font-semibold">Import from Hevy</h2>

      {saved ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button onClick={() => sync(saved)} disabled={busy} className="btn flex items-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={16} className={state.busy ? "animate-spin" : ""} />{state.busy ? "Syncing…" : "Sync from Hevy"}
          </button>
          <button onClick={() => { try { localStorage.removeItem(KEY); } catch {} setSaved(null); }} className="muted text-xs font-semibold underline-offset-2 hover:underline">Forget API key</button>
        </div>
      ) : (
        <>
          <p className="muted mt-1 text-sm">One tap with Hevy Pro: copy your API key from hevy.com → Settings → Developer and paste it here. It stays on this device.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (key.trim()) sync(key); }} className="mt-2 flex gap-2">
            <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" placeholder="Hevy API key" aria-label="Hevy API key"
              className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900" />
            <button disabled={busy || !key.trim()} className="btn flex shrink-0 items-center gap-2 px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} />Sync</button>
          </form>
        </>
      )}

      <p className="muted mt-3 text-sm">No Hevy Pro? In Hevy: Settings → Export Data → Export Workout Data, then pick the file:</p>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button onClick={() => input.current?.click()} disabled={busy} className="btn-ghost mt-2 flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50">
        <Upload size={16} />Choose Hevy CSV
      </button>

      {demo && <p className="muted mt-2 text-xs">Create your own account to import (the demo doesn&apos;t save).</p>}
      {state.busy && <p className="muted mt-2 text-sm" aria-live="polite">{state.busy}</p>}
      {state.done && <p className="mt-2 text-sm font-semibold text-lime-600 dark:text-lime-400" aria-live="polite">{state.done}</p>}
      {state.err && <p className="mt-2 text-sm text-red-500" aria-live="polite">{state.err}</p>}
      {!!state.unmatched?.length && <p className="muted mt-1 text-xs">Not in Spotter&apos;s library, kept under their Hevy name: {state.unmatched.join(", ")}.</p>}
      <p className="muted mt-2 text-xs">Workouts, sets and PRs come over. Photos don&apos;t (Hevy doesn&apos;t share them).</p>
    </section>
  );
}
