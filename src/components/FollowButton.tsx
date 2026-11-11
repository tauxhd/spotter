"use client";
import { UserCheck, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";

// Follow / Following / Follow back / Friends (mutual). Renders nothing for yourself or demo users without an account.
export default function FollowButton({ id, name }: { id?: string | null; name: string }) {
  const { me, s, follow, unfollow } = useStore();
  if (!id || id === me.id) return null;
  const iFollow = s.following.includes(id), theyFollow = s.followers.includes(id);
  const label = iFollow ? (theyFollow ? "Friends" : "Following") : theyFollow ? "Follow back" : "Follow";

  return (
    <button aria-pressed={iFollow} aria-label={`${label}, ${name}`}
      onClick={() => (iFollow ? confirm(`Unfollow ${name}?`) && unfollow(id) : follow(id))}
      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition active:scale-95 ${
        iFollow ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" : "bg-lime-500 text-zinc-950"}`}>
      {iFollow ? <UserCheck size={13} /> : <UserPlus size={13} />}{label}
    </button>
  );
}
