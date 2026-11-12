"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Eye, Globe, ImagePlus, Lock, Pencil, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Visibility } from "@/lib/data";
import { baseOf, bests, heaviest, liftsOf } from "@/lib/lifting";
import { bodyFor, volumeBodyFor } from "@/lib/strength";
import { summarize } from "@/lib/workout";
import { toUnit } from "@/lib/units";

const visibilities: { id: Visibility; label: string; hint: string; icon: typeof Globe }[] = [
  { id: "everyone", label: "Everyone", hint: "Anyone on Spotter can see this workout.", icon: Globe },
  { id: "friends", label: "Friends", hint: "Only people you follow who follow you back.", icon: Users },
  { id: "private", label: "Only me", hint: "Saved to your history, hidden from everyone else.", icon: Lock },
];

// "datetime-local" value in local time
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function SaveWorkout() {
  const { s, me, u, setActive, finishWorkout } = useStore();
  const router = useRouter();
  const a = s.active;
  const q = typeof window !== "undefined" ? location.search : "";

  const [title, setTitle] = useState(a?.title ?? "Workout");
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState(() => (a ? String(Math.max(1, Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60000))) : ""));
  const [when, setWhen] = useState(() => localInput(a ? new Date(a.startedAt) : new Date()));
  const [visibility, setVisibility] = useState<Visibility>("everyone");
  const [media, setMedia] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const preview = useMemo(() => (media ? URL.createObjectURL(media) : ""), [media]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!a) {
    return (
      <div className="mt-20 space-y-3 text-center">
        <p className="muted text-sm">No workout in progress.</p>
        <Link href={"/train" + q} className="btn inline-block">Go to Train</Link>
      </div>
    );
  }

  const body = bodyFor(s.library, Number(me.bw));
  const prev = bests(baseOf(me), s.sessions, body);
  const sum = summarize(a.exercises, s.library, prev, body, volumeBodyFor(s.library, Number(me.bw)));

  function pickMedia(f?: File) {
    setErr("");
    if (!f) return setMedia(null);
    if (!/^(video|image)\//.test(f.type)) return setErr("Pick a video or a photo");
    if (f.size > 50 * 1024 * 1024) return setErr("Max 50 MB. Trim the video and try again");
    setMedia(f);
  }

  async function save() {
    if (!a || saving) return;
    if (!sum.done.length) return setErr("Tick at least one set before saving");
    const at = new Date(when);
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 60000) return setErr("Pick a date that isn't in the future");
    setSaving(true);
    setErr("");
    try {
      await finishWorkout(
        { title: a.title, exercises: sum.done },
        {
          title: title.trim() || a.title, note: note.trim() || undefined, prs: sum.prs, exercises: sum.exercises, volume: sum.volume,
          duration: Math.min(600, Math.max(1, Number(duration) || 1)), visibility, at: at.toISOString(),
        },
        liftsOf(heaviest(baseOf(me), [...s.sessions, { exercises: sum.done }])), // heaviest actually lifted, not an estimate
        media,
      );
      router.push("/feed" + q);
    } catch (x) {
      setErr((x as Error).message);
      setSaving(false);
    }
  }

  function discard() {
    if (!confirm("Discard this workout? Your logged sets will be lost.")) return;
    setActive(() => null);
    router.push("/train" + q);
  }

  const row = "-mx-4 flex items-center gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800/80";

  return (
    <div className="-mt-2">
      {/* native-style top bar */}
      <header className="sticky top-0 z-20 -mx-4 grid grid-cols-[1fr_auto_1fr] items-center bg-zinc-50/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur dark:bg-zinc-950/90">
        <Link href={"/train" + q} className="flex items-center gap-1 text-sm font-medium text-lime-600 dark:text-lime-400"><ArrowLeft size={18} />Resume</Link>
        <h1 className="text-base font-semibold">Save workout</h1>
        <button onClick={save} disabled={saving || !sum.done.length} className="justify-self-end rounded-sm bg-lime-500 px-4 py-1.5 text-sm font-bold text-zinc-950 disabled:opacity-40">
          {saving ? (media ? "Uploading…" : "Saving…") : "Save"}
        </button>
      </header>

      {/* title: an obvious, editable field */}
      <label className="group -mx-4 flex items-center gap-2 border-b border-zinc-200 px-4 pb-3 pt-4 focus-within:border-lime-500 dark:border-zinc-800/80 dark:focus-within:border-lime-500">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} aria-label="Workout title" placeholder="Name this workout" enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600" />
        <Pencil size={18} className="muted shrink-0 group-focus-within:text-lime-500" aria-hidden />
      </label>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} aria-label="Description" placeholder="How did it go? Add notes for yourself or your friends…"
        className="-mx-4 block w-[calc(100%+2rem)] resize-none border-b border-zinc-200 bg-transparent px-4 py-3 outline-none placeholder:text-zinc-400 dark:border-zinc-800/80 dark:placeholder:text-zinc-600" />

      {/* stats: values first, labels quiet */}
      <section className="-mx-4 grid grid-cols-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
        <label>
          <span className="muted block text-xs">Duration</span>
          <span className="flex items-baseline gap-1">
            <input value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" aria-label="Duration in minutes"
              className="w-12 border-b border-dashed border-lime-500/60 bg-transparent text-xl font-bold tabular-nums text-lime-600 outline-none focus:border-solid dark:text-lime-400" />
            <span className="muted text-sm">min</span>
          </span>
        </label>
        <div><p className="muted text-xs">Volume</p><p className="text-xl font-bold tabular-nums">{Math.round(toUnit(sum.volume, u)).toLocaleString()}<span className="muted ml-1 text-sm font-normal">{u}</span></p></div>
        <div><p className="muted text-xs">Sets</p><p className="text-xl font-bold tabular-nums">{sum.sets}</p></div>
      </section>

      {/* media */}
      <label className={`${row} cursor-pointer`}>
        {media ? (
          media.type.startsWith("video")
            ? <video src={preview} muted playsInline className="h-12 w-12 rounded-lg bg-black object-cover" />
            : <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" /> // eslint-disable-line @next/next/no-img-element
        ) : <ImagePlus size={22} className="text-lime-500" />}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{media ? media.name : "Add photo or video"}</span>
          <span className="muted block truncate text-xs">{media ? `${(media.size / 1048576).toFixed(1)} MB` : "Shows first on the feed. Max 50 MB"}</span>
        </span>
        {media
          ? <button type="button" onClick={(e) => { e.preventDefault(); setMedia(null); }} className="text-sm font-medium text-red-500">Remove</button>
          : <ChevronRight size={18} className="muted" />}
        <input type="file" accept="video/*,image/*" className="sr-only" aria-label="Photo or video" onChange={(e) => pickMedia(e.target.files?.[0])} />
      </label>

      {/* date */}
      <label className={row}>
        <CalendarDays size={22} className="text-lime-500" />
        <span className="flex-1 font-medium">Date</span>
        <input type="datetime-local" value={when} max={localInput(new Date())} onChange={(e) => setWhen(e.target.value)}
          className="bg-transparent text-right tabular-nums text-zinc-600 outline-none dark:text-zinc-300 dark:[color-scheme:dark]" />
      </label>

      {/* visibility: segmented control */}
      <div className={`${row} flex-col items-stretch gap-2`}>
        <span className="flex items-center gap-3 font-medium"><Eye size={22} className="text-lime-500" />Visibility</span>
        <div role="radiogroup" aria-label="Visibility" className="grid grid-cols-3 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-900">
          {visibilities.map(({ id, label, icon: I }) => {
            const on = visibility === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setVisibility(id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${on ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "muted"}`}>
                <I size={15} />{label}
              </button>
            );
          })}
        </div>
        <p className="muted text-xs">{visibilities.find((v) => v.id === visibility)!.hint}</p>
      </div>

      {err && <p className="py-3 text-sm text-red-600">{err}</p>}

      <button onClick={discard} className="mt-6 w-full py-3 text-center font-semibold text-red-500">Discard workout</button>
    </div>
  );
}
