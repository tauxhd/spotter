// The phone's data layer: same Supabase project, tables, anonymous sign-in and actions as the website's src/lib/store.tsx.
// The in-progress workout lives on the device (localStorage from expo-sqlite) until it's finished, like on the web.
import "./storage-install";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import type { Converted } from '@shared/hevy';
import type { Lifts } from '@shared/lifting';
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

type State = { sessions: Session[]; posts: Post[]; morePosts: boolean; rev: number; library: Exercise[]; routines: Routine[]; active: Active; clockedIn: string | null; food: FoodEntry[]; weights: WeightEntry[]; following: string[]; followers: string[] };
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
  signOut: () => Promise<void>;
  loadMore: () => Promise<void>;
  importHevy: (items: Converted[], lifts: Lifts) => Promise<number>; // returns how many were new
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
const ACTIONS = ["setActive", "finishWorkout", "like", "comment", "follow", "unfollow", "signOut", "refresh", "loadMore", "importHevy", "saveRoutine", "deleteRoutine",
  "clockIn", "clockOut", "updateProfile", "setAvatar", "addFood", "removeFood", "addWeight"] as const satisfies readonly (keyof Ctx)[];
type Action = (typeof ACTIONS)[number];
export type Status = { kind: "loading" } | { kind: "error"; message: string } | { kind: "onboarding"; save: (p: Omit<Profile, "id">) => Promise<void> } | { kind: "ready" };

