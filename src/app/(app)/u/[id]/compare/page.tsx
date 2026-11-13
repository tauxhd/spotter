"use client";
// You vs someone: strength for bodyweight (DOTS) with a crown on the winner, where each of you puts your training (radar),
// the big three and the last 30 days as head-to-head bars, and every lift you both do. `?lift=` jumps to one lift.
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Avatar from "@/components/Avatar";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import Icon, { type IconName } from "@/components/Icon";
import { Radar, sum, type Log } from "@/components/MuscleDistribution";
import { StatsSkeleton } from "@/components/Skeleton";
import { POST_SELECT, sb, toPost, useStore, type Profile, type Row } from "@/lib/store";
import { findExercise, lifters, type Exercise, type Post } from "@/lib/data";
import { baseOf, dots, estimated } from "@/lib/lifting";
import { bestLifts, liftStats, setsOf, sharedLifts } from "@/lib/progress";
import { toUnit, wTotal } from "@/lib/units";

const DAY = 864e5;
type Side = { p: Profile; posts: Post[] };

// sets per body area as a share of all sets, so a big and a small trainer can be compared by balance
function balance(posts: Post[], library: Exercise[], bw: number) {
  const logs: Log[] = posts.map((x) => ({ at: new Date(x.at).getTime(), exercises: x.exercises.map((e) => ({ ex: findExercise(library, e.id, e.name), sets: e.log ?? [] })) }));
  const area = sum(logs, 0, Infinity, bw).area;
  const total = Object.values(area).reduce((n, v) => n + v, 0) || 1;
  return Object.fromEntries(Object.entries(area).map(([k, v]) => [k, (v / total) * 100]));
}

// One head-to-head row: icon and label, both numbers, and a bar split by who's ahead (lime = you, sky = them)
function Versus({ icon, label, x, y, fmt = String, neutral }: { icon?: IconName; label: string; x: number; y: number; fmt?: (v: number) => string; neutral?: boolean }) {
  const share = x + y > 0 ? (x / (x + y)) * 100 : 50;
  return (
    <div className="py-2.5">
      <div className="flex items-center gap-2 text-sm tabular-nums">
        <span className={`w-24 font-bold ${!neutral && x > y ? "text-lime-600 dark:text-lime-400" : ""}`}>{fmt(x)}</span>
        <span className="muted flex flex-1 items-center justify-center gap-1.5 text-xs font-medium">{icon && <Icon name={icon} size={22} />}{label}</span>
        <span className={`w-24 text-right font-bold ${!neutral && y > x ? "text-sky-500 dark:text-sky-400" : ""}`}>{fmt(y)}</span>
      </div>
      {!neutral && (
        <div className="mt-1.5 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          <div className="rounded-l-full bg-lime-500 transition-all" style={{ width: `${share}%`, opacity: x >= y ? 1 : 0.45 }} />
          <div className="flex-1 rounded-r-full bg-sky-400 transition-all" style={{ opacity: y >= x ? 1 : 0.45 }} />
        </div>
      )}
    </div>
  );
}

function Person({ p, d, win, you }: { p: Profile; d: number; win: boolean; you?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
      <div className="relative pt-5">
        {win && <span className="absolute left-1/2 top-0 -translate-x-1/2 -rotate-6"><Icon name="crown" size={34} /></span>}
        <Avatar id={p.id} url={p.avatar_url} name={p.name} size={76} className={`ring-4 ${you ? "ring-lime-500" : "ring-sky-400"}`} />
      </div>
      <p className="max-w-full truncate font-semibold">{you ? "You" : p.name}</p>
      <p className="text-2xl font-bold tabular-nums">{d || "–"} <span className="muted text-xs font-medium">DOTS</span></p>
    </div>
  );
}

function LiftPerson({ p, v, win, you }: { p: Profile; v: string; win: boolean; you?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div className="relative pt-5">
        {win && <span className="absolute left-1/2 top-0 -translate-x-1/2 -rotate-6"><Icon name="crown" size={30} /></span>}
        <Avatar id={p.id} url={p.avatar_url} name={p.name} size={60} className={`ring-4 ${you ? "ring-lime-500" : "ring-sky-400"}`} />
      </div>
      <p className="max-w-full truncate text-sm font-semibold">{you ? "You" : p.name}</p>
      <p className="text-xl font-bold tabular-nums">{v}</p>
    </div>
  );
}

