"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, SendHorizontal, Share2 } from "lucide-react";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import { PostSkeleton } from "@/components/Skeleton";
import { w, wTotal } from "@/lib/units";
import FollowButton from "@/components/FollowButton";
import ProfileLink from "@/components/ProfileLink";
import ExerciseThumb from "@/components/ExerciseThumb";
import { useStore } from "@/lib/store";
import { addSets, findExercise, lifters, oldNames, setTypes, supersetColor } from "@/lib/data";
import { countsPR, e1rm, mmss, setLabels } from "@/lib/lifting";

const dur = (m?: number | null) => (!m ? "—" : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h ${m % 60}min`);

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const { s, me, u, like, comment } = useStore();
  const [draft, setDraft] = useState("");
  const p = s.posts.find((x) => x.id === id);
  const back = "/feed" + (typeof window !== "undefined" ? location.search : "");

  if (!p) return s.posts.length
    ? <EmptyState art="not-found" title="This workout isn't available" text="It may be private, friends-only, or deleted." className="mt-16" />
    : <PostSkeleton />;

  const rows = p.exercises.map((e) => {
    const ex = findExercise(s.library, e.id, e.name);
    const log = e.log ?? [];
    const sets = log.length || e.sets || 1;
    const pr = p.prs.some((n) => n === e.name || n === ex?.name || oldNames[n] === ex?.name);
    const eligible = log.filter((x) => countsPR(x.type));
    const top = eligible.length ? log.indexOf(eligible.reduce((b, x) => (e1rm(x.kg, x.reps) > e1rm(b.kg, b.reps) ? x : b))) : -1;
    return { e, ex, log, sets, pr, top, labels: setLabels(log, setTypes) };
  });
  const totalSets = rows.reduce((n, r) => n + r.sets, 0);
  const split = Object.entries(rows.reduce<Record<string, number>>((m, r) => addSets(m, r.ex, r.sets), {})).sort((a, b) => b[1] - a[1]);
  const splitTotal = split.reduce((n, [, v]) => n + v, 0) || 1;
  const when = new Date(p.at);
  const author = p.uid ?? lifters.find((l) => l.name === p.by)?.id ?? p.by;

  async function share() {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title: p!.title, url }); else await navigator.clipboard.writeText(url); } catch {}
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href={back} aria-label="Back to feed" className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"><ArrowLeft size={18} /></Link>
        <h1 className="flex-1 text-center font-semibold">Workout detail</h1>
        <span className="w-9" />
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <ProfileLink id={author} name={p.by} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar id={author} url={p.avatar} name={p.by} size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.mine ? `${p.by} (you)` : p.by}</p>
              <p className="muted text-xs">
                {when.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })} · {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()}
              </p>
            </div>
          </ProfileLink>
          <FollowButton id={p.uid} name={p.by} />
        </div>
        <h2 className="text-2xl font-bold">{p.title}</h2>
        {p.note && <p className="text-sm">{p.note}</p>}
        {p.media && (p.media.type === "video"
          ? <video src={p.media.url} controls playsInline loop muted className="-mx-4 aspect-[4/5] w-[calc(100%+2rem)] max-w-none bg-black object-cover" />
          : <img src={p.media.url} alt={`${p.by}'s workout`} className="-mx-4 aspect-[4/5] w-[calc(100%+2rem)] max-w-none bg-black object-cover" />)} {/* eslint-disable-line @next/next/no-img-element */}
        <div className="grid grid-cols-4 gap-2">
          {[["Time", dur(p.duration)], ["Volume", wTotal(p.volume, u)], ["Sets", totalSets]].map(([k, v]) => (
            <div key={k}><p className="muted text-xs">{k}</p><p className="font-semibold tabular-nums">{v}</p></div>
          ))}
          <div><p className="muted text-xs">Records</p><p className="flex items-center gap-1 font-semibold"><Icon name="medal" size={18} />{p.prs.length}</p></div>
        </div>
        <div className="flex items-center gap-5 border-y border-zinc-200 py-3 text-sm dark:border-zinc-800">
          <button onClick={() => like(p.id)} aria-pressed={!!p.liked} aria-label={`Like, ${p.likes} likes`} className={`flex items-center gap-1.5 font-medium ${p.liked ? "text-red-500" : "muted"}`}>
            <Heart size={22} fill={p.liked ? "currentColor" : "none"} />{p.likes}
          </button>
          <a href="#comments" aria-label={`Comments, ${p.comments.length}`} className="muted flex items-center gap-1.5 font-medium"><MessageCircle size={22} />{p.comments.length}</a>
          <button onClick={share} aria-label="Share" className="muted"><Share2 size={22} /></button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-bold">Muscle split</h3>
        <div className="space-y-3">
          {split.map(([k, n], si) => {
            const pct = Math.round((n / splitTotal) * 100);
            return (
              <div key={k}>
                <p className="mb-1 text-sm">{k}</p>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-800"><div className="anim-grow h-full rounded-sm bg-lime-500" style={{ width: `${pct}%`, "--i": si } as React.CSSProperties} /></div>
                  <span className="muted w-10 text-right text-sm tabular-nums">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold">Workout</h3>
        {rows.map(({ e, ex, log, pr, top, labels }) => (
          <div key={e.name}>
            <div className="flex items-center gap-3">
              <ExerciseThumb ex={ex} size={48} />
              <div className="min-w-0">
                {e.superset && <span className={`mb-0.5 inline-block rounded-sm px-2 text-[10px] font-bold uppercase tracking-wide ${supersetColor(e.superset.charCodeAt(0) - 65).tag}`}>Superset {e.superset}</span>}
                {ex ? <Link href={`/exercise/${ex.id}`} className="block font-semibold text-lime-600 dark:text-lime-400">{ex.name}</Link> : <p className="font-semibold text-lime-600 dark:text-lime-400">{e.name}</p>}
                {ex && <p className="muted text-xs capitalize">{ex.muscle} · {ex.equipment}</p>}
              </div>
            </div>
            <div className="mt-2 overflow-hidden rounded-xl">
              <div className="muted grid grid-cols-[3rem_1fr] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"><span>Set</span><span>{log.some((x) => x.secs !== undefined) ? (log.some((x) => x.kg) ? "Weight & time" : "Time") : log.some((x) => x.kg) ? "Weight & reps" : "Reps"}</span></div>
              {log.length ? log.map((x, i) => (
                <div key={i} className={`grid grid-cols-[3rem_1fr] items-center px-3 py-2.5 text-sm tabular-nums ${i % 2 ? "" : "bg-white dark:bg-zinc-900"}`}>
                  <span className={`font-bold ${x.type ? setTypes[x.type].color : ""}`} title={x.type ? setTypes[x.type].label : "Working set"}>{labels[i]}</span>
                  <span>
                    {x.secs !== undefined ? (x.kg ? `${w(x.kg, u)} × ${mmss(x.secs)}` : mmss(x.secs)) : x.kg ? `${w(x.kg, u)} × ${x.reps}` : `${x.reps} reps`}
                    {pr && i === top && <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-amber-400/15 px-2 text-[11px] font-bold text-amber-500"><Icon name="medal" size={12} />1RM</span>}
                  </span>
                </div>
              )) : (
                <div className="grid grid-cols-[3rem_1fr] bg-white px-3 py-2.5 text-sm dark:bg-zinc-900"><span className="muted">—</span><span>Best {e.best}</span></div>
              )}
            </div>
          </div>
        ))}
      </section>

      {rows.some((r) => r.log.some((x) => x.type)) && (
        <p className="muted flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {Object.values(setTypes).filter((v) => rows.some((r) => r.log.some((x) => x.type && setTypes[x.type] === v))).map((v) => (
            <span key={v.short}><b className={v.color}>{v.short}</b> {v.label}</span>
          ))}
        </p>
      )}

      <section id="comments" className="space-y-2">
        <h3 className="text-lg font-bold">Comments</h3>
        {p.comments.length === 0 && <EmptyState art="comments" size={96} className="py-4" title="No comments yet" text="Hype them up 💪" />}
        {p.comments.map((c, i) => <p key={i} className="text-sm"><ProfileLink id={c.uid} name={c.by} className="font-semibold">{c.by}</ProfileLink> {c.text}</p>)}
        <form onSubmit={(ev) => { ev.preventDefault(); if (draft.trim()) { comment(p.id, draft.trim()); setDraft(""); } }} className="flex gap-2">
          <input value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder={`Comment as ${me.name}…`} aria-label="Comment"
            className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-base outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900 dark:ring-zinc-800" />
          <button aria-label="Post comment" disabled={!draft.trim()} className="grid w-10 place-items-center rounded-xl bg-lime-500 text-zinc-950 disabled:opacity-40"><SendHorizontal size={16} /></button>
        </form>
      </section>
    </div>
  );
}
