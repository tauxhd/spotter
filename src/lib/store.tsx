"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { demoNow, oldNames, type Exercise, type ExerciseLog, type Post, type Sex } from "./data";
import Onboarding from "@/components/Onboarding";

export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!);

export type Profile = { id: string; name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; avatar_url?: string | null; tp?: string | null; course?: string | null };
export type Routine = { id: string; name: string; exercises: ExerciseLog[] };
export type Session = { id: string; at: string; title: string; exercises: ExerciseLog[] };
export type FoodEntry = { id: string; name: string; kcal: number; p: number; c: number; f: number; at: string };
type Active = { title: string; startedAt: string; exercises: ExerciseLog[] } | null;

type State = { clockedIn: string | null; sessions: Session[]; food: FoodEntry[]; posts: Post[]; following: string[]; followers: string[]; library: Exercise[]; routines: Routine[] };
type Ctx = {
  s: State & { active: Active };
  me: Profile;
  setActive: (fn: (a: Active) => Active) => void;
  saveProfile: (p: Omit<Profile, "id">) => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  addFood: (f: Omit<FoodEntry, "id" | "at">) => Promise<void>;
  removeFood: (id: string) => Promise<void>;
  finishWorkout: (w: { title: string; exercises: ExerciseLog[] }, post: Pick<Post, "title" | "note" | "exercises" | "volume" | "prs" | "duration" | "visibility"> & { at?: string }, lifts: Pick<Profile, "squat" | "bench" | "deadlift">, media?: File | null) => Promise<void>;
  like: (id: string, wasLiked?: boolean) => Promise<void>;
  comment: (id: string, text: string) => Promise<void>;
  follow: (id: string) => Promise<void>;
  setAvatar: (file: File) => Promise<void>;
  saveRoutine: (r: { id?: string; name: string; exercises: ExerciseLog[] }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  unfollow: (id: string) => Promise<void>;
};

const C = createContext<Ctx | null>(null);
const ACTIVE = "spotter:active"; // the in-progress workout stays on the device until finished

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
// What a post row joins to, and how it becomes a Post. Shared by the feed and profile pages.
export const POST_SELECT = "*, profiles!posts_user_id_fkey(name, faculty, avatar_url), comments(by, text, created_at, profiles(name)), likes(user_id, profiles(name, avatar_url))";
export const toPost = (r: Row, uid: string): Post => ({
  id: r.id, by: r.profiles?.name ?? r.by, faculty: r.profiles?.faculty ?? r.faculty, at: r.created_at, title: r.title,
  note: r.note ?? undefined, exercises: r.exercises, volume: Number(r.volume), prs: r.prs,
  likes: r.base_likes + r.likes.length, liked: r.likes.some((l: Row) => l.user_id === uid), mine: r.user_id === uid, uid: r.user_id, avatar: r.profiles?.avatar_url,
  duration: r.duration_min, visibility: r.visibility, media: r.media_url ? { url: r.media_url, type: r.media_type } : null,
  likers: r.likes.map((l: Row) => ({ id: l.user_id, name: l.profiles?.name ?? "Someone", avatar: l.profiles?.avatar_url })),
  comments: r.comments.map((c: Row) => ({ by: c.profiles?.name ?? c.by, text: c.text })),
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null | undefined>(undefined); // undefined = loading, null = needs onboarding
  const [s, setS] = useState<State>({ clockedIn: null, sessions: [], food: [], posts: [], following: [], followers: [], library: [], routines: [] });
  const [active, setActiveRaw] = useState<Active>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadPosts = useCallback(async (id: string) => {
    const { data, error } = await sb.from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments" }).limit(50);
    if (error) console.error("feed", error.message);
    if (data) setS((x) => ({ ...x, posts: data.map((r) => toPost(r, id)) }));
  }, []);

  const loadMine = useCallback(async (id: string) => {
    const [v, w, f, fo, ro] = await Promise.all([
      sb.from("visits").select("in_at").is("out_at", null).order("in_at", { ascending: false }).limit(1),
      sb.from("workouts").select("*").order("created_at", { ascending: false }).limit(50),
      sb.from("food_logs").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("follows").select("follower, followee"), // RLS: only rows that involve me
      sb.from("routines").select("id, name, exercises").order("updated_at", { ascending: false }),
    ]);
    setS((x) => ({
      ...x,
      clockedIn: v.data?.[0]?.in_at ?? null,
      sessions: (w.data ?? []).map((r) => ({ id: r.id, at: r.created_at, title: r.title, exercises: r.exercises.map((e: ExerciseLog) => ({ ...e, name: oldNames[e.name] ?? e.name })) })),
      food: (f.data ?? []).map((r) => ({ id: r.id, name: r.name, kcal: +r.kcal, p: +r.p, c: +r.c, f: +r.f, at: r.created_at })).reverse(),
      following: (fo.data ?? []).filter((r) => r.follower === id).map((r) => r.followee),
      followers: (fo.data ?? []).filter((r) => r.followee === id).map((r) => r.follower),
      routines: ro.data ?? [],
    }));
  }, []);

  useEffect(() => {
    try { const a = localStorage.getItem(ACTIVE); if (a) setActiveRaw(JSON.parse(a)); } catch {}
    sb.from("exercises").select("id, name, muscle, equipment, secondary, lift, image").order("sort")
      .then(({ data }) => data && setS((x) => ({ ...x, library: data })));
    (async () => {
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const r = await sb.auth.signInAnonymously();
        if (r.error) return setErr(r.error.message);
        session = r.data.session;
      }
      const id = session!.user.id;
      setUid(id);
      const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) return setErr(error.message);
      setMe(data);
      await Promise.all([loadPosts(id), data && loadMine(id)]);
    })();
  }, [loadPosts, loadMine]);

  // feed stays live: any post / comment / like change refetches
  useEffect(() => {
    if (!uid) return;
    const reload = () => loadPosts(uid);
    const ch = sb.channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, reload)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [uid, loadPosts]);

  if (err) return <p className="card mt-10 text-sm">Couldn&apos;t connect: {err}</p>;
  if (me === undefined) return <p className="muted mt-20 text-center text-sm">Loading…</p>;

  const saveProfile: Ctx["saveProfile"] = async (p) => {
    const { data, error } = await sb.from("profiles").upsert({ id: uid, ...p }).select().single();
    if (error) throw error;
    setMe(data);
    await loadMine(data.id);
  };
  if (!me) return <Onboarding onSave={saveProfile} />;

  const setActive: Ctx["setActive"] = (fn) => setActiveRaw((a) => {
    const n = fn(a);
    try { if (n) localStorage.setItem(ACTIVE, JSON.stringify(n)); else localStorage.removeItem(ACTIVE); } catch {}
    return n;
  });

  const ctx: Ctx = {
    s: { ...s, active }, me, setActive, saveProfile,
    async clockIn() {
      const at = demoNow().toISOString();
      await sb.from("visits").update({ out_at: at }).is("out_at", null);
      const { error } = await sb.from("visits").insert({ in_at: at });
      if (!error) setS((x) => ({ ...x, clockedIn: at }));
    },
    async clockOut() {
      await sb.from("visits").update({ out_at: demoNow().toISOString() }).is("out_at", null);
      setS((x) => ({ ...x, clockedIn: null }));
    },
    async addFood(f) {
      const { data } = await sb.from("food_logs").insert({ ...f, created_at: demoNow().toISOString() }).select().single();
      if (data) setS((x) => ({ ...x, food: [...x.food, { ...f, id: data.id, at: data.created_at }] }));
    },
    async removeFood(id) {
      setS((x) => ({ ...x, food: x.food.filter((y) => y.id !== id) }));
      await sb.from("food_logs").delete().eq("id", id);
    },
    async finishWorkout(w, post, lifts, media) {
      const at = post.at ?? demoNow().toISOString();
      let media_url = null, media_type = null;
      if (media) {
        // video or photo -> media/<uid>/<time>.<ext>; the post shows it first, swipe for the workout
        const path = `${me.id}/${Date.now()}.${media.name.split(".").pop()?.toLowerCase() || "mp4"}`;
        const up = await sb.storage.from("media").upload(path, media, { contentType: media.type });
        if (up.error) throw up.error;
        media_url = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
        media_type = media.type.startsWith("video") ? "video" : "image";
      }
      const { data } = await sb.from("workouts").insert({ ...w, created_at: at }).select().single();
      await Promise.all([
        sb.from("posts").insert({ title: post.title, note: post.note || null, exercises: post.exercises, volume: post.volume, prs: post.prs,
          duration_min: post.duration, visibility: post.visibility ?? "everyone", media_url, media_type, created_at: at }),
        sb.from("profiles").update(lifts).eq("id", me.id),
      ]);
      setMe({ ...me, ...lifts });
      if (data) setS((x) => ({ ...x, sessions: [{ id: data.id, at, ...w }, ...x.sessions] }));
      setActive(() => null);
      await loadPosts(me.id);
    },
    async like(id, wasLiked) {
      const liked = wasLiked ?? s.posts.find((x) => x.id === id)?.liked ?? false;
      setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === id ? { ...q, liked: !liked, likes: q.likes + (liked ? -1 : 1) } : q)) }));
      if (liked) await sb.from("likes").delete().match({ post_id: id, user_id: me.id });
      else await sb.from("likes").insert({ post_id: id });
    },
    async comment(id, text) {
      setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === id ? { ...q, comments: [...q.comments, { by: me.name, text }] } : q)) }));
      await sb.from("comments").insert({ post_id: id, text });
    },
    async follow(id) {
      setS((x) => ({ ...x, following: [...new Set([...x.following, id])] }));
      await sb.from("follows").insert({ followee: id });
    },
    async setAvatar(file) {
      // centre-crop to a 256px square webp in the browser, then upload to avatars/<uid>/<time>.webp
      const bmp = await createImageBitmap(file);
      const side = Math.min(bmp.width, bmp.height), cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      cv.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
      const blob = await new Promise<Blob>((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't read that image"))), "image/webp", 0.85));
      const path = `${me.id}/${Date.now()}.webp`;
      const up = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/webp" });
      if (up.error) throw up.error;
      const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", me.id);
      if (error) throw error;
      setMe({ ...me, avatar_url: url });
      await loadPosts(me.id);
    },
    async saveRoutine(r) {
      const row = { name: r.name.trim().slice(0, 60) || "My routine", exercises: r.exercises, updated_at: new Date().toISOString() };
      const { data, error } = r.id
        ? await sb.from("routines").update(row).eq("id", r.id).select("id, name, exercises").single()
        : await sb.from("routines").insert(row).select("id, name, exercises").single();
      if (error) throw error;
      setS((x) => ({ ...x, routines: [data, ...x.routines.filter((y) => y.id !== data.id)] }));
    },
    async deleteRoutine(id) {
      setS((x) => ({ ...x, routines: x.routines.filter((y) => y.id !== id) }));
      await sb.from("routines").delete().eq("id", id);
    },
    async unfollow(id) {
      setS((x) => ({ ...x, following: x.following.filter((y) => y !== id) }));
      await sb.from("follows").delete().match({ follower: me.id, followee: id });
    },
  };

  return <C.Provider value={ctx}>{children}</C.Provider>;
}

export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
