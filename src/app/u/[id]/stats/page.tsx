"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Icon, { type IconName } from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";
import EmptyState from "@/components/EmptyState";
import { StatsSkeleton } from "@/components/Skeleton";
import { toUnit, w, wNum, wTotal } from "@/lib/units";
import { POST_SELECT, sb, toPost, useStore, type Profile } from "@/lib/store";
import { bodyArea, findExercise, lifters, type Post } from "@/lib/data";
import { baseOf, bests, dots, liftsOf } from "@/lib/lifting";

const WEEKS = 8;
const DAY = 864e5;
const weekStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); }; // Monday
const hrs = (min: number) => (min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`);

// Gym stats for a student: consistency, volume, muscle balance, favourite lifts, bests, and (for yourself) gym visits.
export default function GymStats() {
  const { id } = useParams<{ id: string }>();
  const { s, me, u } = useStore();
  const router = useRouter();
  const own = id === me.id;
  const demo = lifters.find((l) => l.id === id);
  const [p, setP] = useState<Profile | null | undefined>(own ? me : undefined);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [visits, setVisits] = useState<{ in_at: string; out_at: string | null }[]>([]);

  useEffect(() => {
    if (demo) setP({ ...demo, intake: null, avatar_url: null });
    else if (!own) sb.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setP(data));
    const base = sb.from("posts").select(POST_SELECT);
    (demo ? base.is("user_id", null).eq("by", demo.name) : base.eq("user_id", id)).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setPosts((data ?? []).map((r) => toPost(r, me.id))));
    if (own) sb.from("visits").select("in_at, out_at").order("in_at", { ascending: false }).limit(500).then(({ data }) => setVisits(data ?? []));
  }, [id, own, demo, me.id]);

  if (p === undefined || posts === null) return <StatsSkeleton />;
  if (p === null) return <EmptyState art="not-found" title="This profile doesn't exist" className="mt-16" />;

  // ---- numbers ----
  const now = new Date();
  const thisWeek = weekStart(now);
  const setsOf = (x: Post) => x.exercises.reduce((n, e) => n + (e.log?.length || e.sets || 1), 0);
  const total = { workouts: posts.length, minutes: posts.reduce((n, x) => n + (x.duration ?? 0), 0), volume: posts.reduce((n, x) => n + x.volume, 0), sets: posts.reduce((n, x) => n + setsOf(x), 0), prs: posts.reduce((n, x) => n + x.prs.length, 0) };
  const week = posts.filter((x) => new Date(x.at).getTime() >= thisWeek);

  const perWeek = Array.from({ length: WEEKS }, (_, i) => {
    const start = thisWeek - (WEEKS - 1 - i) * 7 * DAY;
    return { start, n: posts.filter((x) => { const t = new Date(x.at).getTime(); return t >= start && t < start + 7 * DAY; }).length };
  });
  const maxWeek = Math.max(1, ...perWeek.map((w) => w.n));
  let streak = 0; // consecutive weeks with a workout, counting back from this week (or last week if this one is still empty)
  for (let i = WEEKS - 1 - (perWeek[WEEKS - 1].n ? 0 : 1); i >= 0 && perWeek[i].n > 0; i--) streak++;

  const areaSets: Record<string, number> = {};
  const exSets: Record<string, number> = {};
  for (const x of posts) for (const e of x.exercises) {
    const ex = findExercise(s.library, e.id, e.name);
    const n = e.log?.length || e.sets || 1;
    areaSets[bodyArea(ex?.muscle)] = (areaSets[bodyArea(ex?.muscle)] ?? 0) + n;
    const name = ex?.name ?? e.name;
    exSets[name] = (exSets[name] ?? 0) + n;
  }
  const split = Object.entries(areaSets).sort((a, b) => b[1] - a[1]);
  const splitTotal = split.reduce((n, [, v]) => n + v, 0) || 1;
  const favourites = Object.entries(exSets).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const lifts = own ? liftsOf(bests(baseOf(me), s.sessions)) : { squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) };
  const sbd = lifts.squat + lifts.bench + lifts.deadlift;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthVisits = visits.filter((v) => new Date(v.in_at).getTime() >= monthStart);
  const visitMin = (v: { in_at: string; out_at: string | null }) => Math.min(240, Math.max(0, Math.round(((v.out_at ? new Date(v.out_at) : now).getTime() - new Date(v.in_at).getTime()) / 60000)));
  const avgVisit = monthVisits.length ? Math.round(monthVisits.reduce((n, v) => n + visitMin(v), 0) / monthVisits.length) : 0;
  const hours: Record<number, number> = {};
  visits.forEach((v) => { const h = new Date(v.in_at).getHours(); hours[h] = (hours[h] ?? 0) + 1; });
  const favHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0];

  const Big = ({ icon, value, label }: { icon: IconName; value: string | number; label: string }) => (
    <div className="flex items-center gap-3 py-2.5">
      <Icon name={icon} size={40} />
      <div><p className="text-xl font-bold leading-tight tabular-nums">{value}</p><p className="muted text-xs">{label}</p></div>
    </div>
  );
  const section = "-mx-4 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800/80";

  return (
    <div>
      <header className="-mx-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-2">
        <button onClick={() => router.back()} aria-label="Back" className="grid h-9 w-9 place-items-center"><ArrowLeft size={20} /></button>
        <h1 className="truncate text-center text-base font-semibold">{own ? "Your gym stats" : `${p.name}'s stats`}</h1>
        <span />
      </header>

      <section className={section}>
        <p className="muted text-xs font-semibold uppercase tracking-wider">This week</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{week.length} <span className="text-base font-medium text-zinc-500">workout{week.length === 1 ? "" : "s"}</span></p>
        <p className="muted text-sm tabular-nums">{wTotal(week.reduce((n, x) => n + x.volume, 0), u)} · {hrs(week.reduce((n, x) => n + (x.duration ?? 0), 0))} trained</p>
        <div className="mt-4 flex h-24 items-end gap-2" aria-label={`Workouts per week, last ${WEEKS} weeks`}>
          {perWeek.map((w, i) => (
            <div key={w.start} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tabular-nums">{w.n || ""}</span>
              <div className={`w-full rounded-md ${i === WEEKS - 1 ? "bg-lime-500" : "bg-zinc-300 dark:bg-zinc-700"}`} style={{ height: `${Math.max(4, (w.n / maxWeek) * 64)}px` }} />
              <span className="muted text-[9px] tabular-nums">{new Date(w.start).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${section} grid grid-cols-2 gap-x-4`}>
        <Big icon="flame" value={`${streak} wk`} label="Weekly streak" />
        <Big icon="calendar" value={total.workouts} label="Workouts" />
        <Big icon="stopwatch" value={hrs(total.minutes)} label="Time trained" />
        <Big icon="tick-box" value={total.sets} label="Sets" />
        <Big icon="medal" value={total.prs} label="Personal records" />
        <Big icon="barbell" value={u === "lb" ? `${Math.round(toUnit(total.volume, u) / 1000)}k lb` : `${(total.volume / 1000).toFixed(1)} t`} label="Total volume" />
      </section>

      {sbd > 0 && (
        <section className={section}>
          <h2 className="mb-3 font-semibold">Best lifts</h2>
          <div className="grid grid-cols-4 text-center">
            {([["squat", "Squat", lifts.squat], ["bench", "Bench", lifts.bench], ["deadlift", "Deadlift", lifts.deadlift], ["ranks", "Total", sbd]] as const).map(([icon, k, v]) => (
              <div key={k} className="flex flex-col items-center">
                <Icon name={icon} size={44} />
                <p className="mt-1.5 text-lg font-bold leading-tight tabular-nums">{wNum(v, u)}</p>
                <p className="muted text-xs">{k} {u}</p>
              </div>
            ))}
          </div>
          <p className="muted mt-4 flex items-center justify-center gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800/60">
            <Icon name="p4p" size={24} /><span className="font-semibold text-lime-600 dark:text-lime-400">{dots(sbd, Number(p.bw), p.sex).toFixed(1)} DOTS</span> at {w(Number(p.bw), u)} bodyweight
          </p>
        </section>
      )}

      {split.length > 0 && (
        <section className={section}>
          <h2 className="mb-3 font-semibold">Muscle split</h2>
          <div className="space-y-2.5">
            {split.map(([k, n]) => {
              const pct = Math.round((n / splitTotal) * 100);
              return (
                <div key={k} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span>{k}</span>
                  <div className="h-2.5 overflow-hidden rounded-sm bg-zinc-200 dark:bg-zinc-800"><div className="h-full rounded-sm bg-lime-500" style={{ width: `${pct}%` }} /></div>
                  <span className="muted text-right tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {favourites.length > 0 && (
        <section className={section}>
          <h2 className="mb-2 font-semibold">Most trained</h2>
          <ul>
            {favourites.map(([name, n]) => (
              <li key={name} className="flex items-center gap-3 py-2">
                <ExerciseThumb ex={findExercise(s.library, undefined, name)} size={40} />
                <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                <span className="muted text-sm tabular-nums">{n} sets</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {own && (
        <section className={section}>
          <h2 className="mb-1 font-semibold">Gym visits</h2>
          <p className="muted mb-3 text-xs">From your clock-ins at the SweatZone door. Only you can see this.</p>
          <div className="grid grid-cols-3 text-center">
            {([["qr", monthVisits.length, "This month"], ["stopwatch", avgVisit ? hrs(avgVisit) : "–", "Avg visit"], ["bell", favHour !== undefined ? `${favHour.padStart(2, "0")}:00` : "–", "Usual time"]] as const).map(([icon, v, k]) => (
              <div key={k} className="flex flex-col items-center">
                <Icon name={icon} size={40} />
                <p className="mt-1.5 text-lg font-bold leading-tight tabular-nums">{v}</p>
                <p className="muted text-xs">{k}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 && <EmptyState art="stats" title="No stats yet" text={own ? "Post a workout and your stats start here." : "No workouts to show yet."} />}
    </div>
  );
}
