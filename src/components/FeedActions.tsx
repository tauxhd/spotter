"use client";
// Feed header: search people, notifications (with a badge for unseen ones), and your profile.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import MeButton from "./MeButton";
import { isNew, loadNotes, onSeen, readSeen, seenFrom, type Note } from "@/lib/notify";
import { sb, useStore } from "@/lib/store";

export default function FeedActions() {
  const { me, s, demo } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => onSeen(() => setSeen(readSeen())), []); // opening Notifications clears the badge at once
  useEffect(() => {
    if (demo) return;
    let t: ReturnType<typeof setTimeout> | undefined, live = true;
    const load = () => loadNotes(sb, me.id).then((n) => live && setNotes(n)).catch(() => {});
    load();
    // live: someone likes, comments or follows and the badge updates without a reload (batched, ~1 s)
    const again = () => { clearTimeout(t); t = setTimeout(load, 1000); };
    const ch = sb.channel(`notes-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, again)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, again)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows", filter: `followee=eq.${me.id}` }, again)
      .subscribe();
    return () => { live = false; clearTimeout(t); sb.removeChannel(ch); };
  }, [me.id, demo, s.rev]);
  const mark = seenFrom(seen, me.notes_seen_at);
  const unseen = notes.filter((x) => isNew(x, mark)).length;
  const q = typeof location === "undefined" ? "" : location.search;
  const btn = "relative grid h-10 w-10 place-items-center rounded-full transition active:scale-95 hover:bg-zinc-100 dark:hover:bg-zinc-900";
  return (
    <div className="flex items-center gap-1">
      <Link href={`/search${q}`} aria-label="Search people" className={btn}><Search size={22} /></Link>
      <Link href={`/notifications${q}`} aria-label={unseen ? `Notifications, ${unseen} new` : "Notifications"} className={btn}>
        <Bell size={22} />
        {unseen > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unseen > 99 ? "99+" : unseen}</span>}
      </Link>
      <MeButton />
    </div>
  );
}
