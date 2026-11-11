"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Lock, MessageCircle, SendHorizontal, Share2, Users } from "lucide-react";
import Icon from "./Icon";
import Avatar from "./Avatar";
import ExerciseThumb from "./ExerciseThumb";
import FollowButton from "./FollowButton";
import ProfileLink from "./ProfileLink";
import { useStore } from "@/lib/store";
import { wTotal } from "@/lib/units";
import { demoNow, findExercise, lifters, timeAgo, type Exercise, type Post } from "@/lib/data";

const SHOWN = 3; // exercises before "See N more"
const dur = (m?: number | null) => (!m ? "—" : m < 60 ? `${m}min` : `${Math.floor(m / 60)}h ${m % 60}min`);
const q = () => (typeof window !== "undefined" ? location.search : "");
type Find = (id?: string, name?: string) => Exercise | undefined;

// The workout half of a post: Time / Volume / Records + exercise names. Tapping it opens the full workout.
function Summary({ p, find }: { p: Post; find: Find }) {
  const { u } = useStore();
  const more = p.exercises.length - SHOWN;
  return (
    <Link href={`/feed/${p.id}${q()}`} className="block" aria-label={`Open ${p.title}`}>
      <div className="grid grid-cols-3 gap-2">
        {[["Time", dur(p.duration)], ["Volume", wTotal(p.volume, u)]].map(([k, v]) => (
          <div key={k}><p className="muted text-xs">{k}</p><p className="font-semibold tabular-nums">{v}</p></div>
        ))}
        <div><p className="muted text-xs">Records</p><p className="flex items-center gap-1 font-semibold"><Icon name="medal" size={18} />{p.prs.length}</p></div>
      </div>
      <ul className="mt-3 space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {p.exercises.slice(0, SHOWN).map((e) => {
          const ex = find(e.id, e.name);
          return (
            <li key={e.name} className="flex items-center gap-3">
              <ExerciseThumb ex={ex} />
              <p className="min-w-0 flex-1 font-medium leading-snug">{ex?.name ?? e.name}</p>
            </li>
          );
        })}
      </ul>
      {more > 0 && <p className="muted mt-3 text-center text-sm font-medium">See {more} more exercise{more > 1 ? "s" : ""}</p>}
    </Link>
  );
}

