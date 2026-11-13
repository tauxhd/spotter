"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import PostCard from "@/components/PostCard";
import { sb, useStore } from "@/lib/store";
import FeedActions from "@/components/FeedActions";

type Suggestion = { id: string; name: string; faculty: string; avatar_url: string | null };

export default function Feed() {
  const { s, me, loadMore } = useStore();
  // the next page loads when the bottom of the list comes within ~1.5 screens
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el || !s.morePosts) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, s.morePosts, s.posts.length]);
  const [people, setPeople] = useState<Suggestion[]>([]);

  useEffect(() => {
    sb.from("profiles").select("id, name, faculty, avatar_url").neq("id", me.id).limit(20).then(({ data }) => data && setPeople(data));
  }, [me.id]);
  const suggested = people.filter((p) => !s.following.includes(p.id));

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="h-title flex items-center gap-2"><Icon name="feed" size={34} />Feed</h1>
          <p className="muted flex items-center gap-1.5 text-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" />What APU is lifting, live</p>
        </div>
        <FeedActions />
      </header>

      {suggested.length > 0 && (
        <section>
          <h2 className="muted mb-2 text-xs font-semibold uppercase tracking-wider">Suggested for you</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {suggested.map((u) => (
              <div key={u.id} className="tile flex w-36 shrink-0 flex-col items-center gap-1 text-center">
                <Link href={`/u/${u.id}${location.search}`} className="flex w-full flex-col items-center">
                  <Avatar id={u.id} url={u.avatar_url} name={u.name} size={64} />
                  <p className="mt-1 w-full truncate font-semibold">{u.name}</p>
                </Link>
                <p className="muted mb-1 text-xs">{u.faculty}</p>
                <FollowButton id={u.id} name={u.name} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="stagger">{s.posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      <div ref={end} className="muted py-8 text-center text-sm">{s.posts.length ? (s.morePosts ? "Loading more…" : "You’re all caught up") : null}</div>
    </div>
  );
}
