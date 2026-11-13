"use client";
// Feed header: search people, notifications (with a badge for unseen ones), and your profile.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import MeButton from "./MeButton";
import { isNew, loadNotes, SEEN_KEY, type Seen } from "@/lib/notify";
import { sb, useStore } from "@/lib/store";

export default function FeedActions() {
  const { me, s, demo } = useStore();
  const [unseen, setUnseen] = useState(0);
  useEffect(() => {
    if (demo) return;
    let seen: Seen | null = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null"); } catch {}
    loadNotes(sb, me.id).then((n) => setUnseen(n.filter((x) => isNew(x, seen)).length));
  }, [me.id, demo, s.rev]);
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