const C = createContext<Ctx | null>(null);
const S = createContext<Status>({ kind: "loading" });
// Narrow, slow-changing slices for components that appear many times (post cards, follow buttons): reading the whole store
// re-renders them on every change anywhere (a food log, the workout timer); these only change when their own data does.
const A = createContext<Pick<Ctx, Action> | null>(null);
const M = createContext<{ me: Profile; u: Unit } | null>(null);
const L = createContext<Exercise[]>([]);
const F = createContext<{ following: string[]; followers: string[] }>({ following: [], followers: [] });
const ACTIVE = "spotter:active";
const PAGE = 20; // feed posts per page
let paging = false; // a feed page is loading (one store per app, so module-level is enough)
const CACHE = "spotter:cache", LIB = "spotter:library"; // last-seen data, so the app opens instantly
// read once at start-up (localStorage here is expo-sqlite, synchronous): the first frame is your app, not a spinner
const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } };
const cached: { uid: string; me: Profile; s: Partial<State> } | null = read(CACHE);

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
  const [uid, setUid] = useState<string | null>(cached?.uid ?? null);
  const [me, setMe] = useState<Profile | null | undefined>(cached?.me); // undefined = loading, null = needs profile setup
  const [err, setErr] = useState<string | null>(null);
  const [s, setS] = useState<State>(() => {
    let active: Active = null;
    try { const a = localStorage.getItem(ACTIVE); if (a) active = JSON.parse(a); } catch {}
    return { sessions: [], posts: [], morePosts: true, rev: 0, routines: [], clockedIn: null, food: [], weights: [], following: [], followers: [], ...cached?.s, library: read(LIB) ?? [], active };
  });

  // The feed loads PAGE posts, then more as you scroll (loadMore). A refresh reloads the newest PAGE and keeps the older
  // ones already scrolled in, so a live update never collapses the list.
  const loadPosts = useCallback(async (id: string) => {
    const { data, error } = await sb.from("posts").select(POST_SELECT)
      .order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments" }).limit(PAGE);
    if (error) console.error("feed", error.message);
    if (data) setS((x) => {
      const fresh = data.map((r) => toPost(r, id)), cut = fresh.at(-1)?.at ?? "";
      const older = fresh.length === PAGE ? x.posts.filter((p) => p.at < cut) : [];
      return { ...x, morePosts: older.length ? x.morePosts : fresh.length === PAGE, posts: [...fresh, ...older] };
    });
  }, []);
  // the next page of the feed: PAGE posts older than the last one shown
  const loadMorePosts = useCallback(async (id: string, posts: Post[], more: boolean) => {
    if (paging || !more || !posts.length) return;
    paging = true;
    try {
      const { data } = await sb.from("posts").select(POST_SELECT)
        .order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments" }).lt("created_at", posts[posts.length - 1].at).limit(PAGE);
      if (data) setS((x) => ({ ...x, morePosts: data.length === PAGE, posts: [...x.posts, ...data.map((r) => toPost(r, id)).filter((p) => !x.posts.some((y) => y.id === p.id))] }));
    } finally { paging = false; }
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

  // Sign in (anonymously if there's no session yet), then load the profile and everything that hangs off it.
  const boot = useCallback(async () => {
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const r = await sb.auth.signInAnonymously();
      if (r.error) return setErr(r.error.message);
      session = r.data.session;
    }
    const id = session!.user.id;
    setUid(id);
    if (cached && cached.uid !== id) setS((x) => ({ ...x, sessions: [], posts: [], routines: [], food: [], weights: [], following: [], followers: [], clockedIn: null }));
    const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) return cached?.uid === id ? undefined : setErr(error.message); // offline with a cached copy: keep showing it
    setMe(data);
    await Promise.all([loadPosts(id), data && loadMine(id)]);
  }, [loadPosts, loadMine]);

  useEffect(() => {
    sb.from("exercises").select("id, name, muscle, equipment, secondary, lift, image").order("sort")
      .then(({ data }) => { if (!data) return; setS((x) => ({ ...x, library: data })); try { localStorage.setItem(LIB, JSON.stringify(data)); } catch {} });
    Promise.resolve().then(boot); // async: the state it sets lands after the first render
  }, [boot]);
  // signing in to an existing account (the quest's sign-in form): load that account
  useEffect(() => sb.auth.onAuthStateChange((e, session) => { if (e === 'SIGNED_IN' && session && !session.user.is_anonymous) setTimeout(boot, 0); }).data.subscription.unsubscribe, [boot]);

  // feed stays live (same channel as the website)
  useEffect(() => {
    if (!uid) return;
    // Your own likes / comments are already on screen (optimistic), so they don't trigger a refetch; other people's changes
    // are batched into one refetch at most every ~0.6 s instead of one per event.
    let t: ReturnType<typeof setTimeout> | undefined;
    const reload = (e: { new?: Row; old?: Row }) => {
      if ((e.new?.user_id ?? e.old?.user_id) === uid) return;
      clearTimeout(t);
      t = setTimeout(() => loadPosts(uid), 600);
    };
    const ch = sb.channel("feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, reload)
      .subscribe();
    return () => { clearTimeout(t); sb.removeChannel(ch); };
  }, [uid, loadPosts]);

  // Keep a copy of your profile and data on the device (a moment after each change), so next time the app opens straight
  // into it while fresh data loads behind. Temporary rows (still saving) and the exercise library (cached on its own) stay out.
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      const keep = <T extends { id: string }>(l: T[]) => l.filter((x) => !x.id.startsWith("tmp-"));
      try { localStorage.setItem(CACHE, JSON.stringify({ uid: me.id, me, s: { ...s, active: undefined, library: [], posts: keep(s.posts).slice(0, 30), sessions: keep(s.sessions), food: keep(s.food), weights: keep(s.weights) } })); } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [me, s]);

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
    // Finish: everything on screen at once (session, post, lifts); the save runs in the background and the workout stays on
    // the device until the server has it, so a failed save puts it back instead of losing it.
    async finishWorkout(w, post, lifts, media) {
      const at = post.at ?? new Date().toISOString();
      const kept = s.active, tmp = `tmp-${Date.now()}`;
      setMe({ ...me, ...lifts });
      setS((x) => ({
        ...x, active: null, sessions: [{ id: tmp, at, ...w }, ...x.sessions],
        posts: [{ id: tmp, by: me.name, faculty: me.faculty, at, title: post.title, note: post.note, exercises: post.exercises, volume: post.volume, prs: post.prs,
          duration: post.duration, visibility: post.visibility, media: media ? { url: media.uri, type: media.type } : null,
          likes: 0, liked: false, mine: true, uid: me.id, avatar: me.avatar_url, likers: [], comments: [] }, ...x.posts],
      }));
      (async () => {
        let media_url = null, media_type = null;
        if (media) {
          const ext = media.type === "video" ? "mp4" : (media.mime?.split("/")[1] ?? "jpg");
          media_url = await upload("media", `${me.id}/${Date.now()}.${ext}`, media);
          media_type = media.type;
        }
        const { data, error } = await sb.from("workouts").insert({ ...w, created_at: at }).select().single();
        if (error) throw error;
        await Promise.all([
          sb.from("posts").insert({ title: post.title, note: post.note || null, exercises: post.exercises, volume: post.volume, prs: post.prs,
            duration_min: post.duration, visibility: post.visibility ?? "everyone", media_url, media_type, created_at: at }),
          sb.from("profiles").update(lifts).eq("id", me.id),
        ]);
        setS((x) => ({ ...x, sessions: x.sessions.map((y) => (y.id === tmp ? { ...y, id: data.id } : y)) }));
        try { localStorage.removeItem(ACTIVE); } catch {}
        await loadPosts(me.id);
      })().catch((e) => { // couldn't save: bring the workout back so nothing is lost
        console.warn("finish", e);
        setS((x) => ({ ...x, active: kept, sessions: x.sessions.filter((y) => y.id !== tmp), posts: x.posts.filter((y) => y.id !== tmp) }));
        Alert.alert("Couldn't save your workout", "It's still here, so try Finish again when you're online.");
      });
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
    async signOut() {
      try { localStorage.removeItem(ACTIVE); localStorage.removeItem(CACHE); } catch {}
      await sb.auth.signOut();
      setMe(undefined); setUid(null);
      setS((x) => ({ ...x, sessions: [], posts: [], routines: [], active: null, clockedIn: null, food: [], weights: [], following: [], followers: [] }));
      await boot(); // a fresh session with no profile -> the sign-in quest
    },
    // Import from Hevy: save converted workouts + posts, skipping any already here (same start minute), then raise best lifts
    async importHevy(items, lifts) {
      const { data: have } = await sb.from("posts").select("created_at").eq("user_id", me.id);
      const min = (t: string) => Math.floor(new Date(t).getTime() / 60000); // Hevy's CSV keeps minutes, not seconds
      const seen = new Set((have ?? []).map((r) => min(r.created_at)));
      const todo = items.filter((x) => !seen.has(min(x.at)));
      for (let i = 0; i < todo.length; i += 50) {
        const part = todo.slice(i, i + 50);
        const w = await sb.from("workouts").insert(part.map((x) => ({ ...x.workout, created_at: x.at })));
        if (w.error) throw w.error;
        const p = await sb.from("posts").insert(part.map((x) => ({ ...x.post, created_at: x.at })));
        if (p.error) throw p.error;
      }
      if (todo.length) {
        const up = { squat: Math.max(Number(me.squat), lifts.squat), bench: Math.max(Number(me.bench), lifts.bench), deadlift: Math.max(Number(me.deadlift), lifts.deadlift) };
        await sb.from("profiles").update(up).eq("id", me.id);
        setMe((m) => (m ? { ...m, ...up } : m));
        await Promise.all([loadPosts(me.id), loadMine(me.id)]);
      }
      return todo.length;
    },
    async refresh() {
      setS((x) => ({ ...x, rev: x.rev + 1 }));
      await Promise.all([loadPosts(me.id), loadMine(me.id)]);
    },
    loadMore: () => loadMorePosts(me.id, s.posts, s.morePosts), // the next page of the feed (Feed calls it near the bottom)
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
    async clockIn() { // shows you as in straight away; undone if the server refuses
      const at = new Date().toISOString();
      setS((x) => ({ ...x, clockedIn: at }));
      await sb.from("visits").update({ out_at: at }).is("out_at", null);
      const { error } = await sb.from("visits").insert({ in_at: at });
      if (error) setS((x) => ({ ...x, clockedIn: null }));
    },
    async clockOut() {
      setS((x) => ({ ...x, clockedIn: null }));
      await sb.from("visits").update({ out_at: new Date().toISOString() }).is("out_at", null);
    },
    async updateProfile(p) { // on screen at once; put back if the save fails
      const { avatar_url: _, ...rest } = p as typeof p & { avatar_url?: string | null }; // eslint-disable-line @typescript-eslint/no-unused-vars
      p = rest; // the photo only changes through setAvatar, so an older form can't wipe a new one
      const before = me;
      setMe({ ...me, ...p });
      const { data, error } = await sb.from("profiles").update(p).eq("id", me.id).select().single();
      if (error) { setMe(before); throw error; }
      setMe(data);
    },
    async setAvatar(m) {
      const url = await upload("avatars", `${me.id}/${Date.now()}.${m.mime?.split("/")[1] ?? "jpg"}`, m);
      const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", me.id);
      if (error) throw error;
      setMe({ ...me, avatar_url: url });
      await loadPosts(me.id);
    },
    async addFood(f) { // on screen at once; the saved row's id replaces the temporary one
      const at = new Date().toISOString(), tmp = `tmp-${Date.now()}`;
      setS((x) => ({ ...x, food: [...x.food, { ...f, id: tmp, at }] }));
      const { data } = await sb.from("food_logs").insert({ ...f, created_at: at }).select().single();
      setS((x) => ({ ...x, food: data ? x.food.map((y) => (y.id === tmp ? { ...y, id: data.id } : y)) : x.food.filter((y) => y.id !== tmp) }));
    },
    async removeFood(id) {
      setS((x) => ({ ...x, food: x.food.filter((y) => y.id !== id) }));
      await sb.from("food_logs").delete().eq("id", id);
    },
    async addWeight(kg) { // on screen at once; rolled back if the save fails
      const at = new Date().toISOString(), tmp = `tmp-${Date.now()}`;
      setS((x) => ({ ...x, weights: [...x.weights, { id: tmp, kg, at }] }));
      const { data, error } = await sb.from("weight_logs").insert({ kg, created_at: at }).select().single();
      setS((x) => ({ ...x, weights: data ? x.weights.map((y) => (y.id === tmp ? { ...y, id: data.id } : y)) : x.weights.filter((y) => y.id !== tmp) }));
      if (error) throw error;
    },
  } : null;

  // Hand out actions that keep the same identity across renders (they always call the latest version). Screens pass them
  // to list items, so with stable functions the React Compiler can skip every card whose data didn't change: logging a
  // food re-renders the Today list, not all 45 cafeteria cards.
  const latest = useRef(ctx);
  useLayoutEffect(() => { latest.current = ctx; });
  const actions = useMemo(() => Object.fromEntries(ACTIONS.map((k) => [k, (...a: unknown[]) => (latest.current![k] as (...x: unknown[]) => unknown)(...a)])) as Pick<Ctx, Action>, []);
  const value = ctx && { ...ctx, ...actions };
  const meSlice = useMemo(() => (me ? { me, u: me.unit ?? "kg" } : null), [me]);
  const follows = useMemo(() => ({ following: s.following, followers: s.followers }), [s.following, s.followers]);

  return (
    <S.Provider value={status}>
      <A.Provider value={actions}><M.Provider value={meSlice}><L.Provider value={s.library}><F.Provider value={follows}>
        {value ? <C.Provider value={value}>{children}</C.Provider> : children}
      </F.Provider></L.Provider></M.Provider></A.Provider>
    </S.Provider>
  );
}

export const useStatus = () => useContext(S);
export const useActions = () => useContext(A)!; // stable: never re-renders you
export function useMe() {
  const v = useContext(M);
  if (!v) throw new Error("useMe before the profile has loaded");
  return v;
}
export const useLibrary = () => useContext(L);
export const useFollows = () => useContext(F);
export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error("useStore before the profile has loaded");
  return v;
}
