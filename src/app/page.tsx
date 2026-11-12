"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, LogIn, LogOut, QrCode } from "lucide-react";
import Icon from "@/components/Icon";
import { Bone } from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import ProfileLink from "@/components/ProfileLink";
import { useClasses, useNow } from "@/lib/useNow";
import { sb, useStore } from "@/lib/store";
import { classes as sample, crowdAt, crowdByHour, fmt, gym, minsOf, toMin } from "@/lib/data";
import { gaps } from "@/lib/lifting";
import InfoTip from "@/components/InfoTip";
import MeButton from "@/components/MeButton";
import { help } from "@/lib/help";

const level = (p: number) =>
  p >= 80 ? { label: "Packed", bar: "bg-red-500", text: "text-red-600 dark:text-red-400" }
  : p >= 50 ? { label: "Busy", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
  : { label: "Quiet", bar: "bg-lime-500", text: "text-lime-600 dark:text-lime-400" };

export default function GymHome() {
  const now = useNow(5000);
  const { s, me, clockIn: doClockIn, clockOut } = useStore();
  const [scanning, setScanning] = useState(false);
  const [inside, setInside] = useState(0); // real open clock-ins, from Supabase
  const [friends, setFriends] = useState<{ id: string; name: string; avatar_url: string | null; in_at: string }[]>([]); // mutual follows clocked in
  useEffect(() => {
    const load = () => {
      sb.rpc("gym_count").then(({ data }) => typeof data === "number" && setInside(data));
      sb.rpc("friends_in_gym").then(({ data }) => data && setFriends(data));
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [s.clockedIn]);
  const tt = useClasses(me.intake, now);
  if (!now) return null;
  const classes = tt === null ? sample : tt?.classes ?? []; // no intake → sample timetable

  const m = minsOf(now);
  // forgotten clock-outs: a clock-in from an earlier day, or after closing, counts as clocked out at closing
  const since = s.clockedIn ? new Date(s.clockedIn) : null;
  const clockedIn = since && since <= now && since.toDateString() === now.toDateString() && m >= toMin(gym.open) && m < toMin(gym.close) ? s.clockedIn : null;
  const open = m >= toMin(gym.open) && m < toMin(gym.close);
  // ponytail: live count = simulated regulars (typical curve) + real Spotter clock-ins. Drop the curve once enough students use the app.
  const people = open ? Math.round((crowdAt(m) / 100) * gym.capacity) + inside : 0;
  const pct = Math.min(100, Math.round((people / gym.capacity) * 100));
  const lv = level(pct);

  // best 60-min slot today: free gaps between classes (not the last 30 min before closing),
  // earliest window within 5 points of the quietest one
  const busy = classes.map((c) => ({ start: toMin(c.start), end: toMin(c.end) }));
  const slots: { start: number; crowd: number }[] = [];
  for (const g of gaps(busy, toMin(gym.open), toMin(gym.close) - 30, m))
    for (let t = g.start; t + 60 <= g.end; t += 15)
      slots.push({ start: t, crowd: Math.round((crowdAt(t) + crowdAt(t + 30) + crowdAt(t + 60)) / 3) });
  const quietest = Math.min(...slots.map((x) => x.crowd));
  const best = slots.find((x) => x.crowd <= quietest + 5) ?? null;
  const before = best && classes.filter((c) => toMin(c.end) <= best!.start).at(-1);
  const after = best && classes.find((c) => toMin(c.start) >= best!.start + 60);

  const mins = clockedIn ? Math.max(0, Math.round((now.getTime() - new Date(clockedIn).getTime()) / 60000)) : 0;

  function clockIn() {
    setScanning(true);
    // ponytail: simulated scan delay. Real flow: door QR encodes /checkin, phone camera opens it, this inserts the visit row.
    setTimeout(() => doClockIn().finally(() => setScanning(false)), 1200);
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="muted text-sm">Hey {me.name} 👋</p>
          <h1 className="h-title">{gym.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-sm px-2.5 py-1 text-xs font-semibold ${open ? "bg-lime-100 text-lime-700 dark:bg-lime-400/10 dark:text-lime-400" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
            {open ? `Open until ${gym.close}` : `Opens ${gym.open}`}
          </span>
          <MeButton size={38} />
        </div>
      </header>

      {/* Clock in / out */}
      <section className={`rounded-2xl p-5 ${clockedIn ? "bg-lime-400 text-zinc-950" : "bg-zinc-900 text-white dark:bg-zinc-800"}`}>
        {clockedIn ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Clocked in</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{Math.floor(mins / 60)}h {String(mins % 60).padStart(2, "0")}m</p>
            <p className="text-sm opacity-80">since {new Date(clockedIn).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" })} · {me.name}</p>
            <div className="mt-4 flex gap-2">
              <Link href={"/train" + location.search} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 font-semibold text-white"><Dumbbell size={18} />{s.active ? "Resume workout" : "Start workout"}</Link>
              <button onClick={clockOut} className="flex items-center gap-2 rounded-xl bg-white/50 px-4 font-semibold"><LogOut size={18} />Out</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Skip the ID check at the counter</p>
                <p className="mt-1 text-lg font-semibold leading-snug">Scan the QR code at the gym door to clock in</p>
              </div>
              <Icon name="qr" size={64} className={scanning ? "animate-pulse" : ""} />
            </div>
            <button onClick={clockIn} disabled={!open || scanning} className="btn mt-4 flex w-full items-center justify-center gap-2">
              {scanning ? <><QrCode size={18} className="animate-pulse" />Scanning…</> : <><LogIn size={18} />{open ? "Scan to clock in" : "Gym is closed"}</>}
            </button>
          </>
        )}
      </section>

      {/* Live crowd */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><Icon name="crowd" size={30} />Live crowd<InfoTip text={help.crowd} /></h2>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-lime-600 dark:text-lime-400"><span className="h-2 w-2 animate-pulse rounded-full bg-lime-500" />LIVE</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{people}</span>
          <span className="muted text-sm">/ {gym.capacity} people</span>
          <span className={`ml-auto text-sm font-semibold ${lv.text}`}>{open ? lv.label : "Closed"}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
          <div className={`anim-grow h-full rounded-sm transition-all duration-700 ease-[var(--spring)] ${lv.bar}`} style={{ width: `${pct}%` }} />
        </div>
        {friends.length > 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-lime-50 p-2.5 dark:bg-lime-400/10">
            <div className="flex -space-x-2">
              {friends.slice(0, 4).map((f) => (
                <ProfileLink key={f.id} id={f.id} name={f.name}><Avatar id={f.id} url={f.avatar_url} name={f.name} size={32} className="ring-2 ring-lime-50 dark:ring-zinc-900" /></ProfileLink>
              ))}
            </div>
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <span className="font-semibold">{friends.slice(0, 2).map((f, i) => <span key={f.id}>{i > 0 && (friends.length === 2 ? " & " : ", ")}<ProfileLink id={f.id} name={f.name}>{f.name}</ProfileLink></span>)}{friends.length > 2 && ` +${friends.length - 2}`}</span>
              <span className="muted"> {friends.length > 1 ? "are" : "is"} here · since {new Date(friends[0].in_at).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" })}</span>
            </p>
          </div>
        ) : (
          <p className="muted mt-3 text-xs">
            {s.following.some((id) => s.followers.includes(id)) ? "None of your friends are in right now." : "Follow people on the Feed or Ranks. Once they follow back, you'll see here when they're training."}
          </p>
        )}
        <div className={`${friends.length && open ? "mt-10" : "mt-4"} flex h-16 items-end gap-1`} aria-label="Typical crowd by hour">
          {Object.entries(crowdByHour).map(([h, p]) => {
            const isNow = Number(h) === Math.floor(m / 60);
            return (
              <div key={h} className="relative flex flex-1 flex-col items-center gap-1">
                {isNow && open && friends.length > 0 && (
                  // friends who are in right now sit on top of the current hour's bar
                  <div className="absolute left-1/2 z-10 flex -translate-x-1/2 -space-x-2" style={{ bottom: `${Math.max(p, 4) * 0.5 + 18}px` }} aria-label={`Friends here now: ${friends.map((f) => f.name).join(", ")}`}>
                    {friends.slice(0, 3).map((f) => <ProfileLink key={f.id} id={f.id} name={f.name}><Avatar id={f.id} url={f.avatar_url} name={f.name} size={26} className="ring-2 ring-lime-400" /></ProfileLink>)}
                    {friends.length > 3 && <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-lime-400 text-[10px] font-bold text-zinc-950 ring-2 ring-lime-400">+{friends.length - 3}</span>}
                  </div>
                )}
                <div className={`w-full rounded-sm ${isNow ? level(p).bar : "bg-zinc-200 dark:bg-zinc-700"}`} style={{ height: `${Math.max(p, 4) * 0.5}px` }} title={`${h}:00 · ${p}%`} />
                <span className={`text-[9px] tabular-nums ${isNow ? "font-bold" : "muted"}`}>{Number(h) % 3 === 0 ? h : ""}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Best slot from timetable */}
      <section className="card">
        <div className="flex items-center gap-2">
          <Icon name="calendar" size={32} />
          <h2 className="font-semibold">Best time to train today</h2>
        </div>
        {tt === undefined ? (
          <div role="status" aria-label="Loading your timetable" className="mt-3 space-y-2"><Bone className="h-7 w-36" /><Bone className="h-3.5 w-52" /></div>
        ) : best ? (
          <>
            <p className="mt-3 text-2xl font-bold tabular-nums">{fmt(best.start)}–{fmt(best.start + 60)}</p>
            <p className="muted text-sm">
              ~{best.crowd}% full{before ? ` · after ${before.name}` : ""}{after ? ` · before ${after.name} at ${after.start}` : ""}
            </p>
          </>
        ) : (
          <p className="muted mt-2 text-sm">No free hour left today. Rest day? 😴</p>
        )}
        {tt !== undefined && classes.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
            {classes.map((c) => (
              <li key={c.start + c.name} className="flex gap-2">
                <span className="muted w-20 shrink-0 tabular-nums">{c.start}–{c.end}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="muted shrink-0">{c.room}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted mt-2 text-xs">
          {tt === null ? <>Sample timetable · <Link href={"/me" + location.search} className="font-semibold text-lime-600 underline dark:text-lime-400">add your intake code</Link></>
            : tt === undefined ? null
            : !tt.known ? <>Intake {me.intake} not found in the APU timetable · <Link href={"/me" + location.search} className="font-semibold underline">fix it</Link></>
            : `${me.intake} · ${classes.length ? `${classes.length} class${classes.length > 1 ? "es" : ""} today` : "no classes today"} · from the APU timetable`}
        </p>
      </section>

      <Link href={"/map" + location.search} className="card flex items-center gap-3 transition active:scale-[0.98]">
        <Icon name="map" size={44} />
        <div className="flex-1">
          <p className="font-semibold">Gym map</p>
          <p className="muted text-sm">Find any machine or rack</p>
        </div>
        <ChevronRight className="muted" size={18} />
      </Link>
    </div>
  );
}
