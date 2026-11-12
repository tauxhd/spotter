// The phone's data layer: same Supabase project, tables, anonymous sign-in and actions as the website's src/lib/store.tsx.
// The in-progress workout lives on the device (localStorage from expo-sqlite) until it's finished, like on the web.
import "./storage-install";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { oldNames, type Exercise, type ExerciseLog, type Post, type Sex } from "@shared/data";
import type { Unit } from "@shared/units";

export const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_KEY!, {
  // (no localStorage while the web build pre-renders on the server)
  auth: { storage: typeof localStorage !== "undefined" ? localStorage : undefined, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
// refresh the session only while the app is on screen
AppState.addEventListener("change", (st) => (st === "active" ? sb.auth.startAutoRefresh() : sb.auth.stopAutoRefresh()));

export type Profile = { id: string; name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; avatar_url?: string | null; tp?: string | null; course?: string | null; bio?: string | null; unit?: Unit; height?: number | null; age?: number | null; goal?: string | null; activity?: number | null; goal_bw?: number | null; };
export type Routine = { id: string; name: string; exercises: ExerciseLog[] };
export type Session = { id: string; at: string; title: string; exercises: ExerciseLog[] };
export type FoodEntry = { id: string; name: string; kcal: number; p: number; c: number; f: number; at: string };
export type WeightEntry = { id: string; kg: number; at: string };
export type Active = { title: string; startedAt: string; exercises: ExerciseLog[] } | null;
export type Media = { uri: string; type: "image" | "video"; mime?: string; file?: Blob };
export type Row = Record<string, any>;

type State = { sessions: Session[]; posts: Post[]; library: Exercise[]; routines: Routine[]; active: Active; clockedIn: string | null; food: FoodEntry[]; weights: WeightEntry[]; following: string[]; followers: string[] };
type Ctx = {
  s: State;
  me: Profile;
  u: Unit;
  setActive: (fn: (a: Active) => Active) => void;
  finishWorkout: (w: { title: string; exercises: ExerciseLog[] }, post: Pick<Post, "title" | "note" | "exercises" | "volume" | "prs" | "duration" | "visibility"> & { at?: string }, lifts: Pick<Profile, "squat" | "bench" | "deadlift">, media?: Media | null) => Promise<void>;
  like: (id: string, wasLiked?: boolean) => Promise<void>;
  comment: (id: string, text: string) => Promise<void>;
  follow: (id: string) => Promise<void>;
  unfollow: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  saveRoutine: (r: { id?: string; name: string; exercises: ExerciseLog[] }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  updateProfile: (p: Partial<Omit<Profile, "id">>) => Promise<void>;
  setAvatar: (m: Media) => Promise<void>;
  addFood: (f: Omit<FoodEntry, "id" | "at">) => Promise<void>;
  removeFood: (id: string) => Promise<void>;
  addWeight: (kg: number) => Promise<void>;
};
export type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "onboarding"; save: (p: Omit<Profile, "id">) => Promise<void> } | { kind: "ready" };

const C = createContext<Ctx | null>(null);
const S = createContext<Status>({ kind: "loading" });
const ACTIVE = "spotter:active";

// What a post row joins to, and how it becomes a Post: same as the website's POST_SELECT / toPost.
export const POST_SELECT = "*, profiles!posts_user_id_fkey(name, faculty, avatar_url), comments(by, text, created_at, user_id, profiles(name)), likes(user_id, profiles(name, avatar_url))";
export const toPost = (r: Row, uid: string): Post => ({
  id: r.id, by: r.profiles?.name ?? r.by, faculty: r.profiles?.faculty ?? r.faculty, at: r.created_at, title: r.title,
  note: r.note ?? undefined, exercises: r.exercises, volume: Number(r.volume), prs: r.prs,
  likes: r.base_likes + r.likes.length, liked: r.likes.some((l: Row) => l.user_id === uid), mine: r.user_id === uid, uid: r.user_id, avatar: r.profiles?.avatar_url,
  duration: r.duration_min, visibility: r.visibility, media: r.media_url ? { url: r.media_url, type: r.media_type } : null,
  likers: r.likes.map((l: Row) => ({ id: l.user_id, name: l.profiles?.name ?? "Someone", avatar: l.profiles?.avatar_url })),
  comments: r.comments.map((c: Row) => ({ by: c.profiles?.name ?? c.by, text: c.text, uid: c.user_id })),
});

// Upload a picked photo / video to a Supabase storage bucket and return its public URL.
async function upload(bucket: string, path: string, m: Media) {
  const body = m.file ?? (await (await fetch(m.uri)).arrayBuffer());
  const up = await sb.storage.from(bucket).upload(path, body, { contentType: m.mime ?? (m.type === "video" ? "video/mp4" : "image/jpeg") });
  if (up.error) throw up.error;
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null | undefined>(undefined); // undefined = loading, null = needs profile setup
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<State>(() => {
    let active: Active = null;
    try { const a = localStorage.getItem(ACTIVE); if (a) active = JSON.parse(a); } catch {}
    return { sessions: [], posts: [], library: [], routines: [], active, clockedIn: null, food: [], weights: [], following: [], followers: [] };
  });

  const loadPosts = useCallback(async (id: string) => {
    const { data } = await sb.from("posts").select(POST_SELECT)
      .order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments" }).limit(50);
    if (data) setS((x) => ({ ...x, posts: data.map((r) => toPost(r, id)) }));
  }, []);
  const loadMine = useCallback(async (id: string) => {
    const [w, ro, v, f, wl, fo] = await Promise.all([
      sb.from("workouts").select("*").order("created_at", { ascending: false }).limit(400),
      sb.from("routines").select("id, name, exercises").order("updated_at", { ascending: false }),
      sb.from("visits").select("in_at").is("out_at", null).order("in_at", { ascending: false }).limit(1),
      sb.from("food_logs").select("*").order("created_at", { ascending: false }).limit(400), // ~5 weeks, for maintenance
      sb.from("weight_logs").select("id, kg, created_at").order("created_at", { ascending: false }).limit(120),
      sb.from("follows").select("follower, followee"),
    ]);
    setS((x) => ({
      ...x,
      clockedIn: v.data?.[0]?.in_at ?? null,
      food: (f.data ?? []).map((r) => ({ id: r.id, name: r.name, kcal: +r.kcal, p: +r.p, c: +r.c, f: +r.f, at: r.created_at })).reverse(),
      weights: (wl.data ?? []).map((r) => ({ id: r.id, kg: +r.kg, at: r.created_at })).reverse(),
      sessions: (w.data ?? []).map((r) => ({ id: r.id, at: r.created_at, title: r.title, exercises: r.exercises.map((e: ExerciseLog) => ({ ...e, name: oldNames[e.name] ?? e.name })) })),
      routines: ro.data ?? [],
      following: (fo.data ?? []).filter((r) => r.follower === id).map((r) => r.followee),
      followers: (fo.data ?? []).filter((r) => r.followee === id).map((r) => r.follower),
    }));
  }, []);

  useEffect(() => {
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

  // feed stays live: any post / comment / like change refetches (same channel as the website)
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

  const status: Status = err ? { kind: "error", message: err } : me === undefined ? { kind: "loading" } : !me
    ? { kind: "onboarding", async save(p) {
        const { data, error } = await sb.from("profiles").upsert({ id: uid, ...p }).select().single();
        if (error) throw error;
        setMe(data);
        await loadMine(data.id);
      } }
    : { kind: "ready" };

  const ctx: Ctx | null = me ? {
    s, me, u: me.unit ?? "kg",
    setActive: (fn) => setS((x) => {
      const n = fn(x.active);
      try { if (n) localStorage.setItem(ACTIVE, JSON.stringify(n)); else localStorage.removeItem(ACTIVE); } catch {}
      return { ...x, active: n };
    }),
    async finishWorkout(w, post, lifts, media) {
      const at = post.at ?? new Date().toISOString();
      let media_url = null, media_type = null;
      if (media) {
        const ext = media.type === "video" ? "mp4" : (media.mime?.split("/")[1] ?? "jpg");
        media_url = await upload("media", `${me.id}/${Date.now()}.${ext}`, media);
        media_type = media.type;
      }
      const { data } = await sb.from("workouts").insert({ ...w, created_at: at }).select().single();
      await Promise.all([
        sb.from("posts").insert({ title: post.title, note: post.note || null, exercises: post.exercises, volume: post.volume, prs: post.prs,
          duration_min: post.duration, visibility: post.visibility ?? "everyone", media_url, media_type, created_at: at }),
        sb.from("profiles").update(lifts).eq("id", me.id),
      ]);
      setMe({ ...me, ...lifts });
      setS((x) => ({ ...x, active: null, sessions: data ? [{ id: data.id, at, ...w }, ...x.sessions] : x.sessions }));
      try { localStorage.removeItem(ACTIVE); } catch {}
      await loadPosts(me.id);
    },
    async like(id, wasLiked) {
      const liked = wasLiked ?? s.posts.find((x) => x.id === id)?.liked ?? false;
      setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === id ? { ...q, liked: !liked, likes: q.likes + (liked ? -1 : 1) } : q)) }));
      if (liked) await sb.from("likes").delete().match({ post_id: id, user_id: me.id });
      else await sb.from("likes").insert({ post_id: id });
    },
    async comment(id, text) {
      setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === id ? { ...q, comments: [...q.comments, { by: me.name, text, uid: me.id }] } : q)) }));
      await sb.from("comments").insert({ post_id: id, text });
    },
    async follow(id) {
      setS((x) => ({ ...x, following: [...new Set([...x.following, id])] }));
      await sb.from("follows").insert({ followee: id });
    },
    async unfollow(id) {
      setS((x) => ({ ...x, following: x.following.filter((y) => y !== id) }));
      await sb.from("follows").delete().match({ follower: me.id, followee: id });
    },
    refresh: () => loadPosts(me.id),
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
    async clockIn() {
      const at = new Date().toISOString();
      await sb.from("visits").update({ out_at: at }).is("out_at", null);
      const { error } = await sb.from("visits").insert({ in_at: at });
      if (!error) setS((x) => ({ ...x, clockedIn: at }));
    },
    async clockOut() {
      await sb.from("visits").update({ out_at: new Date().toISOString() }).is("out_at", null);
      setS((x) => ({ ...x, clockedIn: null }));
    },
    async updateProfile(p) {
      const { data, error } = await sb.from("profiles").update(p).eq("id", me.id).select().single();
      if (error) throw error;
      setMe(data);
    },
    async setAvatar(m) {
      const url = await upload("avatars", `${me.id}/${Date.now()}.${m.mime?.split("/")[1] ?? "jpg"}`, m);
      const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", me.id);
      if (error) throw error;
      setMe({ ...me, avatar_url: url });
      await loadPosts(me.id);
    },
    async addFood(f) {
      const { data } = await sb.from("food_logs").insert({ ...f, created_at: new Date().toISOString() }).select().single();
      if (data) setS((x) => ({ ...x, food: [...x.food, { ...f, id: data.id, at: data.created_at }] }));
    },
    async removeFood(id) {
      setS((x) => ({ ...x, food: x.food.filter((y) => y.id !== id) }));
      await sb.from("food_logs").delete().eq("id", id);
    },
    async addWeight(kg) {
      const { data, error } = await sb.from("weight_logs").insert({ kg, created_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      setS((x) => ({ ...x, weights: [...x.weights, { id: data.id, kg: +data.kg, at: data.created_at }] }));
    },
  } : null;

  return <S.Provider value={status}>{ctx ? <C.Provider value={ctx}>{children}</C.Provider> : children}</S.Provider>;
}

export const useStatus = () => useContext(S);
export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error("useStore before the profile has loaded");
  return v;
}