export default function Compare() {
  const { id } = useParams<{ id: string }>();
  const lift = useSearchParams().get("lift");
  const { s, me, u } = useStore();
  const router = useRouter();
  const demo = lifters.find((l) => l.id === id);
  const [them, setThem] = useState<Side | null | undefined>(undefined);
  const [mine, setMine] = useState<Post[] | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const posts = ({ data }: { data: Row[] | null }) => (data ?? []).map((r) => toPost(r, me.id));
    sb.from("posts").select(POST_SELECT).eq("user_id", me.id).order("created_at", { ascending: false }).limit(1000).then((r) => setMine(posts(r)));
    (async () => {
      const p = demo ? ({ ...demo, intake: null, avatar_url: null } as Profile) : ((await sb.from("profiles").select("*").eq("id", id).maybeSingle()).data as Profile | null);
      if (!p) return setThem(null);
      const base = sb.from("posts").select(POST_SELECT);
      setThem({ p, posts: posts(await (demo ? base.is("user_id", null).eq("by", demo.name) : base.eq("user_id", id)).order("created_at", { ascending: false }).limit(1000)) });
    })();
  }, [id, demo, me.id]);

  if (them === undefined || mine === null) return <StatsSkeleton />;
  if (them === null) return <EmptyState art="not-found" title="This profile doesn't exist" className="mt-16" />;

  if (lift) {
    const x = liftStats(mine, lift), y = liftStats(them.posts, lift);
    const first = them.p.name.split(" ")[0];
    const kgf = (v: number) => (v ? `${Math.round(toUnit(v, u))} ${u}` : "–");
    const when = (at: string | null) => (at ? new Date(at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" }) : "–");
    const verdict = !x.sets ? "You haven't logged this lift yet" : !y.sets ? `${first} hasn't logged this lift` : x.e1rm === y.e1rm ? "Dead even on this lift" : x.e1rm > y.e1rm ? "You're stronger on this lift" : `${first} is stronger on this lift`;
    return (
      <div>
        <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
          <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
          <h1 className="truncate text-center text-base font-semibold">{lift}</h1>
        </header>
        <section className="-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80">
          <div className="flex items-center justify-center gap-3"><ExerciseThumb ex={findExercise(s.library, undefined, lift)} size={64} /></div>
          <div className="mt-2 flex items-center">
            <LiftPerson p={me} v={kgf(x.e1rm)} win={x.e1rm > y.e1rm} you />
            <Icon name="vs" size={52} className="shrink-0" />
            <LiftPerson p={them.p} v={kgf(y.e1rm)} win={y.e1rm > x.e1rm} />
          </div>
          <p className="mt-3 flex items-center justify-center gap-2 font-semibold"><Icon name="flex" size={24} />{verdict}</p>
          <p className="muted mt-1 text-center text-xs">Estimated one-rep max from each person&apos;s best set (warm-ups don&apos;t count).</p>
        </section>
        <section className="-mx-4 px-4 py-3">
          <Versus icon="trophy" label="Est. 1RM" x={x.e1rm} y={y.e1rm} fmt={kgf} />
          <Versus icon="barbell" label="Heaviest" x={x.heaviest} y={y.heaviest} fmt={kgf} />
          <Versus icon="medal" label="Best set" x={x.best?.e1rm ?? 0} y={y.best?.e1rm ?? 0} fmt={(v) => { const b = v === (x.best?.e1rm ?? 0) ? x.best : y.best; return b ? `${kgf(b.kg)} × ${b.reps}` : "–"; }} />
          <Versus icon="target" label="Most reps" x={x.mostReps} y={y.mostReps} />
          <Versus icon="flame" label="Best set volume" x={x.bestVolume} y={y.bestVolume} fmt={kgf} />
          <Versus icon="tick-box" label="Sets logged" x={x.sets} y={y.sets} />
          <Versus icon="calendar" label="Sessions" x={x.sessions} y={y.sessions} />
          <div className="flex items-center gap-2 py-2.5 text-sm tabular-nums">
            <span className="w-24 font-bold">{when(x.last)}</span>
            <span className="muted flex flex-1 items-center justify-center gap-1.5 text-xs font-medium"><Icon name="stopwatch" size={22} />Last done</span>
            <span className="w-24 text-right font-bold">{when(y.last)}</span>
          </div>
        </section>
      </div>
    );
  }

  const side = (p: Profile, posts: Post[]) => {
    const sessions = posts.map((x) => ({ exercises: x.exercises.map((e) => ({ name: findExercise(s.library, e.id, e.name)?.name ?? e.name, sets: (e.log ?? []).map((l) => ({ ...l, done: true })) })) }));
    const est = estimated(baseOf(p), sessions);
    const big = { squat: est["Squat (Barbell)"] ?? 0, bench: est["Bench Press (Barbell)"] ?? 0, deadlift: est["Deadlift (Barbell)"] ?? 0 };
    const total = big.squat + big.bench + big.deadlift;
    const recent = posts.filter((x) => now - new Date(x.at).getTime() < 30 * DAY);
    return {
      big, total, dots: total && Number(p.bw) ? Math.round(dots(total, Number(p.bw), p.sex)) : 0, best: bestLifts(posts), balance: balance(posts, s.library, Number(p.bw)),
      month: { workouts: recent.length, volume: recent.reduce((n, x) => n + x.volume, 0), sets: recent.reduce((n, x) => n + setsOf(x), 0) },
      prs: posts.reduce((n, x) => n + x.prs.length, 0),
    };
  };
  const a = side(me, mine), b = side(them.p, them.posts);
  const shared = sharedLifts(a.best, b.best, 30);
  const first = them.p.name.split(" ")[0];
  const kg = (v: number) => (v ? `${Math.round(toUnit(v, u))} ${u}` : "–");
  const set = (x?: { kg: number; reps: number }) => (x ? `${kg(x.kg)} × ${x.reps}` : "–");
  const verdict = !a.dots || !b.dots ? "Log squat, bench and deadlift to compare strength"
    : a.dots === b.dots ? "Dead even, pound for pound" : a.dots > b.dots ? "You're stronger for your bodyweight" : `${first} is stronger for their bodyweight`;
  const section = "-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80";

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">You vs {first}</h1>
      </header>

      <section className={section}>
        <div className="flex items-center">
          <Person p={me} d={a.dots} win={a.dots > b.dots} you />
          <Icon name="vs" size={56} className="shrink-0" />
          <Person p={them.p} d={b.dots} win={b.dots > a.dots} />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center font-semibold"><Icon name="flex" size={26} />{verdict}</p>
        <p className="muted mt-1 text-center text-xs">DOTS scores your squat, bench and deadlift for your bodyweight, so any two lifters can be compared.</p>
      </section>


      <section className={section}>
        <h2 className="font-semibold">Where you train <span className="muted text-xs font-normal">share of sets</span></h2>
        <Radar cur={a.balance} prev={b.balance} vs className="mx-auto mt-1 w-full max-w-xs" />
        <p className="flex justify-center gap-4 text-xs font-medium"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime-500" />You</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />{first}</span></p>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Big three <span className="muted text-xs font-normal">estimated 1RM</span></h2>
        <Versus icon="squat" label="Squat" x={a.big.squat} y={b.big.squat} fmt={kg} />
        <Versus icon="bench" label="Bench" x={a.big.bench} y={b.big.bench} fmt={kg} />
        <Versus icon="deadlift" label="Deadlift" x={a.big.deadlift} y={b.big.deadlift} fmt={kg} />
        <Versus icon="trophy" label="Total" x={a.total} y={b.total} fmt={kg} />
        <Versus icon="scale" label="Bodyweight" x={Number(me.bw)} y={Number(them.p.bw)} fmt={kg} neutral />
      </section>

      <section className={section}>
        <h2 className="font-semibold">Last 30 days</h2>
        <Versus icon="calendar" label="Workouts" x={a.month.workouts} y={b.month.workouts} />
        <Versus icon="barbell" label="Volume" x={a.month.volume} y={b.month.volume} fmt={(v) => wTotal(v, u)} />
        <Versus icon="target" label="Sets" x={a.month.sets} y={b.month.sets} />
        <Versus icon="medal" label="PRs, all time" x={a.prs} y={b.prs} />
      </section>

      <section className="-mx-4 px-4 py-4">
        <h2 className="font-semibold">Lifts you both do <span className="muted text-xs font-normal">best set</span></h2>
        {shared.length === 0 && <p className="muted py-4 text-sm">No exercises in common yet.</p>}
        {shared.map(({ name, a: x, b: y }) => (
          <div key={name} className="pt-3">
            <div className="flex items-center gap-2">
              <ExerciseThumb ex={findExercise(s.library, undefined, name)} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
            </div>
            <Versus label={x.e1rm > y.e1rm ? "◀ you" : y.e1rm > x.e1rm ? `${first} ▶` : "tied"} x={x.e1rm} y={y.e1rm} fmt={(v) => set(v === x.e1rm ? x : y)} />
          </div>
        ))}
      </section>
    </div>
  );
}
