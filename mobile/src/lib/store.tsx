// The phone's data layer: same Supabase project, tables and anonymous sign-in as the website (src/lib/store.tsx there).
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

export type Profile = { id: string; name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; avatar_url?: string | null; unit?: Unit };
export type Routine = { id: string; name: string; exercises: ExerciseLog[] };
export type Session = { id: string; at: string; title: string; exercises: ExerciseLog[] };
export type Active = { title: string; startedAt: string; exercises: ExerciseLog[] } | null;
type Row = Record<string, any>;

type State = { sessions: Session[]; posts: Post[]; library: Exercise[]; routines: Routine[]; active: Active };
type Ctx = {
  s: State;
  me: Profile;
  u: Unit;
  setActive: (fn: (a: Active) => Active) => void;
  finishWorkout: (w: { title: string; exercises: ExerciseLog[] }, post: Pick<Post, "title" | "exercises" | "volume" | "prs" | "duration">, lifts: Pick<Profile, "squat" | "bench" | "deadlift">) => Promise<void>;
  like: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};
export type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "onboarding"; save: (p: Omit<Profile, "id">) => Promise<void> } | { kind: "ready" };

const C = createContext<Ctx | null>(null);
const S = createContext<Status>({ kind: "loading" });
const ACTIVE = "spotter:active";

// Same shape as the web's toPost, minus comments/likers (not shown on the phone yet).
const POST_SELECT = "*, profiles!posts_user_id_fkey(name, faculty, avatar_url), likes(user_id)";
const toPost = (r: Row, uid: string): Post => ({
  id: r.id, by: r.profiles?.name ?? r.by, faculty: r.profiles?.faculty ?? r.faculty, at: r.created_at, title: r.title,
  note: r.note ?? undefined, exercises: r.exercises, volume: Number(r.volume), prs: r.prs,
  likes: r.base_likes + r.likes.length, liked: r.likes.some((l: Row) => l.user_id === uid), mine: r.user_id === uid, uid: r.user_id,
  avatar: r.profiles?.avatar_url, duration: r.duration_min, visibility: r.visibility, media: null, likers: [], comments: [],
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null | undefined>(undefined); // undefined = loading, null = needs profile setup
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<State>(() => {
    let active: Active = null;
    try { const a = localStorage.getItem(ACTIVE); if (a) active = JSON.parse(a); } catch {}
    return { sessions: [], posts: [], library: [], routines: [], active };
  });

  const loadPosts = useCallback(async (id: string) => {
    const { data } = await sb.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(50);
    if (data) setS((x) => ({ ...x, posts: data.map((r) => toPost(r, id)) }));
  }, []);
  const loadMine = useCallback(async () => {
    const [w, ro] = await Promise.all([
      sb.from("workouts").select("*").order("created_at", { ascending: false }).limit(400),
      sb.from("routines").select("id, name, exercises").order("updated_at", { ascending: false }),
    ]);
    setS((x) => ({
      ...x,
      sessions: (w.data ?? []).map((r) => ({ id: r.id, at: r.created_at, title: r.title, exercises: r.exercises.map((e: ExerciseLog) => ({ ...e, name: oldNames[e.name] ?? e.name })) })),
      routines: ro.data ?? [],
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
      await Promise.all([loadPosts(id), data && loadMine()]);
    })();
  }, [loadPosts, loadMine]);

  const status: Status = err ? { kind: "error", message: err } : me === undefined ? { kind: "loading" } : !me
    ? { kind: "onboarding", async save(p) {
        const { data, error } = await sb.from("profiles").upsert({ id: uid, ...p }).select().single();
        if (error) throw error;
        setMe(data);
        await loadMine();
      } }
    : { kind: "ready" };

  const ctx: Ctx | null = me ? {
    s, me, u: me.unit ?? "kg",
    setActive: (fn) => setS((x) => {
      const n = fn(x.active);
      try { if (n) localStorage.setItem(ACTIVE, JSON.stringify(n)); else localStorage.removeItem(ACTIVE); } catch {}
      return { ...x, active: n };
    }),
    async finishWorkout(w, post, lifts) {
      const at = new Date().toISOString();
      const { data } = await sb.from("workouts").insert({ ...w, created_at: at }).select().single();
      await Promise.all([
        sb.from("posts").insert({ title: post.title, exercises: post.exercises, volume: post.volume, prs: post.prs, duration_min: post.duration, visibility: "everyone", created_at: at }),
        sb.from("profiles").update(lifts).eq("id", me.id),
      ]);
      setMe({ ...me, ...lifts });
      setS((x) => ({ ...x, active: null, sessions: data ? [{ id: data.id, at, ...w }, ...x.sessions] : x.sessions }));
      try { localStorage.removeItem(ACTIVE); } catch {}
      await loadPosts(me.id);
    },
    async like(id) {
      const liked = s.posts.find((x) => x.id === id)?.liked ?? false;
      setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === id ? { ...q, liked: !liked, likes: q.likes + (liked ? -1 : 1) } : q)) }));
      if (liked) await sb.from("likes").delete().match({ post_id: id, user_id: me.id });
      else await sb.from("likes").insert({ post_id: id });
    },
    refresh: () => loadPosts(me.id),
  } : null;

  return <S.Provider value={status}>{ctx ? <C.Provider value={ctx}>{children}</C.Provider> : children}</S.Provider>;
}

export const useStatus = () => useContext(S);
export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error("useStore before the profile has loaded");
  return v;
}
