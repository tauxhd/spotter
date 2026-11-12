"use client";
import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import { ChevronDown } from "lucide-react";
import { fromUnit, w } from "@/lib/units";
import FollowButton from "@/components/FollowButton";
import ProfileLink from "@/components/ProfileLink";
import { sb, useStore, type Profile } from "@/lib/store";
import { eventGroups, events, gymLifts, lifters, mockResults, weightClasses, type Sex } from "@/lib/data";
import { baseOf, heaviest, dots, fmtResult, liftsOf, parseResult, weightClass } from "@/lib/lifting";
import InfoTip from "@/components/InfoTip";
import MeButton from "@/components/MeButton";
import { ranksHelp } from "@/lib/help";

type Standard = "open" | "p4p" | "class";
const standards: { id: Standard; label: string; icon: IconName }[] = [
  { id: "open", label: "Open", icon: "medal" },
  { id: "p4p", label: "Pound for pound", icon: "p4p" },
  { id: "class", label: "Weight class", icon: "scale" },
];
const placeholder = { kg: "kg", reps: "reps", cm: "cm", sec: "seconds, e.g. 12.8", time: "m:ss, e.g. 9:45" };

function Stat({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return <span className="flex items-center gap-1 rounded-sm bg-zinc-100 py-0.5 pl-1 pr-2 dark:bg-zinc-800/80"><Icon name={icon} size={14} />{children}</span>;
}

export default function Ranks() {
  const { s, me, u, demo: isDemo } = useStore();
  const [others, setOthers] = useState<Omit<Profile, "intake">[]>([]);
  const [group, setGroup] = useState<string>("Powerlifting");
  const [eventId, setEventId] = useState("total");
  const [std, setStd] = useState<Standard>("p4p");
  const [sex, setSex] = useState<"all" | Sex>("all");
  const [who, setWho] = useState<"all" | "faculty" | "following" | "followers" | "friends">("all");
  const [cls, setCls] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, number>>({}); // user_id -> value, for the selected non-gym event
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const ev = events.find((e) => e.id === eventId)!;
  const gym = gymLifts.includes(ev.id);
  const standard: Standard = std === "p4p" && !ev.p4p ? "open" : std; // p4p only makes sense for loaded lifts
  const classSex: Sex = sex === "all" ? me.sex : sex;
  const limits = weightClasses[classSex];
  const myClass = weightClass(me.bw, limits);
  const activeClass = cls && (cls.endsWith("+") || limits.includes(Number(cls.slice(1)))) ? cls : myClass;

  useEffect(() => {
    // ponytail: whole table client-side; move ranking into a SQL view when there are thousands of students
    sb.from("profiles").select("id, name, faculty, sex, bw, squat, bench, deadlift, avatar_url").neq("id", me.id)
      .then(({ data }) => data && setOthers(data));
  }, [me.id]);

  useEffect(() => {
    if (gym) return;
    sb.from("results").select("user_id, value").eq("event", ev.id)
      .then(({ data }) => setResults(Object.fromEntries((data ?? []).map((r) => [r.user_id, Number(r.value)]))));
  }, [ev.id, gym]);

  const lifts = <T extends { squat: number; bench: number; deadlift: number }>(l: T) => ({ ...l, total: l.squat + l.bench + l.deadlift });
  const you = { ...me, name: `${me.name} (you)`, verified: false, ...lifts(liftsOf(heaviest(baseOf(me), s.sessions))) };
  const people = [
    ...lifters.map((l) => ({ ...lifts(l), avatar_url: null as string | null, value: gym ? lifts(l)[ev.id as "total"] : mockResults[l.id]?.[ev.id] })),
    ...others.map((p) => {
      const l = lifts({ squat: Number(p.squat), bench: Number(p.bench), deadlift: Number(p.deadlift) });
      return { ...p, ...l, bw: Number(p.bw), verified: false, value: gym ? l[ev.id as "total"] : results[p.id] };
    }),
    { ...you, value: gym ? you[ev.id as "total"] : results[me.id] },
  ];

  const rows = people
    .filter((l) => l.value && l.value > 0)
    .filter((l) => (standard === "class" ? l.sex === classSex && weightClass(l.bw, limits) === activeClass : sex === "all" || l.sex === sex))
    .filter((l) => l.id === me.id || who === "all" // you always stay in, so you see where you rank
      || (who === "faculty" && l.faculty === me.faculty)
      || (who === "following" && s.following.includes(l.id))
      || (who === "followers" && s.followers.includes(l.id))
      || (who === "friends" && s.following.includes(l.id) && s.followers.includes(l.id)))
    .map((l) => ({ ...l, score: standard !== "p4p" ? l.value! : ev.p4p === "dots" ? dots(l.value!, l.bw, l.sex) : l.value! / l.bw }))
    .sort((x, y) => (ev.lower && standard !== "p4p" ? x.score - y.score : y.score - x.score));

  const show = (n: number) => (standard === "p4p" ? (ev.p4p === "dots" ? n.toFixed(1) : `${n.toFixed(2)}×`) : fmt(n, ev.unit));
  function fmt(v: number, unit: typeof ev.unit) { return unit === "kg" ? w(v, u) : fmtResult(v, unit); }
  const unitLabel = standard === "p4p" ? (ev.p4p === "dots" ? "DOTS" : "× bodyweight") : "";
  const myRank = rows.findIndex((l) => l.id === me.id);
  const ahead = myRank > 0 ? rows[myRank - 1] : null;
  const isReal = (id: string) => others.some((o) => o.id === id);
  const podium = rows.slice(0, 3);
  const myValue = people.at(-1)!.value;

  async function save() {
    const raw = parseResult(draft, ev.unit);
    if (!raw) return;
    const v = ev.unit === "kg" ? Math.round(fromUnit(raw, u) * 100) / 100 : raw; // results stored in kg
    const better = !myValue || (ev.lower ? v < myValue : v > myValue);
    if (!better) return setDraft("");
    setSaving(true);
    const { error } = isDemo ? { error: null } : await sb.from("results").upsert({ user_id: me.id, event: ev.id, value: v, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) { setResults((r) => ({ ...r, [me.id]: v })); setDraft(""); }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="h-title flex items-center gap-2"><Icon name="ranks" size={34} />Ranks<InfoTip text={ranksHelp(standard, ev.p4p, ev.lower, classSex, gym)} label="How this board is scored" size={17} /></h1>
        <MeButton />
      </header>

      {/* event */}
      <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto border-b border-zinc-200 px-4 dark:border-zinc-800">
        {eventGroups.map((g) => (
          <button key={g} aria-pressed={group === g} onClick={() => { setGroup(g); setEventId(events.find((e) => e.group === g)!.id); }} className="tab">{g}</button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="group" aria-label="Event">
        {events.filter((e) => e.group === group).map((e) => {
          const on = e.id === eventId;
          return (
            <button key={e.id} aria-pressed={on} onClick={() => setEventId(e.id)}
              className={`flex w-[84px] shrink-0 flex-col items-center gap-1 rounded-2xl p-2 ring-2 transition active:scale-95 ${on ? "bg-lime-400/10 ring-lime-500" : "bg-white ring-transparent dark:bg-zinc-900"}`}>
              <Icon name={e.icon as IconName} size={40} />
              <span className={`text-center text-[11px] leading-tight ${on ? "font-bold" : "muted font-medium"}`}>{e.name}</span>
            </button>
          );
        })}
      </div>

      {/* standard */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 dark:bg-zinc-900" role="group" aria-label="Standard">
        {standards.map((x) => {
          const off = x.id === "p4p" && !ev.p4p;
          const on = standard === x.id;
          return (
            <button key={x.id} aria-pressed={on} disabled={off} onClick={() => setStd(x.id)} title={off ? "Only for weighted lifts" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition disabled:opacity-30 ${on ? "bg-lime-500 text-zinc-950" : "muted"}`}>
              <Icon name={x.icon} size={18} />{x.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-5">
        {(standard === "class" ? (["M", "F"] as const) : (["all", "M", "F"] as const)).map((x) => (
          <button key={x} aria-pressed={(standard === "class" ? classSex : sex) === x} onClick={() => setSex(x)} className="tab">{x === "all" ? "Everyone" : x === "M" ? "Men" : "Women"}</button>
        ))}
        <label className="relative ml-auto flex items-center gap-1 pb-2 text-sm font-semibold">
          <Icon name={who === "faculty" ? "faculty" : who === "all" ? "crowd" : "person"} size={16} />
          <select value={who} onChange={(e) => setWho(e.target.value as typeof who)} aria-label="Show"
            className="appearance-none bg-transparent pr-4 outline-none">
            <option value="all">All students</option>
            <option value="faculty">{me.faculty}</option>
            <option value="following">Following</option>
            <option value="followers">Followers</option>
            <option value="friends">Friends</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 muted" />
        </label>
      </div>

      {standard === "class" && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Weight class">
          {[...limits.map((l) => `-${l}`), `${limits.at(-1)}+`].map((c) => (
            <button key={c} aria-pressed={activeClass === c} onClick={() => setCls(c)} className="chip shrink-0 tabular-nums">
              {c} kg{c === myClass && classSex === me.sex ? " · you" : ""}
            </button>
          ))}
        </div>
      )}

      {podium.length === 3 && (
        <section className="card grid grid-cols-3 items-end gap-2 pt-6 text-center" aria-label="Top 3">
          {[podium[1], podium[0], podium[2]].map((l) => {
            const place = rows.indexOf(l), first = place === 0;
            return (
              <div key={l.id} className="flex flex-col items-center">
                <ProfileLink id={l.id} name={l.name} className="flex w-full flex-col items-center">
                  <div className="relative">
                    <Avatar id={l.id} url={l.avatar_url} name={l.name} size={first ? 76 : 60}
                      className={`ring-4 ${first ? "ring-amber-400" : place === 1 ? "ring-zinc-300" : "ring-orange-400"}`} />
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xl">{["🥇", "🥈", "🥉"][place]}</span>
                  </div>
                  <p className="mt-3 w-full truncate text-sm font-semibold">{l.name}</p>
                </ProfileLink>
                <p className="text-lg font-bold leading-tight tabular-nums">{show(l.score)}</p>
                <p className="muted text-[10px] uppercase">{unitLabel || " "}</p>
                <div className={`mt-2 w-full rounded-t-xl ${first ? "h-14 bg-amber-400/20" : place === 1 ? "h-10 bg-zinc-400/15" : "h-7 bg-orange-400/15"}`} />
              </div>
            );
          })}
        </section>
      )}

      {myRank >= 0 ? (
        <section className="card flex items-center gap-3">
          <Icon name="medal" size={40} />
          <div className="flex-1">
            <p className="font-semibold">You&apos;re #{myRank + 1} of {rows.length}</p>
            <p className="muted text-xs">{ahead ? `${show(Math.abs(ahead.score - rows[myRank].score))}${unitLabel === "DOTS" ? " DOTS" : ""} to pass ${ahead.name}` : "Top of the board. Defend it 💪"}</p>
          </div>
          <span className="text-xl font-bold tabular-nums">{show(rows[myRank].score)}</span>
        </section>
      ) : myValue && standard === "class" ? (
        <p className="card muted text-sm">You compete in the {myClass} kg class ({me.sex === "M" ? "men" : "women"}).</p>
      ) : null}

      {!gym && (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="card flex items-center gap-3">
          <Icon name={ev.icon as IconName} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{myValue ? `Your best: ${fmt(myValue, ev.unit)}` : `Log your ${ev.name.toLowerCase()}`}</p>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={ev.unit === "kg" ? u : placeholder[ev.unit]} aria-label={`New ${ev.name} result`}
              inputMode={ev.unit === "time" ? "text" : "decimal"} className="num mt-1 text-left" />
          </div>
          <button disabled={saving || !parseResult(draft, ev.unit)} className="btn self-end py-2 text-sm">{saving ? "…" : "Save"}</button>
        </form>
      )}
      {gym && myRank < 0 && <p className="card muted text-sm">Log {ev.name.toLowerCase()} sets in Train to get on this board.</p>}

      <ol>
        {rows.map((l, i) => (
          <li key={l.id} className={`card flex items-center gap-3 py-3 ${l.id === me.id ? "bg-lime-400/10" : ""}`}>
            <span className={`w-5 text-center text-sm font-bold tabular-nums ${i < 3 ? "text-amber-500" : "muted"}`}>{i + 1}</span>
            <ProfileLink id={l.id} name={l.name} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar id={l.id} url={l.avatar_url} name={l.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold"><span className="truncate">{l.name}</span>{l.verified && <Icon name="verified" size={16} />}</p>
              <p className="muted flex items-center gap-1 text-xs"><Icon name="faculty" size={14} />{l.faculty}</p>
              <div className="muted mt-1 flex flex-wrap gap-1 text-[11px] font-medium tabular-nums">
                <Stat icon="scale">{w(l.bw, u)} · {weightClass(l.bw, weightClasses[l.sex])} kg class</Stat>
                {standard === "p4p" && <Stat icon={ev.icon as IconName}>{fmt(l.value!, ev.unit)}</Stat>}
              </div>
            </div>
            </ProfileLink>
            <div className="flex flex-col items-end gap-1">
              <span className="text-lg font-bold leading-none tabular-nums">{show(l.score)}</span>
              {isReal(l.id) && <FollowButton id={l.id} name={l.name} />}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li><EmptyState art="podium" title="Nobody here yet" text={["following", "followers", "friends"].includes(who) ? "Follow students from the feed to compare with them." : "Log a result and take first place."} /></li>}
      </ol>
    </div>
  );
}
