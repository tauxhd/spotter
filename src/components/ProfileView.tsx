"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, Dumbbell, Pencil, Share2, X } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import PostCard from "./PostCard";
import { POST_SELECT, sb, toPost, useStore, type Profile } from "@/lib/store";
import type { Post } from "@/lib/data";
import { baseOf, bests, dots, liftsOf } from "@/lib/lifting";

type Person = { id: string; name: string; faculty: string; avatar_url: string | null };
type Stats = { workouts: number; followers: number; following: number };

// Social-style profile: photo, Workouts / Followers / Following, then every workout they've posted (that you're allowed to see).
export default function ProfileView({ userId }: { userId: string }) {
  const { s, me } = useStore();
  const router = useRouter();
  const own = userId === me.id;
  const q = typeof window !== "undefined" ? location.search : "";

  const [other, setOther] = useState<Profile | null | undefined>(own ? me : undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [list, setList] = useState<{ kind: "followers" | "following"; people: Person[] | null } | null>(null);
  const p = own ? me : other;

  useEffect(() => {
    if (own) return;
    sb.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => setOther(data));
  }, [own, userId]);

  useEffect(() => {
    sb.rpc("profile_stats", { uid: userId }).then(({ data }) => data?.[0] && setStats(data[0]));
  }, [userId, s.following.length, s.followers.length, s.posts.length]);

  useEffect(() => {
    sb.from("posts").select(POST_SELECT).eq("user_id", userId).order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "comments" }).limit(30)
      .then(({ data }) => setPosts((data ?? []).map((r) => toPost(r, me.id))));
  }, [userId, me.id, s.posts.length]);

  async function openList(kind: "followers" | "following") {
    setList({ kind, people: null });
    const { data } = await sb.rpc("follow_list", { uid: userId, kind });
    setList({ kind, people: data ?? [] });
  }

  async function share() {
    const url = `${location.origin}/u/${userId}`;
    try { if (navigator.share) await navigator.share({ title: `${p?.name} on Spotter`, url }); else await navigator.clipboard.writeText(url); } catch {}
  }

  if (p === undefined) return <p className="muted mt-20 text-center text-sm">Loading…</p>;
  if (p === null) return <p className="muted mt-20 text-center text-sm">This profile doesn&apos;t exist.</p>;

  const lifts = own ? liftsOf(bests(baseOf(me), s.sessions)) : { squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) };
  const total = lifts.squat + lifts.bench + lifts.deadlift;
  const stat = (n: number | undefined, label: string, onClick?: () => void) => (
    <button onClick={onClick} disabled={!onClick} className="flex flex-col items-center disabled:opacity-100">
      <span className="text-lg font-bold tabular-nums">{n ?? "–"}</span>
      <span className="muted text-xs">{label}</span>
    </button>
  );

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[4.5rem_1fr_4.5rem] items-center px-4 pb-2">
        {own ? <span /> : <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>}
        <h1 className="truncate text-center text-base font-semibold">{own ? "Profile" : p.name}</h1>
        <div className="flex justify-end">
          <Link href={`/u/${p.id}/stats${q}`} aria-label="Gym stats" className="grid h-9 w-9 place-items-center text-lime-600 dark:text-lime-400"><BarChart3 size={20} /></Link>
          {own && <Link href={`/me/edit${q}`} aria-label="Edit profile" className="grid h-9 w-9 place-items-center"><Pencil size={18} /></Link>}
        </div>
      </header>

      <section className="-mx-4 border-b border-zinc-200 px-4 pb-5 pt-2 dark:border-zinc-800/80">
        <div className="flex items-center gap-5">
          <Avatar id={p.id} url={p.avatar_url} name={p.name} size={84} className="ring-2 ring-lime-400/40" />
          <div className="grid flex-1 grid-cols-3">
            {stat(stats?.workouts, "Workouts", () => document.getElementById("workouts")?.scrollIntoView({ behavior: "smooth" }))}
            {stat(stats?.followers, "Followers", () => openList("followers"))}
            {stat(stats?.following, "Following", () => openList("following"))}
          </div>
        </div>

        <h2 className="mt-3 text-lg font-bold">{p.name}</h2>
        <p className="text-sm">
          {p.tp ? <span className="font-semibold tabular-nums">{p.tp}</span> : own ? <Link href={`/me/edit${q}`} className="font-semibold text-lime-600 dark:text-lime-400">Add TP number</Link> : null}
          {(p.tp || own) && <span className="muted"> · </span>}
          <span className="muted">{p.course || p.faculty}</span>
        </p>
        {total > 0 && (
          <p className="mt-1 text-sm">
            <span className="font-semibold tabular-nums">{total} kg</span> <span className="muted">SBD total ·</span>{" "}
            <span className="font-semibold tabular-nums">{dots(total, Number(p.bw), p.sex).toFixed(1)}</span> <span className="muted">DOTS ·</span>{" "}
            <span className="font-semibold tabular-nums">{Number(p.bw)} kg</span> <span className="muted">bodyweight</span>
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {own
            ? <Link href={`/me/edit${q}`} className="btn-ghost py-2 text-center text-sm">Edit profile</Link>
            : <div className="grid place-items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 [&>button]:w-full [&>button]:justify-center [&>button]:py-2 [&>button]:text-sm"><FollowButton id={p.id} name={p.name} /></div>}
          <button onClick={share} className="btn-ghost flex items-center justify-center gap-2 py-2 text-sm"><Share2 size={15} />Share profile</button>
        </div>
      </section>

      <h3 id="workouts" className="scroll-mt-4 pt-4 font-semibold">Workouts</h3>
      {posts === null && <p className="muted py-6 text-center text-sm">Loading…</p>}
      {posts?.length === 0 && (
        <div className="py-10 text-center">
          <Dumbbell className="muted mx-auto" size={28} />
          <p className="mt-2 font-semibold">{own ? "No workouts posted yet" : "Nothing to show yet"}</p>
          <p className="muted text-sm">{own ? "Finish a workout and it shows up here." : "Their workouts appear here once they post (or follow each other to see friends-only ones)."}</p>
          {own && <Link href={`/train${q}`} className="btn mt-4 inline-block py-2 text-sm">Start a workout</Link>}
        </div>
      )}
      {posts?.map((post) => <PostCard key={post.id} post={post} showFollow={false} />)}

      {list && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal aria-label={list.kind === "followers" ? "Followers" : "Following"} onClick={() => setList(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[70dvh] w-full max-w-sm flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="font-bold">{list.kind === "followers" ? "Followers" : "Following"}</h2>
              <button aria-label="Close" onClick={() => setList(null)} className="muted p-1"><X size={18} /></button>
            </div>
            <ul className="overflow-y-auto overscroll-contain px-4">
              {list.people === null && <li className="muted py-6 text-center text-sm">Loading…</li>}
              {list.people?.length === 0 && <li className="muted py-6 text-center text-sm">{list.kind === "followers" ? "No followers yet." : "Not following anyone yet."}</li>}
              {list.people?.map((u) => (
                <li key={u.id} className="flex items-center gap-3 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800/80">
                  <Link href={u.id === me.id ? `/me${q}` : `/u/${u.id}${q}`} onClick={() => setList(null)} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar id={u.id} url={u.avatar_url} name={u.name} size={40} />
                    <span className="min-w-0"><span className="block truncate font-semibold">{u.name}</span><span className="muted block text-xs">{u.faculty}</span></span>
                  </Link>
                  <FollowButton id={u.id} name={u.name} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
