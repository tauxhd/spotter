"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { demoNow, oldNames, type Exercise, type ExerciseLog, type Post, type Sex } from "./data";
import Splash from "@/components/Splash";
import Quest from "@/components/Quest";
import type { Unit } from "./units";
import { demoAccount } from "./demo";

export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!);

export type Profile = { id: string; name: string; faculty: string; sex: Sex; bw: number; squat: number; bench: number; deadlift: number; intake: string | null; avatar_url?: string | null; tp?: string | null; course?: string | null; bio?: string | null; unit?: Unit; height?: number | null; age?: number | null; goal?: string | null; activity?: number | null; goal_bw?: number | null; };
export type Routine = { id: string; name: string; exercises: ExerciseLog[] };
export type Session = { id: string; at: string; title: string; exercises: ExerciseLog[] };
export type FoodEntry = { id: string; name: string; kcal: number; p: number; c: number; f: number; at: string };
export type WeightEntry = { id: string; kg: number; at: string };
type Active = { title: string; startedAt: string; exercises: ExerciseLog[] } | null;

type State = { clockedIn: string | null; sessions: Session[]; food: FoodEntry[]; weights: WeightEntry[]; posts: Post[]; following: string[]; followers: string[]; library: Exercise[]; routines: Routine[] };
type Ctx = {
  s: State & { active: Active };
  me: Profile;
  u: Unit; // viewer's preferred weight unit
  demo: boolean; // the landing page's demo account (/?demo=1): made-up data, nothing is saved
  setActive: (fn: (a: Active) => Active) => void;
  saveProfile: (p: Omit<Profile, "id">) => Promise<void>;
  updateProfile: (p: Partial<Omit<Profile, "id">>) => Promise<void>;
  clockIn: () => Promise<void>;
  clockOut: () => Promise<void>;
  addFood: (f: Omit<FoodEntry, "id" | "at">) => Promise<void>;
  removeFood: (id: string) => Promise<void>;
  addWeight: (kg: number) => Promise<void>;
  finishWorkout: (w: { title: string; exercises: ExerciseLog[] }, post: Pick<Post, "title" | "note" | "exercises" | "volume" | "prs" | "duration" | "visibility"> & { at?: string }, lifts: Pick<Profile, "squat" | "bench" | "deadlift">, media?: File | null) => Promise<void>;
  like: (id: string, wasLiked?: boolean) => Promise<void>;
  comment: (id: string, text: string) => Promise<void>;
  follow: (id: string) => Promise<void>;
  setAvatar: (file: File) => Promise<void>;
  saveRoutine: (r: { id?: string; name: string; exercises: ExerciseLog[] }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  unfollow: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const C = createContext<Ctx | null>(null);
const ACTIVE = "spotter:active"; // the in-progress workout stays on the device until finished
const CACHE = "spotter:cache", LIB = "spotter:library"; // last-seen data, so the app opens instantly

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
// What a post row joins to, and how it becomes a Post. Shared by the feed and profile pages.
export const POST_SELECT = "*, profiles!posts_user_id_fkey(name, faculty, avatar_url), comments(by, text, created_at, user_id, profiles(name)), likes(user_id, profiles(name, avatar_url))";
export const toPost = (r: Row, uid: string): Post => ({
  id: r.id, by: r.profiles?.name ?? r.by, faculty: r.profiles?.faculty ?? r.faculty, at: r.created_at, title: r.title,
  note: r.note ?? undefined, exercises: r.exercises, volume: Number(r.volume), prs: r.prs,
  likes: r.base_likes + r.likes.length, liked: r.likes.some((l: Row) => l.user_id === uid), mine: r.user_id === uid, uid: r.user_id, avatar: r.profiles?.avatar_url,
  duration: r.duration_min, visibility: r.visibility, media: r.media_url ? { url: r.media_url, type: r.media_type } : null,
  likers: r.likes.map((l: Row) => ({ id: l.user_id, name: l.profiles?.name ?? "Someone", avatar: l.profiles?.avatar_url })),
  comments: r.comments.map((c: Row) => ({ by: c.profiles?.name ?? c.by, text: c.text, uid: c.user_id })),
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null | undefined>(undefined); // undefined = loading, null = needs onboarding
  const [s, setS] = useState<State>({ clockedIn: null, sessions: [], food: [], weights: [], posts: [], following: [], followers: [], library: [], routines: [] });
  const [active, setActiveRaw] = useState<Active>(null);
  const [err, setErr] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const loadPosts = useCallback(async (id: string) => {
    const { data, error } = await sb.from("posts")
      .select(POST_SELECT)
      .order("created_at", { ascending: false }).order("created_at", { referencedTable: "comments" }).limit(50);
    if (error) console.error("feed", error.message);
    if (data) setS((x) => ({ ...x, posts: data.map((r) => toPost(r, id)) }));
  }, []);

  const loadMine = useCallback(async (id: string) => {
    const [v, w, f, wl, fo, ro] = await Promise.all([
      sb.from("visits").select("in_at").is("out_at", null).order("in_at", { ascending: false }).limit(1),
      sb.from("workouts").select("*").order("created_at", { ascending: false }).limit(400), // ~a year of training, for exercise history
      sb.from("food_logs").select("*").order("created_at", { ascending: false }).limit(400), // ~5 weeks, for maintenance
      sb.from("weight_logs").select("id, kg, created_at").order("created_at", { ascending: false }).limit(120),
      sb.from("follows").select("follower, followee"), // RLS: only rows that involve me
      sb.from("routines").select("id, name, exercises").order("updated_at", { ascending: false }),
    ]);
    setS((x) => ({
      ...x,
      clockedIn: v.data?.[0]?.in_at ?? null,
      sessions: (w.data ?? []).map((r) => ({ id: r.id, at: r.created_at, title: r.title, exercises: r.exercises.map((e: ExerciseLog) => ({ ...e, name: oldNames[e.name] ?? e.name })) })),
      food: (f.data ?? []).map((r) => ({ id: r.id, name: r.name, kcal: +r.kcal, p: +r.p, c: +r.c, f: +r.f, at: r.created_at })).reverse(),
      weights: (wl.data ?? []).map((r) => ({ id: r.id, kg: +r.kg, at: r.created_at })).reverse(),
      following: (fo.data ?? []).filter((r) => r.follower === id).map((r) => r.followee),
      followers: (fo.data ?? []).filter((r) => r.followee === id).map((r) => r.follower),
      routines: ro.data ?? [],
    }));
  }, []);

  useEffect(() => {
    let isDemo = false;
    try { isDemo = new URLSearchParams(location.search).has("demo") || !!sessionStorage.getItem("spotter:demo"); if (isDemo) sessionStorage.setItem("spotter:demo", "1"); } catch {}
    if (isDemo) { // made-up account; still signs in (anonymously) so the public feed, ranks and people can be read
      const d = demoAccount();
      setDemo(true);
      // shown in the landing page's phone frame: a phone has no scrollbar
      document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}" }));
      setMe(d.me);
      setS((x) => ({ ...x, sessions: d.sessions, food: d.food, weights: d.weights, routines: d.routines }));
      sb.from("exercises").select("id, name, muscle, equipment, secondary, lift, image").order("sort").then(({ data }) => data && setS((x) => ({ ...x, library: data })));
      (async () => {
        let { data: { session } } = await sb.auth.getSession();
        if (!session) session = (await sb.auth.signInAnonymously()).data.session;
        if (session) loadPosts(d.me.id);
      })();
      return;
    }
    try { const a = localStorage.getItem(ACTIVE); if (a) setActiveRaw(JSON.parse(a)); } catch {}
    // open straight into what was on screen last time (then refresh below)
    let cachedUid: string | undefined;
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) ?? "null"), lib = JSON.parse(localStorage.getItem(LIB) ?? "null");
      if (c?.me) { cachedUid = c.uid; setUid(c.uid); setMe(c.me); setS((x) => ({ ...x, ...c.s })); }
      if (lib) setS((x) => ({ ...x, library: lib }));
    } catch {}
    sb.from("exercises").select("id, name, muscle, equipment, secondary, lift, image").order("sort")
      .then(({ data }) => { if (!data) return; setS((x) => ({ ...x, library: data })); try { localStorage.setItem(LIB, JSON.stringify(data)); } catch {} });
    (async () => {
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const r = await sb.auth.signInAnonymously();
        if (r.error) return setErr(r.error.message);
        session = r.data.session;
      }
      const id = session!.user.id;
      setUid(id);
      if (cachedUid && cachedUid !== id) setS((x) => ({ ...x, sessions: [], posts: [], routines: [], food: [], weights: [], following: [], followers: [], clockedIn: null }));
      const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) return cachedUid ? undefined : setErr(error.message); // offline with a cached copy: keep showing it
      setMe(data);
      await Promise.all([loadPosts(id), data && loadMine(id)]);
    })();
  }, [loadPosts, loadMine]);

  // feed stays live
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
    if (!me || demo) return;
    const t = setTimeout(() => {
      const keep = <T extends { id: string }>(l: T[]) => l.filter((x) => !x.id.startsWith("tmp-"));
      try { localStorage.setItem(CACHE, JSON.stringify({ uid: me.id, me, s: { ...s, active: undefined, library: [], posts: keep(s.posts).slice(0, 30), sessions: keep(s.sessions), food: keep(s.food), weights: keep(s.weights) } })); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [me, s, demo]);

  if (err) return <p className="card mt-10 text-sm">Couldn&apos;t connect: {err}</p>;
  if (me === undefined) return <Splash />;

  const saveProfile: Ctx["saveProfile"] = async (p) => {
    const { data, error } = await sb.from("profiles").upsert({ id: uid, ...p }).select().single();
    if (error) throw error;
    setMe(data);
    await loadMine(data.id);
  };
  if (!me) return <main className="mx-auto min-h-dvh max-w-md overflow-x-hidden px-4 pb-10"><Quest onSave={saveProfile} /></main>;

  const setActive: Ctx["setActive"] = (fn) => setActiveRaw((a) => {
    const n = fn(a);
    if (!demo) try { if (n) localStorage.setItem(ACTIVE, JSON.stringify(n)); else localStorage.removeItem(ACTIVE); } catch {}
    return n;
  });

  const ctx: Ctx = {
    s: { ...s, active }, me, u: me.unit ?? "kg", demo, setActive, saveProfile,
    async clockIn() { // shows you as in straight away; undone if the server refuses
      const at = demoNow().toISOString();
      setS((x) => ({ ...x, clockedIn: at }));
      await sb.from("visits").update({ out_at: at }).is("out_at", null);
      const { error } = await sb.from("visits").insert({ in_at: at });
      if (error) setS((x) => ({ ...x, clockedIn: null }));
    },
    async clockOut() {
      setS((x) => ({ ...x, clockedIn: null }));
      await sb.from("visits").update({ out_at: demoNow().toISOString() }).is("out_at", null);
    },
    async addFood(f) { // on screen at once; the saved row's id replaces the temporary one
      const at = demoNow().toISOString(), tmp = `tmp-${Date.now()}`;
      setS((x) => ({ ...x, food: [...x.food, { ...f, id: tmp, at }] }));
      const { data } = await sb.from("food_logs").insert({ ...f, created_at: at }).select().single();
      setS((x) => ({ ...x, food: data ? x.food.map((y) => (y.id === tmp ? { ...y, id: data.id } : y)) : x.food.filter((y) => y.id !== tmp) }));
    },
    async removeFood(id) {
      setS((x) => ({ ...x, food: x.food.filter((y) => y.id !== id) }));
      await sb.from("food_logs").delete().eq("id", id);
    },
    async addWeight(kg) { // on screen at once; rolled back if the save fails
      const at = demoNow().toISOString(), tmp = `tmp-${Date.now()}`;
      setS((x) => ({ ...x, weights: [...x.weights, { id: tmp, kg, at }] }));
      const { data, error } = await sb.from("weight_logs").insert({ kg, created_at: at }).select().single();
      setS((x) => ({ ...x, weights: data ? x.weights.map((y) => (y.id === tmp ? { ...y, id: data.id } : y)) : x.weights.filter((y) => y.id !== tmp) }));
      if (error) throw error;
    },
    async updateProfile(p) { // on screen at once; put back if the save fails
      const before = me;
      setMe({ ...me, ...p });
      const { data, error } = await sb.from("profiles").update(p).eq("id", me.id).select().single();
      if (error) { setMe(before); throw error; }
      setMe(data);
    },
    async finishWorkout(w, post, lifts, media) {
      const at = post.at ?? demoNow().toISOString();
      const kept = active, tmp = `tmp-${Date.now()}`;
      setMe({ ...me, ...lifts });
      setS((x) => ({
        ...x, sessions: [{ id: tmp, at, ...w }, ...x.sessions],
        posts: [{ id: tmp, by: me.name, faculty: me.faculty, at, title: post.title, note: post.note, exercises: post.exercises, volume: post.volume, prs: post.prs,
          duration: post.duration, visibility: post.visibility, media: media ? { url: URL.createObjectURL(media), type: media.type.startsWith("video") ? "video" : "image" } : null,
          likes: 0, liked: false, mine: true, uid: me.id, avatar: me.avatar_url, likers: [], comments: [] }, ...x.posts],
      }));
      setActiveRaw(null); // the saved copy in localStorage stays until the server confirms
      (async () => {
      let media_url = null, media_type = null;
      if (media) {
        // video or photo -> media/<uid>/<time>.<ext>; the post shows it first, swipe for the workout
        const path = `${me.id}/${Date.now()}.${media.name.split(".").pop()?.toLowerCase() || "mp4"}`;
        const up = await sb.storage.from("media").upload(path, media, { contentType: media.type });
        if (up.error) throw up.error;
        media_url = sb.storage.from("media").getPublicUrl(path).data.publicUrl;
        media_type = media.type.startsWith("video") ? "video" : "image";
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
        console.error("finish", e);
        setS((x) => ({ ...x, sessions: x.sessions.filter((y) => y.id !== tmp), posts: x.posts.filter((y) => y.id !== tmp) }));
        setActiveRaw(kept);
        alert("Couldn't save your workout. It's still here, so try Finish again when you're online.");
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
    async signOut() {
      try { localStorage.removeItem(ACTIVE); localStorage.removeItem(CACHE); } catch {}
      await sb.auth.signOut();
      location.href = "/" + location.search; // starts a fresh session, which opens the sign-in quest
    },
  };

  if (demo) { // the same actions, on screen only: the demo never writes to the database
    const id = () => `demo-${Date.now()}`, now = () => demoNow().toISOString();
    Object.assign(ctx, {
      async clockIn() { setS((x) => ({ ...x, clockedIn: now() })); },
      async clockOut() { setS((x) => ({ ...x, clockedIn: null })); },
      async addFood(f) { setS((x) => ({ ...x, food: [...x.food, { ...f, id: id(), at: now() }] })); },
      async removeFood(fid) { setS((x) => ({ ...x, food: x.food.filter((y) => y.id !== fid) })); },
      async addWeight(kg) { setS((x) => ({ ...x, weights: [...x.weights, { id: id(), kg, at: now() }] })); },
      async updateProfile(p) { setMe({ ...me, ...p }); },
      async finishWorkout(w, post, lifts, media) {
        const at = post.at ?? now(), wid = id();
        setMe({ ...me, ...lifts });
        setS((x) => ({
          ...x, sessions: [{ id: wid, at, ...w }, ...x.sessions],
          posts: [{ id: wid, by: me.name, faculty: me.faculty, at, title: post.title, note: post.note, exercises: post.exercises, volume: post.volume, prs: post.prs,
            duration: post.duration, visibility: post.visibility, media: media ? { url: URL.createObjectURL(media), type: media.type.startsWith("video") ? "video" : "image" } : null,
            likes: 0, liked: false, mine: true, uid: me.id, avatar: me.avatar_url, likers: [], comments: [] }, ...x.posts],
        }));
        setActiveRaw(null);
      },
      async like(pid, wasLiked) {
        const liked = wasLiked ?? s.posts.find((x) => x.id === pid)?.liked ?? false;
        setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === pid ? { ...q, liked: !liked, likes: q.likes + (liked ? -1 : 1) } : q)) }));
      },
      async comment(pid, text) { setS((x) => ({ ...x, posts: x.posts.map((q) => (q.id === pid ? { ...q, comments: [...q.comments, { by: me.name, text, uid: me.id }] } : q)) })); },
      async follow(uid2) { setS((x) => ({ ...x, following: [...new Set([...x.following, uid2])] })); },
      async unfollow(uid2) { setS((x) => ({ ...x, following: x.following.filter((y) => y !== uid2) })); },
      async setAvatar(file) { setMe({ ...me, avatar_url: URL.createObjectURL(file) }); },
      async saveRoutine(rt) { const row = { id: rt.id ?? id(), name: rt.name.trim() || "My routine", exercises: rt.exercises }; setS((x) => ({ ...x, routines: [row, ...x.routines.filter((y) => y.id !== row.id)] })); },
      async deleteRoutine(rid) { setS((x) => ({ ...x, routines: x.routines.filter((y) => y.id !== rid) })); },
      async signOut() { location.href = "/?demo=1"; }, // a fresh demo
    } satisfies Partial<Ctx>);
  }

  return <C.Provider value={ctx}>{children}</C.Provider>;
}

export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
