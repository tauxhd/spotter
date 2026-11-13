"use client";
// Who followed you, liked or commented on your posts; new ones highlighted. Opening this page marks them seen.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, UserPlus } from "lucide-react";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import { isNew, loadNotes, markSeen, SEEN_KEY, type Note, type Seen } from "@/lib/notify";
import { timeAgo } from "@/lib/data";
import { sb, useStore } from "@/lib/store";

export default function Notifications() {
  const { me, s } = useStore();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [seen, setSeen] = useState<Seen | null>(null);

  useEffect(() => {
    let before: Seen | null = null;
    try { before = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null"); } catch {}
    loadNotes(sb, me.id).then((n) => {
      setSeen(before); setNotes(n);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(markSeen(n))); } catch {}
    });
  }, [me.id, s.rev]);

  const qs = typeof location === "undefined" ? "" : location.search;
  const line = (n: Note) => n.kind === "follow" ? "started following you" : n.kind === "like" ? <>liked <b>{n.post?.title}</b></> : <>commented on <b>{n.post?.title}</b>: “{n.text}”</>;
  const icon = { follow: <UserPlus size={14} />, like: <Heart size={14} fill="currentColor" />, comment: <MessageCircle size={14} /> };
  const tint = { follow: "bg-sky-500", like: "bg-red-500", comment: "bg-lime-500 text-zinc-950" };

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="text-center text-base font-semibold">Notifications</h1>
      </header>
      {notes === null && <p className="muted py-10 text-center text-sm">Loading…</p>}
      {notes?.length === 0 && <EmptyState art="followers" title="Nothing yet" text="When people follow you, like or comment on your workouts, it shows up here." className="mt-10" />}
      <ul>
        {notes?.map((n) => (
          <li key={n.key} className={`relative -mx-4 flex items-start gap-3 px-4 py-3 ${isNew(n, seen) ? "bg-lime-500/10" : ""}`}>
            <div className="relative shrink-0">
              <Avatar id={n.who.id} url={n.who.avatar} name={n.who.name} size={44} />
              <span className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full text-white ring-2 ring-white dark:ring-zinc-950 ${tint[n.kind]}`}>{icon[n.kind]}</span>
            </div>
            <Link href={n.post ? `/feed/${n.post.id}${qs}` : `/u/${n.who.id}${qs}`} className="min-w-0 flex-1 text-sm after:absolute after:inset-0">
              <span className="font-semibold">{n.who.name}</span> {line(n)}
              <span className="muted block text-xs">{n.kind === "like" ? "on your post" : timeAgo(n.at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
