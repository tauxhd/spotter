// Notifications (web and app): new followers, likes and comments on your posts, newest first, and which are unseen.
// Likes have no time of their own, so they sort by their post's date and "unseen" means not in the set already seen.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Note = { key: string; kind: "follow" | "like" | "comment"; at: string; who: { id: string; name: string; avatar: string | null }; post?: { id: string; title: string }; text?: string };
export type Seen = { at: string; likes: string[] };

export async function loadNotes(sb: SupabaseClient, uid: string): Promise<Note[]> {
  const [fo, li, co] = await Promise.all([
    sb.from("follows").select("follower, created_at").eq("followee", uid).order("created_at", { ascending: false }).limit(60),
    sb.from("likes").select("user_id, post_id, posts!inner(title, user_id, created_at)").eq("posts.user_id", uid).neq("user_id", uid).limit(200),
    sb.from("comments").select("id, user_id, text, created_at, post_id, posts!inner(title, user_id)").eq("posts.user_id", uid).neq("user_id", uid).order("created_at", { ascending: false }).limit(60),
  ]);
  type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = { fo: (fo.data ?? []) as R[], li: (li.data ?? []) as R[], co: (co.data ?? []) as R[] };
  const ids = [...new Set([...rows.fo.map((r) => r.follower), ...rows.li.map((r) => r.user_id), ...rows.co.map((r) => r.user_id)].filter(Boolean))];
  const { data: people } = ids.length ? await sb.from("profiles").select("id, name, avatar_url").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p: R) => [p.id, { id: p.id, name: p.name, avatar: p.avatar_url ?? null }]));
  const person = (id: string) => who.get(id) ?? { id, name: "Someone", avatar: null };
  const notes: Note[] = [
    ...rows.fo.map((r): Note => ({ key: `f:${r.follower}`, kind: "follow", at: r.created_at, who: person(r.follower) })),
    ...rows.li.map((r): Note => ({ key: `l:${r.post_id}:${r.user_id}`, kind: "like", at: r.posts.created_at, who: person(r.user_id), post: { id: r.post_id, title: r.posts.title } })),
    ...rows.co.map((r): Note => ({ key: `c:${r.id}`, kind: "comment", at: r.created_at, who: person(r.user_id), post: { id: r.post_id, title: r.posts.title }, text: r.text })),
  ];
  return notes.sort((a, b) => b.at.localeCompare(a.at));
}

// unseen: followers and comments newer than the last visit; likes not seen before
export const isNew = (n: Note, seen: Seen | null) => !seen || (n.kind === "like" ? !seen.likes.includes(n.key) : n.at > seen.at);
export const markSeen = (notes: Note[]): Seen => ({ at: new Date().toISOString(), likes: notes.filter((n) => n.kind === "like").map((n) => n.key).slice(0, 500) });
export const SEEN_KEY = "spotter:notesSeen";
