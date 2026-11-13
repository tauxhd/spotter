"use client";
// Find someone by name or TP number, open their profile or follow them.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import EmptyState from "@/components/EmptyState";
import { sb, useStore } from "@/lib/store";

type Person = { id: string; name: string; faculty: string | null; tp: string | null; avatar_url: string | null };

export default function Search() {
  const { me, demo } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Person[] | null>(null);

  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, "");
    if (term.length < 2) return;
    const t = setTimeout(() => {
      const base = sb.from("profiles").select("id, name, faculty, tp, avatar_url");
      (demo ? base : base.neq("id", me.id)).or(`name.ilike.%${term}%,tp.ilike.%${term}%`).order("name").limit(30)
        .then(({ data, error }) => { if (error) console.error("search", error.message); setFound(data ?? []); });
    }, 250); // wait for typing to pause
    return () => clearTimeout(t);
  }, [q, me.id, demo]);

  const qs = typeof location === "undefined" ? "" : location.search;
  const shown = q.trim().replace(/[%,()]/g, "").length < 2 ? null : found;

  return (
    <div>
      <header className="-mx-4 flex items-center gap-2 px-4 pb-3">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center"><ArrowLeft size={20} /></button>
        <label className="flex flex-1 items-center gap-2 rounded-xl bg-zinc-100 px-3 dark:bg-zinc-900">
          <SearchIcon size={18} className="muted shrink-0" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or TP number" aria-label="Search people"
            className="w-full bg-transparent py-2.5 outline-none" />
        </label>
      </header>
      {shown === null && <EmptyState art="search" title="Find someone" text="Type at least 2 letters of their name or TP number." className="mt-10" />}
      {shown?.length === 0 && <p className="muted py-10 text-center text-sm">No one matches “{q.trim()}”.</p>}
      <ul>
        {shown?.map((p) => (
          <li key={p.id} className="relative flex items-center gap-3 py-2.5">
            <Avatar id={p.id} url={p.avatar_url} name={p.name} size={44} />
            <Link href={`/u/${p.id}${qs}`} className="min-w-0 flex-1 after:absolute after:inset-0">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="muted truncate text-xs">{[p.tp, p.faculty].filter(Boolean).join(" · ")}</p>
            </Link>
            <div className="relative z-10"><FollowButton id={p.id} name={p.name} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
