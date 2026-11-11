"use client";
import { useState } from "react";
import Image from "next/image";
import { faculties, type Sex } from "@/lib/data";

type P = { name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; tp?: string | null; course?: string | null };

// A few APU programmes as suggestions; any course can be typed. (Later this comes from APU records via the TP number.)
const courses = [
  "BSc (Hons) Computer Science", "BSc (Hons) Software Engineering", "BSc (Hons) Information Technology", "BSc (Hons) Cyber Security",
  "BSc (Hons) Computer Science (Data Analytics)", "BSc (Hons) Computer Science (Artificial Intelligence)", "BEng (Hons) Mechatronic Engineering",
  "BEng (Hons) Electrical & Electronic Engineering", "BA (Hons) Business Management", "BA (Hons) Accounting & Finance",
  "BA (Hons) Graphic Design & Multimedia", "BSc (Hons) Psychology", "Diploma in ICT", "Foundation in Computing",
];

// First launch (and the profile screen later): one form. Lifts and intake are optional so beginners aren't put off.
export default function Onboarding({ initial, onSave }: { initial?: P; onSave: (p: P) => Promise<void> }) {
  const [p, setP] = useState<P>(initial ?? { name: "", faculty: faculties[0], sex: "M", bw: 70, squat: 0, bench: 0, deadlift: 0, intake: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const num = (k: keyof P) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const tp = p.tp?.trim().toUpperCase() || null;
    if (tp && !/^TP\d{6}$/.test(tp)) { setErr("TP number looks like TP012345"); setBusy(false); return; }
    try { await onSave({ ...p, name: p.name.trim(), intake: p.intake?.trim().toUpperCase() || null, tp, course: p.course?.trim() || null }); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className={`space-y-5 ${initial ? "" : "pt-6"}`}>
      {!initial && (
        <header>
          <Image src="/welcome.webp" alt="Students training, sipping a shake and scanning in at the gym door" width={1200} height={800} priority
            className="-mx-4 mb-5 w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:w-full sm:rounded-2xl" />
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-lime-600 dark:text-lime-400">
            <Image src="/icon-192.png" alt="" width={24} height={24} className="rounded-md" />Spotter
          </p>
          <h1 className="h-title mt-1">Welcome to the APU gym</h1>
          <p className="muted text-sm">Set up once. This is what other students see on the feed and leaderboard.</p>
        </header>
      )}

      <section className="card space-y-4">
        <label className="block">
          <span className="muted text-xs font-semibold">Display name</span>
          <input required maxLength={40} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="e.g. Arif"
            className="mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800" />
        </label>
        <div className="grid grid-cols-[8.5rem_1fr] gap-3">
          <label className="block">
            <span className="muted text-xs font-semibold">TP number</span>
            <input value={p.tp ?? ""} onChange={(e) => setP({ ...p, tp: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) })} placeholder="TP012345"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-describedby="tp-hint"
              className="mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base uppercase tabular-nums outline-none placeholder:normal-case focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800" />
          </label>
          <label className="block">
            <span className="muted text-xs font-semibold">Course</span>
            <input value={p.course ?? ""} onChange={(e) => setP({ ...p, course: e.target.value.slice(0, 80) })} list="apu-courses" placeholder="e.g. BSc (Hons) Computer Science"
              className="mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800" />
            <datalist id="apu-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>
        <p id="tp-hint" className="muted -mt-2 text-xs">Your APU student ID. It will link Spotter to your APU records later.</p>
        <label className="block">
          <span className="muted text-xs font-semibold">Faculty</span>
          <select value={p.faculty} onChange={(e) => setP({ ...p, faculty: e.target.value })}
            className="mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800">
            {faculties.map((f) => <option key={f}>{f}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="muted text-xs font-semibold">Intake code <span className="font-normal">(optional, finds gym time between your classes)</span></span>
          <input value={p.intake ?? ""} onChange={(e) => setP({ ...p, intake: e.target.value.toUpperCase().replace(/[^A-Z0-9()]/g, "") })} placeholder="e.g. APD2F2602CS" maxLength={30}
            className="mt-1 w-full rounded-xl bg-zinc-100 px-3 py-2.5 text-base uppercase outline-none placeholder:normal-case focus:ring-2 focus:ring-lime-500 dark:bg-zinc-800" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <fieldset>
            <legend className="muted text-xs font-semibold">Category</legend>
            <div className="mt-1 flex gap-2">
              {(["M", "F"] as const).map((x) => (
                <button type="button" key={x} aria-pressed={p.sex === x} onClick={() => setP({ ...p, sex: x })} className="chip flex-1 py-2.5">{x === "M" ? "Men" : "Women"}</button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="muted text-xs font-semibold">Bodyweight (kg)</span>
            <input required inputMode="decimal" value={p.bw || ""} onChange={num("bw")} className="num mt-1 py-2.5" />
          </label>
        </div>
      </section>

      <section className="card">
        <p className="font-semibold">Current bests <span className="muted text-sm font-normal">(optional, kg)</span></p>
        <p className="muted text-xs">Puts you on the leaderboard straight away. Logged sets update these.</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {(["squat", "bench", "deadlift"] as const).map((k) => (
            <label key={k} className="block">
              <span className="muted text-xs capitalize">{k}</span>
              <input inputMode="decimal" value={p[k] || ""} onChange={num(k)} placeholder="0" className="num mt-1" />
            </label>
          ))}
        </div>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy || !p.name.trim() || p.bw < 30 || p.bw > 250} className="btn w-full">{busy ? "Saving…" : initial ? "Save" : "Let's go"}</button>
    </form>
  );
}
