"use client";
// You vs someone: big three, strength for bodyweight (DOTS), training in the last 30 days, and every lift you both do.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import Avatar from "@/components/Avatar";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import { StatsSkeleton } from "@/components/Skeleton";
import { POST_SELECT, sb, toPost, useStore, type Profile, type Row } from "@/lib/store";
import { findExercise, lifters, type Post } from "@/lib/data";
import { baseOf, dots, estimated } from "@/lib/lifting";
import { bestLifts, setsOf, sharedLifts } from "@/lib/progress";
import { toUnit, wTotal } from "@/lib/units";

const DAY = 864e5;
type Side = { p: Profile; posts: Post[] };

export default function Compare() {
  const { id } = useParams<{ id: string }>();
  const { s, me, u } = useStore();
  const router = useRouter();
  const demo = lifters.find((l) => l.id === id);
  const [them, setThem] = useState<Side | null | undefined>(undefined);
  const [mine, setMine] = useState<Post[] | null>(null);

  useEffect(() => {
    const posts = ({ data }: { data: Row[] | null }) => (data ?? []).map((r) => toPost(r, me.id));
    sb.from("posts").select(POST_SELECT).eq("user_id", me.id).order("created_at", { ascending: false }).limit(1000).then((r) => setMine(posts(r)));
    (async () => {
      const p = demo ? { ...demo, intake: null, avatar_url: null } as Profile : (await sb.from("profiles").select("*").eq("id", id).maybeSingle()).data as Profile | null;
      if (!p) return setThem(null);
      const base = sb.from("posts").select(POST_SELECT);
      setThem({ p, posts: posts(await (demo ? base.is("user_id", null).eq("by", demo.name) : base.eq("user_id", id)).order("created_at", { ascending: false }).limit(1000)) });
    })();
  }, [id, demo, me.id]);

  if (them === undefined || mine === null) return <StatsSkeleton />;
  if (them === null) return <EmptyState art="not-found" title="This profile doesn't exist" className="mt-16" />;

  const side = (p: Profile, posts: Post[]) => {
    const sessions = posts.map((x) => ({ exercises: x.exercises.map((e) => ({ name: findExercise(s.library, e.id, e.name)?.name ?? e.name, sets: (e.log ?? []).map((l) => ({ ...l, done: true })) })) }));
    const est = estimated(baseOf(p), sessions);
    const big = { squat: est["Squat (Barbell)"] ?? 0, bench: est["Bench Press (Barbell)"] ?? 0, deadlift: est["Deadlift (Barbell)"] ?? 0 };
    const total = big.squat + big.bench + big.deadlift;
    const recent = posts.filter((x) => Date.now() - new Date(x.at).getTime() < 30 * DAY);
    return {
      big, total, dots: total && Number(p.bw) ? Math.round(dots(total, Number(p.bw), p.sex)) : 0, best: bestLifts(posts),
      month: { workouts: recent.length, volume: recent.reduce((n, x) => n + x.volume, 0), sets: recent.reduce((n, x) => n + setsOf(x), 0) },
      prs: posts.reduce((n, x) => n + x.prs.length, 0),
    };
  };
  const a = side(me, mine), b = side(them.p, them.posts);
  const shared = sharedLifts(a.best, b.best);
  const first = them.p.name.split(" ")[0];
  const kg = (v: number) => (v ? `${Math.round(toUnit(v, u))} ${u}` : "–");
  const verdict = !a.dots || !b.dots ? "Log squat, bench and deadlift to compare strength"
    : a.dots === b.dots ? "Dead even, pound for pound" : a.dots > b.dots ? "You're stronger for your bodyweight" : `${first} is stronger for their bodyweight`;

  // one row: label in the middle, the higher number in lime (not for bodyweight)
  const Row = ({ label, x, y, fmt = String, neutral }: { label: string; x: number; y: number; fmt?: (v: number) => string; neutral?: boolean }) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2.5 tabular-nums">
      <span className={`text-right font-semibold ${x > y && !neutral ? "text-lime-600 dark:text-lime-400" : ""}`}>{fmt(x)}</span>
      <span className="muted w-24 text-center text-xs">{label}</span>
      <span className={`font-semibold ${y > x && !neutral ? "text-lime-600 dark:text-lime-400" : ""}`}>{fmt(y)}</span>
    </div>
  );
  const Person = ({ p, d, win }: { p: Profile; d: number; win: boolean }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar id={p.id} url={p.avatar_url} name={p.name} size={72} />
        {win && <Crown size={22} className="absolute -top-3 left-1/2 -translate-x-1/2 fill-lime-400 text-lime-500" aria-label="Stronger" />}
      </div>
      <p className="max-w-full truncate font-semibold">{p.id === me.id ? "You" : p.name}</p>
      <p className="text-2xl font-bold tabular-nums">{d || "–"} <span className="muted text-xs font-medium">DOTS</span></p>
    </div>
  );

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">You vs {first}</h1>
      </header>

      <section className="-mx-4 border-b border-zinc-200 px-4 py-5 dark:border-zinc-800/80">
        <div className="grid grid-cols-2 gap-4">
          <Person p={me} d={a.dots} win={a.dots > b.dots} />
          <Person p={them.p} d={b.dots} win={b.dots > a.dots} />
        </div>
        <p className="mt-4 text-center font-semibold">{verdict}</p>
        <p className="muted mt-1 text-center text-xs">DOTS scores your squat, bench and deadlift for your bodyweight, so any two lifters can be compared.</p>
      </section>

      <section className="-mx-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800/80">
        <h2 className="pb-1 font-semibold">Big three <span className="muted text-xs font-normal">estimated 1RM</span></h2>
        <Row label="Squat" x={a.big.squat} y={b.big.squat} fmt={kg} />
        <Row label="Bench" x={a.big.bench} y={b.big.bench} fmt={kg} />
        <Row label="Deadlift" x={a.big.deadlift} y={b.big.deadlift} fmt={kg} />
        <Row label="Total" x={a.total} y={b.total} fmt={kg} />
        <Row label="Bodyweight" x={Number(me.bw)} y={Number(them.p.bw)} fmt={kg} neutral />
      </section>

      <section className="-mx-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800/80">
        <h2 className="pb-1 font-semibold">Last 30 days</h2>
        <Row label="Workouts" x={a.month.workouts} y={b.month.workouts} />
        <Row label="Volume" x={a.month.volume} y={b.month.volume} fmt={(v) => wTotal(v, u)} />
        <Row label="Sets" x={a.month.sets} y={b.month.sets} />
        <Row label="PRs (all time)" x={a.prs} y={b.prs} />
      </section>

      <section className="-mx-4 px-4 py-3">
        <h2 className="pb-1 font-semibold">Lifts you both do <span className="muted text-xs font-normal">best set</span></h2>
        {shared.length === 0 && <p className="muted py-4 text-sm">No exercises in common yet.</p>}
        {shared.map(({ name, a: x, b: y }) => (
          <div key={name} className="py-2">
            <div className="flex items-center gap-2">
              <ExerciseThumb ex={findExercise(s.library, undefined, name)} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 pt-1 text-sm tabular-nums">
              <span className={`text-right ${x.e1rm > y.e1rm ? "font-bold text-lime-600 dark:text-lime-400" : ""}`}>{kg(x.kg)} × {x.reps}</span>
              <span className="muted w-24 text-center text-xs">{x.e1rm > y.e1rm ? "◀ stronger" : y.e1rm > x.e1rm ? "stronger ▶" : "tied"}</span>
              <span className={y.e1rm > x.e1rm ? "font-bold text-lime-600 dark:text-lime-400" : ""}>{kg(y.kg)} × {y.reps}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