// Video / photo first, swipe left for the workout.
function Swipe({ p, find }: { p: Post; find: Find }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  return (
    <div className="-mx-4">
      <div ref={ref} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        <div className="w-full shrink-0 snap-center">
          {p.media!.type === "video"
            ? <video src={p.media!.url} controls playsInline loop muted preload="metadata" className="aspect-[4/5] w-full bg-black object-cover" />
            : <img src={p.media!.url} alt={`${p.by}'s workout`} className="aspect-[4/5] w-full bg-black object-cover" />} {/* eslint-disable-line @next/next/no-img-element */}
        </div>
        <div className="w-full shrink-0 snap-center px-4 py-1"><Summary p={p} find={find} /></div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {[0, 1].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-[var(--spring-ms)] ease-[var(--spring)] ${page === i ? "w-4 bg-lime-500" : "w-1.5 bg-zinc-400/50"}`} />)}
      </div>
    </div>
  );
}

// One workout post (feed and profile pages). Keeps a local copy so likes/comments respond instantly anywhere.
export default function PostCard({ post, showFollow = true }: { post: Post; showFollow?: boolean }) {
  const { s, me, u, like, comment } = useStore();
  const [p, setP] = useState(post);
  useEffect(() => setP(post), [post]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const find: Find = (id, name) => findExercise(s.library, id, name);
  const author = p.uid ?? lifters.find((l) => l.name === p.by)?.id ?? p.by;
  const likers = p.likers ?? [];
  const others = p.likes - (likers[0] ? 1 : 0);

  function toggleLike() {
    setP((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }));
    like(p.id, !!p.liked);
  }
  function send() {
    const text = draft.trim();
    if (!text) return;
    setP((x) => ({ ...x, comments: [...x.comments, { by: me.name, text, uid: me.id }] }));
    comment(p.id, text);
    setDraft("");
  }
  async function share() {
    const text = `${p.by} on Spotter: ${p.title} · ${wTotal(p.volume, u)}`;
    const url = `${location.origin}/feed/${p.id}`;
    try { if (navigator.share) await navigator.share({ title: p.title, text, url }); else await navigator.clipboard.writeText(`${text} ${url}`); } catch {}
  }

  const who = (
    <>
      <Avatar id={author} url={p.avatar} name={p.by} size={48} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{p.mine ? `${p.by} (you)` : p.by}</p>
        <p className="muted flex items-center gap-1 text-xs">{p.faculty} · {timeAgo(p.at, demoNow())}
          {p.visibility === "friends" && <><span>·</span><Users size={12} />Friends</>}
          {p.visibility === "private" && <><span>·</span><Lock size={12} />Only you</>}
        </p>
      </div>
    </>
  );

  return (
    <article className="card">
      <div className="flex items-center gap-3">
        <ProfileLink id={author} name={p.by} className="flex min-w-0 flex-1 items-center gap-3">{who}</ProfileLink>
        {showFollow && <FollowButton id={p.uid} name={p.by} />}
      </div>

      <h2 className="mt-3 text-xl font-bold">{p.title}</h2>
      {p.note && <p className="mt-1 text-sm">{p.note}</p>}

      <div className="mt-3">{p.media ? <Swipe p={p} find={find} /> : <Summary p={p} find={find} />}</div>

      <div className="mt-3 flex items-center gap-5 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
        <button onClick={toggleLike} aria-pressed={!!p.liked} aria-label={`Like, ${p.likes} likes`} className={`flex items-center gap-1.5 font-medium ${p.liked ? "text-red-500" : "muted"}`}>
          <Heart key={String(!!p.liked)} size={22} fill={p.liked ? "currentColor" : "none"} className={p.liked ? "anim-pop" : ""} />{p.likes}
        </button>
        <button onClick={() => { setOpen((o) => !o); setDraft(""); }} aria-expanded={open} aria-label={`Comments, ${p.comments.length}`} className="muted flex items-center gap-1.5 font-medium">
          <MessageCircle size={22} />{p.comments.length}
        </button>
        <button onClick={share} aria-label="Share" className="muted"><Share2 size={22} /></button>
      </div>

      {p.likes > 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          {likers.length > 0 && (
            <div className="flex -space-x-2">
              {likers.slice(0, 3).map((l) => <ProfileLink key={l.id} id={l.id} name={l.name}><Avatar id={l.id} url={l.avatar} name={l.name} size={24} className="ring-2 ring-white dark:ring-zinc-950" /></ProfileLink>)}
            </div>
          )}
          <p>
            {likers[0] ? <>Liked by <ProfileLink id={likers[0].id} name={likers[0].name} className="font-bold">{likers[0].id === me.id ? "you" : likers[0].name}</ProfileLink>{others > 0 && <> and <b>{others} other{others > 1 ? "s" : ""}</b></>}</>
              : <><b>{p.likes}</b> like{p.likes > 1 ? "s" : ""}</>}
          </p>
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2">
          {p.comments.map((c, i) => <p key={i} className="text-sm"><ProfileLink id={c.uid} name={c.by} className="font-semibold">{c.by}</ProfileLink> {c.text}</p>)}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" aria-label="Comment" enterKeyHint="send"
              className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-lime-500 dark:bg-zinc-900" />
            <button aria-label="Post comment" disabled={!draft.trim()} className="grid w-10 place-items-center rounded-xl bg-lime-500 text-zinc-950 disabled:opacity-40"><SendHorizontal size={16} /></button>
          </form>
        </div>
      )}
    </article>
  );
}
