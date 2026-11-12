"use client";
/* eslint-disable @next/next/no-img-element */
// The landing page hero: a scroll-pinned, Apple-style ad for the app. A headline zooms away as a phone rises in, then
// each feature plays inside the phone as live, coded UI scrubbed by the scroll: a cursor moves and clicks, text types,
// numbers count, bars fill, lists filter and stagger in, sheets slide up, the camera pushes in on the phone, components
// burst out of it as bigger live cards, and the page flashes lime on the big moments. The map scene runs the real 3D gym.
// Everything is a pure function of scroll position, so scrolling back plays it in reverse.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { equipment, floor } from "@/lib/data";

const Gym3D = dynamic(() => import("./Gym3D"), { ssr: false });
const MuscleModel = dynamic(() => import("./MuscleModel"), { ssr: false });

// --- maths --------------------------------------------------------------------------------------------------------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** keyframes as t0, v0, t1, v1, ... eased between */
function tr(t: number, ...k: number[]) {
  if (t <= k[0]) return k[1];
  for (let i = 0; i + 2 < k.length; i += 2) if (t <= k[i + 2]) return k[i + 1] + (k[i + 3] - k[i + 1]) * io((t - k[i]) / (k[i + 2] - k[i]));
  return k[k.length - 1];
}
const back = (x: number) => (x <= 0 ? 0 : 1 + 2.70158 * Math.pow(clamp(x) - 1, 3) + 1.70158 * Math.pow(clamp(x) - 1, 2));
/** 0 before a, springs past 1 and settles, gone by b */
const pop = (t: number, a: number, b = 0.97) => back((t - a) / 0.08) * (1 - smooth(b - 0.05, b, t));
const bump = (t: number, c: number, w = 0.022) => Math.max(0, 1 - Math.abs(t - c) / w);
const typed = (s: string, t: number, a: number, b: number) => s.slice(0, Math.round(clamp((t - a) / (b - a)) * s.length));
const mix = (a: string, b: string, t: number) => {
  const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(h(a, i) + (h(b, i) - h(a, i)) * t)).join(",")})`;
};
/** staggered entrance: item i of a list, as e (the screen's entrance, 0..1) runs */
const st = (e: number, i: number) => smooth(i * 0.07, i * 0.07 + 0.45, e);

// --- phone coordinates: the screen is a 480 x 1069 virtual canvas; the phone root is a size container (cqw) ------------
const S = 0.1975; // cqw of the phone per virtual px (the screen is 94.8% of the phone's width)
const u = (n: number) => `${(n * S).toFixed(3)}cqw`;
/** a screen point as % of the phone box (for things outside the screen) */
const at = (x: number, y: number): [number, number] => [2.6 + (x / 480) * 94.8, 1.2 + (y / 1069) * 97.6];
const rise = (v: number, dy = 30): CSSProperties => ({ opacity: v, transform: `translateY(${((1 - v) * dy * S).toFixed(3)}cqw)` });

const LIME = "#a3e635";
const CARD = "rounded-[3.6cqw] bg-zinc-900 ring-1 ring-white/[0.06]";

function B({ x, y, w, h, className = "", style, children }: { x: number; y: number; w?: number; h?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return <div className={`absolute ${className}`} style={{ left: u(x), top: u(y), width: w === undefined ? undefined : u(w), height: h === undefined ? undefined : u(h), ...style }}>{children}</div>;
}
const Caret = () => <span className="inline-block animate-pulse bg-lime-400 align-middle" style={{ width: u(3), height: "1.1em", marginLeft: u(2) }} />;
const Icon = ({ n, s }: { n: string; s: number }) => <img src={`/icons/${n}.webp`} alt="" style={{ width: u(s), height: u(s) }} />;

function Head({ e, icon, title, sub }: { e: number; icon: string; title: string; sub?: string }) {
  return (
    <B x={28} y={52} style={rise(st(e, 0))}>
      <div className="flex items-center" style={{ gap: u(10) }}><Icon n={icon} s={42} /><p className="font-black tracking-tight" style={{ fontSize: u(36) }}>{title}</p></div>
      {sub && <p className="text-zinc-400" style={{ fontSize: u(16), marginTop: u(2) }}>{sub}</p>}
    </B>
  );
}
function Nav({ on, e }: { on: number; e: number }) {
  return (
    <B x={0} y={985} w={480} h={84} className="flex justify-around border-t border-white/10 bg-zinc-950" style={{ paddingTop: u(10), opacity: smooth(0, 0.3, e) }}>
      {[["gym", "Gym"], ["barbell", "Train"], ["eat", "Eat"], ["ranks", "Ranks"], ["feed", "Feed"]].map(([i, l], k) => (
        <div key={l} className="flex flex-col items-center" style={{ gap: u(4), opacity: k === on ? 1 : 0.45 }}>
          <Icon n={i} s={34} /><span className="font-semibold" style={{ fontSize: u(13), color: k === on ? LIME : "#a1a1aa" }}>{l}</span>
        </div>
      ))}
    </B>
  );
}
function Bar({ v, c, h = 10 }: { v: number; c: string; h?: number }) {
  return <div className="overflow-hidden rounded-full bg-zinc-800" style={{ height: u(h) }}><div className="h-full rounded-full" style={{ width: `${clamp(v) * 100}%`, background: c }} /></div>;
}
function Ring({ v, c, size, w = 5, children }: { v: number; c: string; size: number; w?: number; children?: ReactNode }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: u(size), height: u(size) }}>
      <svg viewBox="0 0 40 40" className="absolute inset-0"><circle cx="20" cy="20" r={18 - w / 2} fill="none" stroke="#27272a" strokeWidth={w} />
        <circle cx="20" cy="20" r={18 - w / 2} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray={`${clamp(v)} 1`} transform="rotate(-90 20 20)" /></svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** a live card flying out of the phone (from) to a bigger spot beside it (to), springing on arrival */
function Pop({ s, from, to, wide, glow, tilt = 0, children }: { s: number; from: [number, number]; to: [number, number]; wide: boolean; glow: string; tilt?: number; children: ReactNode }) {
  if (s <= 0.001) return null;
  const k = clamp(s), tx = wide ? to[0] : 50 + (to[0] - 50) * 0.55;
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: `${from[0] + (tx - from[0]) * k}%`, top: `${from[1] + (to[1] - from[1]) * k}%`, opacity: clamp(s * 3), transform: `translate(-50%,-50%) scale(${0.35 + 0.65 * s}) rotate(${tilt * (1 - k)}deg)` }}>
      <div className="overflow-hidden rounded-[3.5cqw] bg-zinc-900/95 ring-1 ring-white/20 backdrop-blur" style={{ boxShadow: `0 30px 80px -24px rgba(0,0,0,.75), 0 0 0 ${u(2)} ${glow}33`, padding: u(26) }}>{children}</div>
    </div>
  );
}
const PopTitle = ({ c, children }: { c: string; children: ReactNode }) => <p className="font-bold uppercase tracking-widest" style={{ fontSize: u(15), color: c }}>{children}</p>;

// ================================================== screens ==========================================================
const CROWD = [20, 14, 18, 30, 22, 16, 26, 34, 44, 58, 40, 28]; // 08:00 .. 19:00

function Home({ t, e }: { t: number; e: number }) {
  const crowd = Math.round(55 * smooth(0.25, 1, e)), clocked = t > 0.42;
  const scan = smooth(0.23, 0.25, t) * (1 - smooth(0.45, 0.49, t)), ok = smooth(0.33, 0.35, t);
  const line = ((((t - 0.23) / 0.05) % 1) + 1) % 1;
  return <>
    <B x={28} y={52} style={rise(st(e, 0))}>
      <p className="text-zinc-400" style={{ fontSize: u(17) }}>Hey Aiden 👋</p>
      <p className="font-black tracking-tight" style={{ fontSize: u(34) }}>APU SweatZone</p>
    </B>
    <B x={296} y={84} w={156} h={32} className="flex items-center justify-center rounded-full bg-lime-400/15 font-bold text-lime-400" style={{ fontSize: u(14), gap: u(6), ...rise(st(e, 1)) }}>
      <span className="animate-pulse rounded-full bg-lime-400" style={{ width: u(8), height: u(8) }} />Open until 21:00
    </B>

    <B x={24} y={140} w={432} h={195} className={CARD} style={{ padding: u(20), ...rise(st(e, 1)) }}>
      <p className="font-bold uppercase tracking-wider text-zinc-400" style={{ fontSize: u(13) }}>Skip the ID check at the counter</p>
      <p className="font-bold" style={{ fontSize: u(22), width: u(300), marginTop: u(6), lineHeight: 1.25 }}>Scan the QR at the gym door to clock in</p>
      <img src="/icons/qr.webp" alt="" className="absolute" style={{ right: u(18), top: u(18), width: u(72), transform: `translateY(${Math.sin(t * 40) * 0.6}cqw) rotate(${Math.sin(t * 30) * 6}deg)` }} />
      <div className="absolute flex items-center justify-center rounded-[2cqw] font-bold"
        style={{ left: u(20), right: u(20), bottom: u(20), height: u(52), fontSize: u(19), background: clocked ? "#27272a" : LIME, color: clocked ? LIME : "#09090b", transform: `scale(${1 - bump(t, 0.23, 0.015) * 0.06})` }}>
        {clocked ? "✓ Clocked in · 17:45" : "→ Scan to clock in"}
      </div>
    </B>

    <B x={24} y={355} w={432} h={250} className={CARD} style={{ padding: u(20), ...rise(st(e, 2)) }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center font-bold" style={{ gap: u(8), fontSize: u(20) }}><Icon n="crowd" s={30} />Live crowd</div>
        <span className="flex items-center font-bold text-lime-400" style={{ gap: u(6), fontSize: u(14) }}><span className="animate-ping rounded-full bg-lime-400" style={{ width: u(8), height: u(8) }} />LIVE</span>
      </div>
      <div className="flex items-end justify-between" style={{ marginTop: u(8) }}>
        <p><span className="font-black tabular-nums" style={{ fontSize: u(58), lineHeight: 1 }}>{crowd}</span><span className="text-zinc-400" style={{ fontSize: u(18) }}> / 60 people</span></p>
        <span className="font-bold text-red-400" style={{ fontSize: u(17), opacity: smooth(40, 50, crowd) }}>Packed</span>
      </div>
      <div style={{ marginTop: u(10) }}><Bar v={crowd / 60} c="linear-gradient(90deg,#facc15,#ef4444)" /></div>
      <div className="flex items-end" style={{ gap: u(6), height: u(70), marginTop: u(14) }}>
        {CROWD.map((h, i) => <div key={i} className="flex-1 rounded-t-[0.8cqw]" style={{ height: u(h * 1.15 * smooth(0.2 + i * 0.04, 0.5 + i * 0.04, e)), background: i === 10 ? "#ef4444" : "#3f3f46" }} />)}
      </div>
    </B>

    <B x={24} y={625} w={432} h={160} className={CARD} style={{ padding: u(20), ...rise(st(e, 3)) }}>
      <div className="flex items-center font-bold" style={{ gap: u(8), fontSize: u(20) }}><Icon n="calendar" s={30} />Best time to train today</div>
      <p className="font-black tabular-nums" style={{ fontSize: u(44), marginTop: u(6) }}>{typed("19:30–20:30", e, 0.45, 0.95)}<span className="opacity-0">.</span></p>
      <p className="text-zinc-400" style={{ fontSize: u(16), opacity: smooth(0.8, 1, e) }}>~52% full · after IoT Systems</p>
    </B>

    <B x={24} y={805} w={432} h={80} className={`${CARD} flex items-center`} style={{ padding: `0 ${u(20)}`, gap: u(14), ...rise(st(e, 4)) }}>
      <Icon n="map" s={44} /><div className="flex-1"><p className="font-bold" style={{ fontSize: u(19) }}>Gym map</p><p className="text-zinc-400" style={{ fontSize: u(15) }}>Find any machine or rack</p></div><span className="text-zinc-500" style={{ fontSize: u(24) }}>›</span>
    </B>
    <Nav on={0} e={e} />

    {scan > 0 && (
      <div className="absolute inset-0 z-20 bg-black/90" style={{ opacity: scan }}>
        <p className="absolute inset-x-0 text-center font-bold" style={{ top: u(240), fontSize: u(22) }}>Point at the QR on the door</p>
        <B x={110} y={330} w={260} h={260}>
          <img src="/icons/qr.webp" alt="" className="absolute inset-[18%] opacity-60" style={{ width: "64%" }} />
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b2]) => (
            <div key={`${a}${b2}`} className="absolute border-lime-400" style={{ width: u(54), height: u(54), [a ? "right" : "left"]: 0, [b2 ? "bottom" : "top"]: 0, borderWidth: 0, [`border${b2 ? "Bottom" : "Top"}Width`]: u(6), [`border${a ? "Right" : "Left"}Width`]: u(6) }} />
          ))}
          <div className="absolute inset-x-[6%] bg-lime-400 shadow-[0_0_20px_#a3e635]" style={{ top: `${line * 100}%`, height: u(4), opacity: 1 - ok }} />
        </B>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-lime-400 text-zinc-950" style={{ opacity: ok }}>
          <svg viewBox="0 0 100 100" style={{ width: u(160) }}><circle cx="50" cy="50" r="46" fill="#09090b" style={{ transform: `scale(${back((t - 0.33) / 0.05)})`, transformOrigin: "50% 50%" }} />
            <path d="M30 52 l14 14 l27 -30" fill="none" stroke={LIME} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${smooth(0.35, 0.39, t)} 1`} /></svg>
          <p className="font-black tracking-tight" style={{ fontSize: u(54), marginTop: u(20), ...rise(smooth(0.36, 0.39, t)) }}>You&apos;re in.</p>
          <p className="font-semibold opacity-70" style={{ fontSize: u(22), ...rise(smooth(0.37, 0.4, t)) }}>Clocked in · 17:45</p>
        </div>
      </div>
    )}
  </>;
}

// muscles lit by the set just logged, stepped so the model only repaints a few times; "_" pins the scale (paint() divides by the max)
const q10 = (v: number) => Math.round(v * 10) / 10;
const worked = (t: number) => ({ _: 1, chest: q10(smooth(0.8, 0.88, t)), triceps: q10(smooth(0.84, 0.92, t) * 0.6), shoulders: q10(smooth(0.86, 0.94, t) * 0.5) });

const ROUTINES = [["Push day", "Bench Press, Incline DB Press, Shoulder Press, Cable Crossover, Chest Dip"], ["Pull day", "Deadlift, Pull Up, Seated Cable Row, Lat Pulldown, Bicep Curl"], ["Legs day", "Squat, Romanian Deadlift, Leg Press, Leg Extension, Calf Raise"]];
const COL = { set: [28, 56], kg: [100, 140], reps: [262, 110], ok: [394, 58] } as const; // x, width of each column

function Train({ t, e }: { t: number; e: number }) {
  const sheet = smooth(0.19, 0.27, t), done = t > 0.56;
  const kgLive = t > 0.32 && !done, repsLive = t > 0.46 && !done;
  const kg = t < 0.32 ? "" : typed("72.5", t, 0.33, 0.41), reps = t < 0.46 ? "" : typed("6", t, 0.47, 0.49);
  const cell = (col: readonly [number, number], y: number, v: string, hint: string, live: boolean, fill?: string) => (
    <B x={col[0]} y={y} w={col[1]} h={44} className="flex items-center justify-center rounded-[1.4cqw] font-bold tabular-nums"
      style={{ fontSize: u(21), background: fill ?? (live ? "#27272a" : "#18181b"), boxShadow: live ? `inset 0 0 0 ${u(2)} ${LIME}` : undefined }}>
      {v || <span className="text-zinc-600">{hint}</span>}{live && <Caret />}
    </B>
  );
  return <>
    <Head e={e} icon="barbell" title="Train" />
    <B x={28} y={120} className="font-bold" style={{ fontSize: u(19), ...rise(st(e, 1)) }}>Quick start</B>
    <B x={24} y={150} w={432} h={52} className="flex items-center justify-center rounded-[2cqw] bg-lime-400 font-bold text-zinc-950" style={{ fontSize: u(19), ...rise(st(e, 1)) }}>+ Start empty workout</B>
    <B x={28} y={228} className="font-bold" style={{ fontSize: u(19), ...rise(st(e, 2)) }}>My routines <span className="text-zinc-500">(3)</span></B>
    {ROUTINES.map(([n, l], i) => (
      <B key={n} x={24} y={265 + i * 150} w={432} h={135} className={CARD} style={{ padding: u(18), ...rise(st(e, i + 2), 50) }}>
        <p className="font-bold" style={{ fontSize: u(23) }}>{n}</p>
        <p className="text-zinc-400" style={{ fontSize: u(15), width: u(260), lineHeight: 1.35, marginTop: u(4) }}>{l}</p>
        <div className="absolute flex items-center justify-center rounded-[1.6cqw] bg-lime-400 font-bold text-zinc-950"
          style={{ right: u(18), bottom: u(18), width: u(120), height: u(42), fontSize: u(17), transform: i === 0 ? `scale(${1 - bump(t, 0.18, 0.015) * 0.08})` : undefined }}>Start</div>
      </B>
    ))}
    <Nav on={1} e={e} />

    {sheet > 0 && (
      <B x={0} y={300 + (1 - sheet) * 769} w={480} h={769} className="z-10 rounded-t-[4cqw] bg-zinc-950 shadow-[0_-20px_60px_rgba(0,0,0,.7)] ring-1 ring-white/10">
        <B x={210} y={12} w={60} h={6} className="rounded-full bg-zinc-700" />
        <B x={28} y={34} className="font-black" style={{ fontSize: u(30) }}>Push day</B>
        <B x={330} y={42} w={122} className="text-right font-mono font-bold text-lime-400" style={{ fontSize: u(22) }}>00:{String(Math.floor(clamp((t - 0.2) * 70, 0, 59))).padStart(2, "0")}</B>
        <B x={28} y={88} className="font-bold text-sky-400" style={{ fontSize: u(22) }}>Bench Press (Barbell)</B>
        {(["set", "kg", "reps", "ok"] as const).map((c) => (
          <B key={c} x={COL[c][0]} y={130} w={COL[c][1]} className="text-center font-semibold text-zinc-500" style={{ fontSize: u(14) }}>{{ set: "SET", kg: "KG", reps: "REPS", ok: "✓" }[c]}</B>
        ))}
        {/* set 1, already done */}
        <B x={12} y={156} w={456} h={56} className="rounded-[1.6cqw] bg-lime-400/10" />
        <B x={COL.set[0]} y={156} w={COL.set[1]} h={56} className="flex items-center justify-center font-bold" style={{ fontSize: u(21) }}>1</B>
        {cell(COL.kg, 162, "70", "", false, "transparent")}{cell(COL.reps, 162, "6", "", false, "transparent")}
        <B x={COL.ok[0]} y={162} w={COL.ok[1]} h={44} className="flex items-center justify-center rounded-[1.4cqw] bg-lime-400 font-black text-zinc-950" style={{ fontSize: u(22) }}>✓</B>
        {/* set 2, typed in */}
        <B x={12} y={216} w={456} h={56} className="rounded-[1.6cqw]" style={{ background: done ? `rgba(163,230,53,${0.1 + bump(t, 0.57, 0.03) * 0.5})` : undefined }} />
        <B x={COL.set[0]} y={216} w={COL.set[1]} h={56} className="flex items-center justify-center font-bold" style={{ fontSize: u(21) }}>2</B>
        {cell(COL.kg, 222, kg, "70", kgLive, done ? "transparent" : undefined)}{cell(COL.reps, 222, reps, "6", repsLive, done ? "transparent" : undefined)}
        <B x={COL.ok[0]} y={222} w={COL.ok[1]} h={44} className="flex items-center justify-center rounded-[1.4cqw] font-black"
          style={{ fontSize: u(22), background: done ? LIME : "#27272a", color: done ? "#09090b" : "#71717a", transform: `scale(${1 + bump(t, 0.565, 0.03) * 0.5})` }}>✓</B>
        {/* set 3 appears */}
        <B x={0} y={276} w={480} h={56} style={rise(smooth(0.58, 0.64, t))}>
          <B x={COL.set[0]} y={0} w={COL.set[1]} h={56} className="flex items-center justify-center font-bold text-zinc-400" style={{ fontSize: u(21) }}>3</B>
          {cell(COL.kg, 6, "", "72.5", false)}{cell(COL.reps, 6, "", "6", false)}
          <B x={COL.ok[0]} y={6} w={COL.ok[1]} h={44} className="flex items-center justify-center rounded-[1.4cqw] bg-zinc-800 font-black text-zinc-500" style={{ fontSize: u(22) }}>✓</B>
        </B>
        <B x={24} y={350} w={432} h={48} className="flex items-center justify-center rounded-[2cqw] bg-zinc-800 font-bold" style={{ fontSize: u(18) }}>+ Add set</B>
        <B x={24} y={418} w={432} h={56} className="flex items-center justify-center rounded-[2cqw] bg-lime-400/15 font-black text-lime-300 ring-1 ring-lime-400/40" style={{ fontSize: u(20), ...rise(smooth(0.58, 0.63, t)) }}>🏆 New best · 72.5 kg</B>
      </B>
    )}
  </>;
}

const MENU: [string, number, number, number, number, string][] = [
  ["Nasi lemak + fried chicken", 780, 32, 85, 34, "nasi-lemak-fried-chicken"],
  ["Chicken briyani", 850, 38, 100, 30, "chicken-briyani"],
  ["Nasi goreng kampung", 680, 22, 90, 24, "nasi-goreng-kampung"],
  ["Nasi lemak bungkus", 400, 10, 55, 16, "nasi-lemak-bungkus"],
  ["Mee goreng mamak", 660, 18, 88, 26, "mee-goreng-mamak"],
];
const QUERY = "nasi lemak";

function Eat({ t, e }: { t: number; e: number }) {
  const add = smooth(0.55, 0.68, t), fill = smooth(0.2, 0.8, e), added = t > 0.5;
  const eaten = 900 + 780 * add, left = t < 0.5 ? Math.round(1200 * smooth(0.2, 0.9, e)) : Math.round(2100 - eaten);
  const q = t > 0.15 ? typed(QUERY, t, 0.17, 0.33) : "";
  let y = 470;
  const rows = MENU.map((m, i) => {
    let k = 0;
    while (k < QUERY.length && m[0].toLowerCase()[k] === QUERY[k]) k++;
    const gone = k >= QUERY.length ? 0 : smooth(0.17 + ((k + 0.5) / QUERY.length) * 0.16, 0.2 + ((k + 0.5) / QUERY.length) * 0.16, t);
    const row = { m, y, v: (1 - gone) * st(e, i + 3) };
    y += 104 * (1 - gone);
    return row;
  });
  const macro = (x: number, label: string, icon: string, base: number, plus: number, max: number, c: string) => (
    <B x={x} y={110} w={124}>
      <div className="flex items-center text-zinc-400" style={{ fontSize: u(14), gap: u(4) }}><Icon n={icon} s={20} />{label}</div>
      <p className="font-bold tabular-nums" style={{ fontSize: u(18), margin: `${u(2)} 0 ${u(6)}` }}>{Math.round(base + plus * add)}<span className="text-zinc-500">/{max}g</span></p>
      <Bar v={((base + plus * add) / max) * fill} c={c} h={8} />
    </B>
  );
  return <>
    <Head e={e} icon="eat" title="Eat" sub="Cut for trained lifters · 2100 kcal target ›" />
    <B x={24} y={136} w={432} h={44} className="flex rounded-[2cqw] bg-zinc-900 p-[0.8cqw]" style={rise(st(e, 1))}>
      <div className="flex flex-1 items-center justify-center rounded-[1.6cqw] bg-zinc-700 font-bold" style={{ fontSize: u(16) }}>Today</div>
      <div className="flex flex-1 items-center justify-center text-zinc-400" style={{ fontSize: u(16) }}>Progress</div>
    </B>
    <B x={24} y={196} w={432} h={188} className={CARD} style={{ padding: u(20), ...rise(st(e, 2)) }}>
      <B x={20} y={18} className="flex items-center" style={{ gap: u(12) }}>
        <Icon n="target" s={50} />
        <div><p className="font-black tabular-nums" style={{ fontSize: u(42), lineHeight: 1, color: mix("#fafafa", "#a3e635", bump(t, 0.6, 0.08)) }}>{left}</p><p className="text-zinc-400" style={{ fontSize: u(15) }}>kcal left today</p></div>
      </B>
      <B x={300} y={26} w={112} className="text-right text-zinc-400 tabular-nums" style={{ fontSize: u(15) }}>{Math.round(eaten * fill)} / 2100</B>
      <B x={20} y={84} w={392}><Bar v={(eaten / 2100) * fill} c={LIME} h={8} /></B>
      {macro(20, "Protein", "protein", 68, 32, 174, "#38bdf8")}{macro(154, "Carbs", "carbs", 140, 85, 236, "#fb923c")}{macro(288, "Fat", "fat", 15, 34, 51, "#f472b6")}
    </B>
    <B x={24} y={400} w={432} h={52} className="flex items-center rounded-[2cqw] bg-zinc-900"
      style={{ padding: `0 ${u(16)}`, fontSize: u(19), boxShadow: t > 0.15 ? `inset 0 0 0 ${u(2)} ${LIME}` : undefined, ...rise(st(e, 3)) }}>
      <span className="text-zinc-500" style={{ marginRight: u(10) }}>⌕</span>{q || (t <= 0.15 && <span className="text-zinc-500">Search food...</span>)}{t > 0.15 && <Caret />}
    </B>
    {rows.map(({ m: [n, kcal, p, c, f, img], y: ry, v }, i) => v > 0.01 && (
      <B key={n} x={24} y={ry} w={432} h={96} className={`${CARD} flex items-center`} style={{ padding: `0 ${u(14)}`, gap: u(14), opacity: v, transform: `scale(${0.92 + 0.08 * v})` }}>
        <img src={`/food/${img}.webp`} alt="" className="rounded-[1.6cqw]" style={{ width: u(68), height: u(68) }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold" style={{ fontSize: u(18) }}>{n}</p>
          <p className="text-zinc-400" style={{ fontSize: u(14) }}><b className="text-zinc-200">{kcal}</b> kcal · P {p} · C {c} · F {f}</p>
        </div>
        <div className="flex shrink-0 items-center justify-center rounded-[1.4cqw] font-black"
          style={{ width: u(44), height: u(44), fontSize: u(24), background: i === 0 && added ? "#27272a" : LIME, color: i === 0 && added ? LIME : "#09090b", transform: i === 0 ? `scale(${1 + bump(t, 0.505, 0.02) * 0.4})` : undefined }}>{i === 0 && added ? "✓" : "+"}</div>
      </B>
    ))}
    <Nav on={2} e={e} />
    {added && (
      <div className="absolute z-20 flex items-center whitespace-nowrap rounded-full bg-lime-400 font-bold text-zinc-950 shadow-lg"
        style={{ left: "50%", top: u(60), padding: `${u(10)} ${u(22)}`, fontSize: u(18), transform: `translate(-50%, ${(1 - clamp(pop(t, 0.5, 0.75))) * -250}%)` }}>✓ Added nasi lemak · 780 kcal</div>
    )}
  </>;
}

const BOARD: [string, string, string, number][] = [["Daniel K.", "Engineering", "u1", 396.7], ["Hafiz R.", "Engineering", "u2", 388.2], ["Jun Wei", "Computing", "u3", 380.0], ["Priya S.", "Business", "u4", 365.3]];
const PODIUM = [[1, 105, 80, "#d4d4d8"], [0, 240, 120, "#fbbf24"], [2, 375, 56, "#f97316"]] as const; // board index, centre x, bar height, colour

function Podium({ t0, t, big = 1 }: { t0: number; t: number; big?: number }) {
  return <>
    {PODIUM.map(([i, x, h, c], k) => {
      const grow = smooth(t0 + k * 0.04, t0 + k * 0.04 + 0.12, t), drop = back((t - t0 - 0.1 - k * 0.04) / 0.08);
      const [n, , av, score] = BOARD[i];
      return (
        <div key={n} className="absolute bottom-0 flex flex-col items-center" style={{ left: u((x - 60) * big), width: u(120 * big) }}>
          <div className="flex flex-col items-center" style={{ opacity: clamp(drop * 2), transform: `translateY(${(1 - clamp(drop)) * -12}cqw)` }}>
            <img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u((i === 0 ? 78 : 64) * big), height: u((i === 0 ? 78 : 64) * big), boxShadow: `0 0 0 ${u(4 * big)} ${c}` }} />
            <p className="whitespace-nowrap font-bold" style={{ fontSize: u(15 * big), marginTop: u(8) }}>{n}</p>
            <p className="font-black tabular-nums" style={{ fontSize: u(20 * big), color: c }}>{(score * smooth(t0 + 0.08, t0 + 0.22, t)).toFixed(1)}</p>
          </div>
          <div className="w-full rounded-t-[1.4cqw]" style={{ height: u(h * big * grow), marginTop: u(6), background: `linear-gradient(180deg, ${c}66, ${c}11)` }}>
            <p className="text-center font-black" style={{ fontSize: u(26 * big), color: c, opacity: grow }}>{i + 1}</p>
          </div>
        </div>
      );
    })}
  </>;
}

function Ranks({ t, e }: { t: number; e: number }) {
  const rank = t < 0.47 ? 11 : Math.round(tr(t, 0.48, 11, 0.74, 4)), up = t > 0.74;
  return <>
    <Head e={e} icon="ranks" title="Ranks" />
    <B x={28} y={112} w={430} className="flex border-b border-white/10" style={{ gap: u(22), fontSize: u(16), ...rise(st(e, 1)) }}>
      {["Powerlifting", "Strength", "Calisthenics", "Athletics"].map((l, i) => (
        <div key={l} className="relative font-semibold" style={{ paddingBottom: u(10), color: i ? "#a1a1aa" : LIME }}>{l}
          {!i && <div className="absolute bottom-[-1px] left-0 bg-lime-400" style={{ height: u(3), width: `${smooth(0.3, 0.8, e) * 100}%` }} />}</div>
      ))}
    </B>
    {[["barbell", "SBD total"], ["squat", "Squat"], ["bench", "Bench"], ["deadlift", "Deadlift"]].map(([ic, l], i) => (
      <B key={l} x={24 + i * 110} y={160} w={100} h={84} className="flex flex-col items-center justify-center rounded-[2cqw] bg-zinc-900"
        style={{ gap: u(4), boxShadow: !i ? `inset 0 0 0 ${u(2)} ${LIME}` : undefined, ...rise(st(e, i + 1)) }}>
        <Icon n={ic} s={38} /><span className="font-bold" style={{ fontSize: u(13) }}>{l}</span>
      </B>
    ))}
    <B x={0} y={262} w={480} h={244}><Podium t0={0.15} t={e * 0.55} /></B>
    <B x={24} y={520} w={432} h={72} className={`${CARD} flex items-center`}
      style={{ padding: `0 ${u(16)}`, gap: u(12), boxShadow: up ? `0 0 0 ${u(3)} ${LIME}, 0 0 ${u(30)} ${LIME}66` : undefined, ...rise(st(e, 5)), transform: `scale(${1 + bump(t, 0.75, 0.04) * 0.05})` }}>
      <Icon n="medal" s={40} />
      <div className="flex-1"><p className="font-bold tabular-nums" style={{ fontSize: u(19) }}>You&apos;re #{rank} of 11 {up && <span className="text-lime-400">▲ 7</span>}</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>{up ? "Top 4 in Computing" : "100.1 DOTS to pass Mei Ling"}</p></div>
      <p className="font-black tabular-nums" style={{ fontSize: u(22) }}>{(217.2 + 160 * smooth(0.48, 0.74, t)).toFixed(1)}</p>
    </B>
    {BOARD.map(([n, fac, av, score], i) => (
      <B key={n} x={24} y={606 + i * 90} w={432} h={80} className="flex items-center border-b border-white/5" style={{ gap: u(14), padding: `0 ${u(8)}`, ...rise(st(e, i + 6), 40) }}>
        <span className="font-black text-lime-400" style={{ width: u(20), fontSize: u(19) }}>{i + 1}</span>
        <img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u(50), height: u(50) }} />
        <div className="flex-1"><p className="font-bold" style={{ fontSize: u(18) }}>{n}</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>{fac}</p></div>
        <p className="font-black tabular-nums" style={{ fontSize: u(21) }}>{(score * smooth(0.4 + i * 0.07, 0.9 + i * 0.02, e)).toFixed(1)}</p>
      </B>
    ))}
    <Nav on={3} e={e} />
  </>;
}

const CHIPS: [string, number, number][] = [["Flat Bench", 24, 118], ["Incline", 150, 98], ["Squat Rack", 256, 124], ["Rig", 388, 68]];

function MapScreen({ t, e }: { t: number; e: number }) {
  const picked = t > 0.2;
  return <>
    <B x={24} y={52} w={48} h={48} className="flex items-center justify-center rounded-[1.6cqw] bg-zinc-900" style={{ fontSize: u(24), ...rise(st(e, 0)) }}>←</B>
    <B x={86} y={48} style={rise(st(e, 0))}><p className="font-black" style={{ fontSize: u(32) }}>Gym map</p><p className="text-zinc-400" style={{ fontSize: u(15) }}>{picked ? "Squat Rack · Benches & racks" : "Tap any equipment"}</p></B>
    <B x={24} y={124} className="flex" style={{ gap: u(8), ...rise(st(e, 1)) }}>
      <span className="rounded-[1.4cqw] bg-lime-400 font-bold text-zinc-950" style={{ padding: `${u(8)} ${u(16)}`, fontSize: u(15) }}>3D</span>
      <span className="rounded-[1.4cqw] bg-zinc-800 font-bold" style={{ padding: `${u(8)} ${u(16)}`, fontSize: u(15) }}>Floor plan</span>
    </B>
    <B x={0} y={176} w={480} h={530} className="pointer-events-none overflow-hidden bg-zinc-950 [&_button]:hidden [&>div]:h-full [&_canvas]:!h-full [&_canvas]:!max-h-none" style={{ opacity: smooth(0.1, 0.5, e) }}>
      <Gym3D sel={picked ? "rack" : undefined} onPick={() => {}} />
    </B>
    <B x={24} y={724} w={432} className="flex border-b border-white/10" style={{ gap: u(20), fontSize: u(16), ...rise(st(e, 2)) }}>
      {["Free weights", "Benches & racks", "Cables", "Machines"].map((l, i) => {
        const on = picked ? i === 1 : i === 0;
        return <div key={l} className="relative whitespace-nowrap font-semibold" style={{ paddingBottom: u(10), color: on ? "#fafafa" : "#71717a" }}>{l}{on && <div className="absolute bottom-[-1px] left-0 right-0 bg-lime-400" style={{ height: u(3) }} />}</div>;
      })}
    </B>
    {CHIPS.map(([l, x, w], i) => {
      const on = picked && i === 2;
      return (
        <B key={l} x={x} y={780} w={w} h={44} className="flex items-center justify-center rounded-[1.4cqw] font-bold"
          style={{ fontSize: u(15), background: on ? LIME : "#27272a", color: on ? "#09090b" : "#fafafa", ...rise(st(e, i + 3)), ...(i === 2 && t > 0.15 ? { transform: `scale(${1 + bump(t, 0.205, 0.02) * 0.15})` } : {}) }}>{l}</B>
      );
    })}
    <B x={28} y={846} w={424} className="text-zinc-300" style={{ fontSize: u(16) }}>{typed("Used for: Squat (Barbell), Front Squat (Barbell)", t, 0.24, 0.36)}</B>
    <Nav on={0} e={e} />
  </>;
}


const FRIENDS: [string, string, string][] = [["Hafiz R.", "u2", "Push day · just now"], ["Jun Wei", "u3", "Legs · 25 min"], ["Mei Ling", "u5", "Cardio · 10 min"]];
const SUGGEST: [string, string, string][] = [["Priya S.", "u4", "Follows you · Business"], ["Aiman Z.", "u6", "Computing · trains evenings"]];

function Friends({ t, e }: { t: number; e: number }) {
  const banner = io(clamp((t - 0.12) / 0.05)) * (1 - smooth(0.24, 0.28, t));
  const add = io(clamp((t - 0.25) / 0.08)), here = t > 0.27 ? 3 : 2, following = t > 0.5;
  const sy = 346 + 84 * (2 + add) + 16; // the suggestions follow the list down as it grows
  return <>
    <Head e={e} icon="crowd" title="Friends" sub="Who's training right now" />
    <B x={24} y={140} w={432} h={150} className={CARD} style={{ padding: u(20), ...rise(st(e, 1)) }}>
      <div className="flex items-center justify-between">
        <p className="font-bold" style={{ fontSize: u(20) }}>In the SweatZone now</p>
        <span className="flex items-center font-bold text-lime-400" style={{ gap: u(6), fontSize: u(14) }}><span className="animate-ping rounded-full bg-lime-400" style={{ width: u(8), height: u(8) }} />LIVE</span>
      </div>
      <div className="flex items-center" style={{ marginTop: u(16), gap: u(14) }}>
        <div className="flex">
          {FRIENDS.map(([n, av], i) => (i > 0 || add > 0) && (
            <img key={n} src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800 ring-2 ring-zinc-900"
              style={{ width: u(52), height: u(52), marginLeft: i && add > 0 ? u(-14) : i === 2 ? u(-14) : 0, transform: i === 0 ? `scale(${back((t - 0.25) / 0.08)})` : undefined }} />
          ))}
        </div>
        <p className="font-black tabular-nums" style={{ fontSize: u(40), transform: `scale(${1 + bump(t, 0.28, 0.04) * 0.25})` }}>{here}<span className="font-semibold text-zinc-400" style={{ fontSize: u(18) }}> friends training</span></p>
      </div>
    </B>
    <B x={28} y={312} className="font-bold" style={{ fontSize: u(18), ...rise(st(e, 2)) }}>Training now</B>
    {FRIENDS.map(([n, av, what], i) => {
      const y = 346 + (i === 0 ? 0 : 84 * add + (i - 1) * 84), v = i === 0 ? add : st(e, i + 2);
      return v > 0.01 && (
        <B key={n} x={24} y={y} w={432} h={76} className={`${CARD} flex items-center`}
          style={{ padding: `0 ${u(14)}`, gap: u(14), opacity: v, transform: `translateX(${((1 - v) * -8).toFixed(2)}cqw)`, ...(i === 0 ? { background: `rgba(163,230,53,${0.08 + bump(t, 0.32, 0.06) * 0.3})` } : {}) }}>
          <div className="relative"><img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u(50), height: u(50) }} />
            <span className="absolute bottom-0 right-0 rounded-full bg-lime-400 ring-2 ring-zinc-900" style={{ width: u(14), height: u(14) }} /></div>
          <div className="flex-1"><p className="font-bold" style={{ fontSize: u(18) }}>{n}</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>{what}</p></div>
          <span className="font-semibold text-lime-400" style={{ fontSize: u(14) }}>{i === 0 ? "Just in" : "Training"}</span>
        </B>
      );
    })}
    <B x={28} y={sy} className="font-bold" style={{ fontSize: u(18), ...rise(st(e, 5)) }}>People you may know</B>
    {SUGGEST.map(([n, av, what], i) => {
      const on = following && i === 0;
      return (
        <B key={n} x={24} y={sy + 36 + i * 84} w={432} h={76} className="flex items-center border-b border-white/5" style={{ padding: `0 ${u(8)}`, gap: u(14), ...rise(st(e, 6 + i)) }}>
          <img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u(50), height: u(50) }} />
          <div className="flex-1"><p className="font-bold" style={{ fontSize: u(18) }}>{n}</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>{what}</p></div>
          <div className="flex items-center justify-center rounded-[1.4cqw] font-bold"
            style={{ width: u(112), height: u(40), fontSize: u(15), background: on ? "#27272a" : LIME, color: on ? LIME : "#09090b", transform: i === 0 ? `scale(${1 - bump(t, 0.5, 0.015) * 0.1})` : undefined }}>
            {on ? "Following ✓" : i === 0 ? "Follow back" : "Follow"}
          </div>
        </B>
      );
    })}
    <Nav on={0} e={e} />
    {banner > 0.01 && (
      <B x={16} y={52} w={448} h={84} className="z-20 flex items-center rounded-[3cqw] bg-zinc-800/95 shadow-2xl ring-1 ring-white/10"
        style={{ padding: `0 ${u(16)}`, gap: u(14), opacity: clamp(banner * 2), transform: `translateY(${((1 - banner) * -30).toFixed(2)}cqw)` }}>
        <img src="/avatars/u2.webp" alt="" className="rounded-full bg-zinc-700" style={{ width: u(52), height: u(52) }} />
        <div className="flex-1"><p className="font-bold" style={{ fontSize: u(18) }}>Hafiz R. just clocked in 💪</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>SweatZone · now</p></div>
        <Icon n="bell" s={34} />
      </B>
    )}
  </>;
}

const COMMENTS: [string, string, string][] = [["Jun Wei", "u3", "monster 😤"], ["Mei Ling", "u5", "teach me your ways"]];
const MINE = "Beast mode 🔥 see you at 6?";

function Feed({ t, e }: { t: number; e: number }) {
  const liked = t > 0.18, likes = 23 + (liked ? 1 : 0), sheet = io(clamp((t - 0.3) / 0.07));
  const typing = t > 0.35 && t < 0.55, sent = t > 0.55, msg = t < 0.35 || sent ? "" : typed(MINE, t, 0.37, 0.5), reply = smooth(0.68, 0.72, t);
  return <>
    <Head e={e} icon="feed" title="Feed" sub="Your friends' latest sessions" />
    <B x={24} y={130} w={432} h={450} className={CARD} style={{ padding: u(20), ...rise(st(e, 1)) }}>
      <div className="flex items-center" style={{ gap: u(12) }}>
        <img src="/avatars/u1.webp" alt="" className="rounded-full bg-zinc-800" style={{ width: u(52), height: u(52) }} />
        <div className="flex-1"><p className="font-bold" style={{ fontSize: u(19) }}>Daniel K.</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>Push day · 52 min · 2h ago</p></div>
      </div>
      <div className="flex items-center rounded-[2cqw] bg-lime-400/15 font-black text-lime-300" style={{ marginTop: u(16), padding: `${u(12)} ${u(16)}`, fontSize: u(19), gap: u(10) }}>🏆 New PR · Bench Press 100 kg</div>
      <div className="grid grid-cols-3 text-center" style={{ marginTop: u(16) }}>
        {[["6,420 kg", "Volume"], ["18", "Sets"], ["52 m", "Time"]].map(([v, l]) => (
          <div key={l}><p className="font-black tabular-nums" style={{ fontSize: u(22) }}>{v}</p><p className="text-zinc-400" style={{ fontSize: u(13) }}>{l}</p></div>
        ))}
      </div>
      {[["Bench Press (Barbell)", "5 × 100 kg"], ["Incline Press (Dumbbell)", "3 × 32 kg"], ["Cable Crossover", "3 × 20 kg"]].map(([n, v]) => (
        <div key={n} className="flex justify-between border-b border-white/5" style={{ fontSize: u(16), padding: `${u(10)} 0` }}><span>{n}</span><span className="text-zinc-400 tabular-nums">{v}</span></div>
      ))}
    </B>
    {/* like and comment, under the post */}
    <B x={40} y={530} w={100} h={44} className="flex items-center justify-center rounded-full font-bold"
      style={{ gap: u(8), fontSize: u(17), background: liked ? "rgba(244,63,94,.18)" : "#27272a", color: liked ? "#fb7185" : "#fafafa", transform: `scale(${1 + bump(t, 0.185, 0.02) * 0.35})`, ...rise(st(e, 2)) }}>
      {liked ? "♥" : "♡"} <span className="tabular-nums">{likes}</span>
    </B>
    <B x={150} y={530} w={100} h={44} className="flex items-center justify-center rounded-full bg-zinc-800 font-bold" style={{ gap: u(8), fontSize: u(17), ...rise(st(e, 2)) }}>💬 <span className="tabular-nums">{2 + (sent ? 1 : 0) + (reply > 0.5 ? 1 : 0)}</span></B>
    {liked && t < 0.32 && Array.from({ length: 7 }, (_, i) => { // hearts float up off the button
      const k = clamp((t - 0.18 - i * 0.008) / 0.12);
      return <span key={i} className="absolute z-20 text-rose-400" style={{ left: u(80 + Math.sin(i * 2.1) * 40), top: u(530 - k * 160 - i * 6), fontSize: u(18 + (i % 3) * 6), opacity: (1 - k) * clamp(k * 6) }}>♥</span>;
    })}
    <B x={24} y={600} w={432} h={300} className={CARD} style={{ padding: u(20), ...rise(st(e, 3)) }}>
      <div className="flex items-center" style={{ gap: u(12) }}>
        <img src="/avatars/u5.webp" alt="" className="rounded-full bg-zinc-800" style={{ width: u(52), height: u(52) }} />
        <div className="flex-1"><p className="font-bold" style={{ fontSize: u(19) }}>Mei Ling</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>Legs · 61 min · 5h ago</p></div>
      </div>
    </B>
    <Nav on={4} e={e} />

    {sheet > 0 && (
      <B x={0} y={520 + (1 - sheet) * 549} w={480} h={549} className="z-10 rounded-t-[4cqw] bg-zinc-900 shadow-[0_-20px_60px_rgba(0,0,0,.7)] ring-1 ring-white/10">
        <B x={210} y={12} w={60} h={6} className="rounded-full bg-zinc-700" />
        <B x={28} y={32} className="font-black" style={{ fontSize: u(24) }}>Comments</B>
        {[...COMMENTS, ...(sent ? [["You", "default-2", MINE]] : []), ...(reply > 0 ? [["Daniel K.", "u1", "bet 💪 6 sharp"]] : [])].map(([n, av, c], i) => {
          const v = i === 2 ? back((t - 0.55) / 0.06) : i === 3 ? reply : 1;
          return (
            <B key={n + i} x={24} y={84 + i * 74} w={432} className="flex items-start" style={{ gap: u(12), opacity: clamp(v * 2), transform: `scale(${0.9 + 0.1 * v})`, transformOrigin: "left center" }}>
              <img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u(44), height: u(44) }} />
              <div className="rounded-[2cqw]" style={{ background: n === "You" ? "rgba(163,230,53,.15)" : "#27272a", padding: `${u(8)} ${u(14)}` }}>
                <p className="font-bold" style={{ fontSize: u(14), color: n === "You" ? LIME : "#a1a1aa" }}>{n}</p><p style={{ fontSize: u(17) }}>{c}</p>
              </div>
            </B>
          );
        })}
        <B x={24} y={380} w={360} h={52} className="flex items-center rounded-full bg-zinc-800"
          style={{ padding: `0 ${u(18)}`, fontSize: u(17), boxShadow: typing ? `inset 0 0 0 ${u(2)} ${LIME}` : undefined }}>
          {msg || <span className="text-zinc-500">Add a comment...</span>}{typing && <Caret />}
        </B>
        <B x={396} y={380} w={60} h={52} className="flex items-center justify-center rounded-full bg-lime-400 font-black text-zinc-950" style={{ fontSize: u(22), transform: `scale(${1 - bump(t, 0.55, 0.015) * 0.15})` }}>↑</B>
      </B>
    )}
  </>;
}

// ================================================== scenes ===========================================================
type Play = { cursor: number[][]; clicks: number[]; flashes: number[]; cam?: { z: number[]; x: number[]; y: number[] }; pops?: ReactNode };
/** art floating around the phone: src, x and y (% of the view, desktop), size (vmin), depth (> 1 in front, moves more), turn */
type Float = [string, number, number, number, number, number];
/** a scene's colour: dark, the signature lime, or white */
type Theme = "dark" | "lime" | "white";
const THEME: Record<Theme, { bg: string; fg: string; sub: string; flash: string }> = {
  dark: { bg: "#09090b", fg: "#fafafa", sub: "#a1a1aa", flash: LIME },
  lime: { bg: LIME, fg: "#09090b", sub: "#1a2e05", flash: "#fafafa" },
  white: { bg: "#f4f4f5", fg: "#09090b", sub: "#52525b", flash: LIME },
};
/** a dataset we built ourselves: how many, what it is, a strip of its art */
type Data = { n: number; tag?: string; what: string; imgs?: string[] };
const EX = ["barbell-bench-press", "pull-up", "dumbbell-curl", "kettlebell-swing", "goblet-squat", "lat-pulldown", "push-up", "romanian-deadlift", "cable-crossover", "leg-press", "hip-thrust", "dumbbell-shoulder-press", "plank", "burpee"].map((x) => `/exercises/${x}.webp`);
const FOOD = ["nasi-lemak-fried-chicken", "chicken-briyani", "roti-canai-dhal", "char-kuey-teow", "chicken-mandi", "chicken-katsu-don", "teh-tarik", "mee-goreng-mamak", "tandoori-chicken-naan", "kaya-toast-2-half-boiled-eggs", "fish-chips", "ayam-penyet"].map((x) => `/food/${x}.webp`);
/** typing? / counting?: when the screen types or a number counts up (its own time 0..1, matching the typed() / smooth() count-ups
 * in its Screen, pop-outs and dataset counter), for the video's sound effects */
type Scene = { word: [string, string]; theme: Theme; text: string; data?: Data; points?: string[]; typing?: [number, number][]; counting?: [number, number][]; floats: Float[]; Screen: (p: { t: number; e: number }) => ReactNode; play: (t: number, wide: boolean) => Play };

const scenes: Scene[] = [
  {
    word: ["Skip the", "queue."], theme: "dark", text: "Scan the QR at the door to clock in, and see how packed the SweatZone is before you walk over.",
    floats: [["/hero/props/kettlebell.webp", 91, 20, 17, 1.4, -12], ["/icons/qr.webp", 52, 80, 10, 0.7, 10], ["/icons/crowd.webp", 96, 76, 11, 1.2, -8], ["/icons/gym.webp", 57, 14, 8, 0.6, 6]],
    Screen: Home, counting: [[0.6, 0.7]], // the crowd peak in the pop-out
    play: (t, wide) => ({
      cursor: [[0, 520, 900], [0.1, 400, 600], [0.2, 240, 289], [0.36, 240, 289], [0.48, 110, 440], [0.56, 110, 440], [0.68, 200, 700], [1, 200, 700]],
      clicks: [0.23, 0.52, 0.72], flashes: [0.34],
      cam: { z: [0.08, 1, 0.2, 1.5, 0.3, 1.5, 0.4, 1], x: [0, 240], y: [0, 289] },
      pops: <>
        <Pop s={pop(t, 0.52)} from={at(240, 480)} to={[9, 32]} wide={wide} glow={LIME} tilt={-8}>
          <PopTitle c={LIME}>Crowd today</PopTitle>
          <svg viewBox="0 0 330 130" style={{ width: u(330), marginTop: u(10) }}>
            <defs><linearGradient id="hc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={LIME} stopOpacity=".5" /><stop offset="1" stopColor={LIME} stopOpacity="0" /></linearGradient>
              <clipPath id="hcc"><rect width={330 * smooth(0.54, 0.68, t)} height="130" /></clipPath></defs>
            <g clipPath="url(#hcc)">
              <path d={`M0 130 ${CROWD.map((v, i) => `L${i * 30} ${125 - v * 1.9}`).join(" ")} L330 130Z`} fill="url(#hc)" />
              <path d={`M0 ${125 - CROWD[0] * 1.9} ${CROWD.map((v, i) => `L${i * 30} ${125 - v * 1.9}`).join(" ")}`} fill="none" stroke={LIME} strokeWidth="3" strokeLinejoin="round" />
            </g>
            <circle cx={270} cy={125 - 58 * 1.9} r={5 + Math.sin(t * 80) * 1.5} fill="#ef4444" opacity={smooth(0.66, 0.7, t)} />
          </svg>
          <p className="font-bold" style={{ fontSize: u(19), marginTop: u(8) }}>Peak at 18:00 · <span className="text-red-400">{Math.round(58 * smooth(0.6, 0.7, t))} people</span></p>
        </Pop>
        <Pop s={pop(t, 0.72)} from={at(240, 700)} to={[91, 68]} wide={wide} glow={LIME} tilt={8}>
          <PopTitle c={LIME}>Your day</PopTitle>
          {[["08:30", "Data Structures"], ["11:00", "Cloud Infrastructure"], ["15:00", "IoT Systems"], ["19:30", "Train · quiet hour"]].map(([h, n], i) => (
            <div key={h} className="flex items-center whitespace-nowrap font-semibold" style={{ gap: u(14), marginTop: u(12), fontSize: u(18), ...rise(smooth(0.74 + i * 0.03, 0.78 + i * 0.03, t), 20), color: i === 3 ? LIME : undefined }}>
              <span className="font-mono text-zinc-400" style={{ width: u(64) }}>{h}</span>{n}{i === 3 && " ✓"}
            </div>
          ))}
        </Pop>
      </>,
    }),
  },
  {
    word: ["Train", "together."], theme: "white", text: "See which friends are in the SweatZone right now, follow your classmates and get a ping when your gym buddy clocks in.",
    floats: [["/icons/crowd.webp", 91, 18, 15, 1.4, -10], ["/icons/bell.webp", 52, 82, 10, 0.8, 12], ["/icons/person.webp", 97, 72, 11, 1.2, -6], ["/icons/heart.webp", 57, 12, 8, 0.6, 8]],
    Screen: Friends,
    play: (t, wide) => ({
      cursor: [[0, 520, 900], [0.18, 240, 96], [0.26, 240, 96], [0.44, 386, 688], [0.56, 386, 688], [0.72, 300, 520], [1, 300, 520]],
      clicks: [0.24, 0.5], flashes: [0.24, 0.5],
      cam: { z: [0.12, 1, 0.18, 1.4, 0.3, 1.4, 0.36, 1, 0.42, 1, 0.47, 1.35, 0.6, 1.35, 0.66, 1], x: [0, 240, 0.4, 240, 0.44, 386], y: [0, 120, 0.4, 120, 0.44, 688] },
      pops: <>
        <Pop s={pop(t, 0.62)} from={at(240, 220)} to={[10, 34]} wide={wide} glow={LIME} tilt={-8}>
          <PopTitle c={LIME}>Training now</PopTitle>
          <div className="flex items-center" style={{ marginTop: u(14), gap: u(16) }}>
            <div className="flex">{FRIENDS.map(([n, av], i) => (
              <img key={n} src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800 ring-4 ring-zinc-900" style={{ width: u(84), height: u(84), marginLeft: i ? u(-24) : 0, transform: `scale(${back((t - 0.64 - i * 0.03) / 0.06)})` }} />
            ))}</div>
            <p className="font-black" style={{ fontSize: u(26), lineHeight: 1.1 }}>3 friends<br /><span className="text-lime-400">in the gym</span></p>
          </div>
        </Pop>
        <Pop s={pop(t, 0.74)} from={at(386, 688)} to={[90, 66]} wide={wide} glow={LIME} tilt={8}>
          <div className="flex items-center whitespace-nowrap" style={{ gap: u(18) }}>
            <Icon n="bell" s={56} />
            <div><p className="font-black" style={{ fontSize: u(24) }}>Gym buddy alert</p><p className="text-zinc-400" style={{ fontSize: u(16) }}>Ping me when Hafiz clocks in</p></div>
            <div className="relative rounded-full" style={{ width: u(64), height: u(36), background: t > 0.8 ? LIME : "#3f3f46" }}>
              <div className="absolute rounded-full bg-white" style={{ top: u(4), width: u(28), height: u(28), left: u(4 + 28 * io(clamp((t - 0.8) / 0.04))) }} />
            </div>
          </div>
        </Pop>
      </>,
    }),
  },
  {
    word: ["Lift", "more."], theme: "lime",
    data: { n: 450, what: "exercises in our own dataset, built from scratch: every move written up and illustrated for Spotter.", imgs: EX }, text: "Routines, rest timers and every set logged. PRs land with a bang and your progress keeps climbing.",
    floats: [["/hero/props/dumbbell.webp", 90, 16, 24, 1.5, -20], ["/hero/props/plate.webp", 52, 82, 17, 0.8, 25], ["/icons/flame.webp", 97, 64, 9, 1.2, 10], ["/icons/stopwatch.webp", 57, 12, 8, 0.6, -10]],
    Screen: Train, typing: [[0.33, 0.41], [0.47, 0.49]], // the weight, then the reps
    counting: [[0.16, 0.4], [0.62, 0.7]], // the 450 dataset counter, the PR
    play: (t, wide) => {
      const secs = Math.round(90 - clamp((t - 0.72) / 0.24) * 45);
      return {
        cursor: [[0, 520, 900], [0.14, 378, 356], [0.2, 378, 356], [0.3, 170, 544], [0.44, 170, 544], [0.46, 317, 544], [0.52, 317, 544], [0.55, 423, 544], [0.64, 423, 544], [0.78, 300, 800], [1, 300, 800]],
        clicks: [0.18, 0.32, 0.46, 0.56], flashes: [0.57],
        cam: { z: [0.22, 1, 0.3, 1.5, 0.56, 1.5, 0.64, 1], x: [0, 280], y: [0, 544] },
        pops: <>
          <Pop s={pop(t, 0.62)} from={at(423, 544)} to={[90, 24]} wide={wide} glow={LIME} tilt={12}>
            <div className="relative whitespace-nowrap text-center">
              <div className="absolute inset-[-90%] opacity-50" style={{ background: `repeating-conic-gradient(from ${t * 500}deg, #a3e63555 0 6deg, transparent 6deg 18deg)` }} />
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2, r = smooth(0.62, 0.74, t) * 46;
                return <span key={i} className="absolute left-1/2 top-1/2 rounded-sm" style={{ width: u(10), height: u(16), background: ["#a3e635", "#fafafa"][i % 2], transform: `translate(${Math.cos(a) * r}cqw, ${Math.sin(a) * r * 0.7}cqw) rotate(${t * 900 + i * 40}deg)`, opacity: 1 - smooth(0.7, 0.8, t) }} />;
              })}
              <div className="relative">
                <PopTitle c={LIME}>New PR</PopTitle>
                <p className="font-black tabular-nums text-lime-400" style={{ fontSize: u(84), lineHeight: 1.05 }}>{(72.5 * smooth(0.62, 0.7, t)).toFixed(1)} kg</p>
                <p className="font-bold text-zinc-300" style={{ fontSize: u(20) }}>Bench Press · +2.5 kg</p>
              </div>
            </div>
          </Pop>
          <Pop s={pop(t, 0.7)} from={at(240, 400)} to={[90, 72]} wide={wide} glow={LIME} tilt={-10}>
            <div className="flex items-center" style={{ gap: u(20) }}>
              <Ring v={secs / 90} c={LIME} size={110} w={4}><span style={{ fontSize: u(28) }}>⏱</span></Ring>
              <div><PopTitle c={LIME}>Rest</PopTitle><p className="font-mono font-black tabular-nums" style={{ fontSize: u(56) }}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p></div>
            </div>
          </Pop>
          <Pop s={pop(t, 0.78)} from={at(240, 560)} to={[11, 36]} wide={wide} glow={LIME} tilt={-6}>
            <PopTitle c={LIME}>Muscles worked</PopTitle>
            <div style={{ width: u(380), marginTop: u(6) }}><MuscleModel hit={worked(t)} /></div>
            {([["Chest", 0.8], ["Triceps", 0.84], ["Shoulders", 0.86]] as const).map(([m, a0], i) => (
              <div key={m} className="flex items-center font-semibold" style={{ gap: u(12), fontSize: u(16), marginTop: u(8) }}>
                <span style={{ width: u(96) }}>{m}</span>
                <div className="flex-1"><Bar v={smooth(a0, a0 + 0.08, t) * [1, 0.6, 0.5][i]} c={LIME} h={8} /></div>
              </div>
            ))}
          </Pop>
        </>,
      };
    },
  },
  {
    word: ["Hype the", "squad."], theme: "dark", text: "Share your sessions, like and comment on your friends' PRs, and keep each other coming back.",
    floats: [["/icons/heart.webp", 91, 18, 15, 1.4, -10], ["/icons/comment.webp", 52, 82, 11, 0.8, 12], ["/icons/flame.webp", 97, 72, 11, 1.2, -6], ["/icons/share.webp", 57, 12, 8, 0.6, 8]],
    Screen: Feed, typing: [[0.37, 0.5]], // the comment
    counting: [[0.77, 0.86]], // the streak
    play: (t, wide) => ({
      cursor: [[0, 520, 900], [0.14, 90, 552], [0.2, 90, 552], [0.27, 200, 552], [0.31, 200, 552], [0.35, 200, 926], [0.5, 200, 926], [0.53, 426, 926], [0.58, 426, 926], [0.75, 300, 450], [1, 300, 450]],
      clicks: [0.18, 0.3, 0.355, 0.55], flashes: [0.18, 0.55],
      cam: { z: [0.1, 1, 0.16, 1.4, 0.26, 1.4, 0.32, 1, 0.35, 1, 0.4, 1.35, 0.6, 1.35, 0.68, 1], x: [0, 140, 0.33, 140, 0.37, 240], y: [0, 552, 0.33, 552, 0.37, 860] },
      pops: <>
        <Pop s={pop(t, 0.62)} from={at(140, 552)} to={[10, 34]} wide={wide} glow={LIME} tilt={-8}>
          <PopTitle c={LIME}>Notifications</PopTitle>
          {([["u1", "Daniel K. and 23 others liked your PR", "♥"], ["u2", "Hafiz R.: let's goooo 🔥", "💬"], ["u3", "Jun Wei started following you", "＋"]] as const).map(([av, txt, ic], i) => (
            <div key={txt} className="flex items-center" style={{ gap: u(12), marginTop: u(12), width: u(400), ...rise(smooth(0.64 + i * 0.03, 0.68 + i * 0.03, t), 20) }}>
              <img src={`/avatars/${av}.webp`} alt="" className="rounded-full bg-zinc-800" style={{ width: u(44), height: u(44) }} />
              <p className="flex-1 font-semibold" style={{ fontSize: u(16) }}>{txt}</p><span className="text-rose-400" style={{ fontSize: u(20) }}>{ic}</span>
            </div>
          ))}
        </Pop>
        <Pop s={pop(t, 0.76)} from={at(240, 860)} to={[90, 66]} wide={wide} glow={LIME} tilt={8}>
          <div className="text-center">
            <p className="font-black" style={{ fontSize: u(54), lineHeight: 1 }}>🔥 {Math.round(12 * smooth(0.77, 0.86, t))}</p>
            <p className="font-bold text-zinc-300" style={{ fontSize: u(18) }}>day streak with your squad</p>
            <div className="flex justify-center" style={{ gap: u(8), marginTop: u(12) }}>
              {Array.from({ length: 7 }, (_, i) => <span key={i} className="rounded-full" style={{ width: u(22), height: u(22), background: t > 0.78 + i * 0.015 ? LIME : "#3f3f46" }} />)}
            </div>
          </div>
        </Pop>
      </>,
    }),
  },
  {
    word: ["Eat", "smart."], theme: "lime",
    data: { n: 43, what: "dishes from the 9 APU cafeteria stalls: our own food dataset, with macros and art made for the real menu.", imgs: FOOD }, text: "Every dish in the APU cafeteria with its macros, counted against a target tuned to your goal.",
    floats: [["/hero/props/nasi-lemak-fried-chicken.webp", 92, 19, 19, 1.4, 8], ["/hero/props/teh-tarik.webp", 52, 83, 12, 0.8, -10], ["/hero/props/roti-canai-dhal.webp", 97, 74, 14, 1.2, 12], ["/icons/protein.webp", 57, 13, 8, 0.6, 0]],
    Screen: Eat, typing: [[0.17, 0.33]], // the search
    counting: [[0, 0.1], [0.16, 0.4], [0.55, 0.78]], // kcal as the screen arrives, the 43 dishes, kcal + macros after adding
    play: (t, wide) => ({
      cursor: [[0, 520, 900], [0.12, 200, 426], [0.16, 200, 426], [0.36, 320, 480], [0.45, 422, 518], [0.55, 422, 518], [0.66, 240, 260], [1, 240, 260]],
      clicks: [0.15, 0.5], flashes: [0.5],
      cam: { z: [0.08, 1, 0.16, 1.5, 0.48, 1.5, 0.56, 1], x: [0.34, 200, 0.44, 380], y: [0.34, 426, 0.44, 500] },
      pops: <>
        <Pop s={pop(t, 0.6)} from={at(422, 518)} to={[9, 34]} wide={wide} glow={LIME} tilt={-10}>
          <PopTitle c={LIME}>Nasi lemak + fried chicken</PopTitle>
          <p className="font-black tabular-nums" style={{ fontSize: u(68), lineHeight: 1.1 }}>{Math.round(780 * smooth(0.61, 0.7, t))}<span style={{ fontSize: u(26) }}> kcal</span></p>
          <div className="flex" style={{ gap: u(16), marginTop: u(8) }}>
            {([["Protein", 32, 60, "#38bdf8"], ["Carbs", 85, 120, "#fb923c"], ["Fat", 34, 60, "#f472b6"]] as const).map(([l, g, m, c], i) => {
              const v = smooth(0.62 + i * 0.03, 0.72 + i * 0.03, t);
              return <div key={l} className="flex flex-col items-center"><Ring v={(g / m) * v} c={c} size={92} w={5}><span className="font-black tabular-nums" style={{ fontSize: u(20) }}>{Math.round(g * v)}g</span></Ring><span className="text-zinc-400" style={{ fontSize: u(14), marginTop: u(4) }}>{l}</span></div>;
            })}
          </div>
        </Pop>
        <Pop s={pop(t, 0.74)} from={at(240, 290)} to={[91, 68]} wide={wide} glow={LIME} tilt={10}>
          <PopTitle c={LIME}>Today</PopTitle>
          {([["09:00", "Kaya toast + eggs", "kaya-toast-2-half-boiled-eggs", 420], ["13:00", "Chicken briyani", "chicken-briyani", 850], ["17:45", "Nasi lemak", "nasi-lemak-fried-chicken", 780]] as const).map(([h, n, img, k], i) => (
            <div key={h} className="flex items-center" style={{ gap: u(12), marginTop: u(12), ...rise(smooth(0.76 + i * 0.03, 0.8 + i * 0.03, t), 20) }}>
              <img src={`/food/${img}.webp`} alt="" className="rounded-[1.4cqw]" style={{ width: u(48), height: u(48) }} />
              <div style={{ width: u(220) }}><p className="font-bold" style={{ fontSize: u(17), color: i === 2 ? LIME : undefined }}>{n}</p><p className="text-zinc-400" style={{ fontSize: u(14) }}>{h} · {k} kcal</p></div>
            </div>
          ))}
        </Pop>
      </>,
    }),
  },
  {
    word: ["Climb the", "ranks."], theme: "white", text: "Students can finally compete: live leaderboards by lift, faculty and bodyweight class. The heaviest lift wins, not the most reps.",
    points: ["Every APU lifter on one leaderboard", "APU keeps records to pick competition athletes", "More representation and reach for students"],
    floats: [["/hero/props/trophy.webp", 91, 18, 19, 1.4, -8], ["/icons/medal.webp", 52, 82, 11, 0.8, 12], ["/icons/ranks.webp", 97, 70, 10, 1.2, -6], ["/icons/p4p.webp", 57, 12, 8, 0.6, 0]],
    Screen: Ranks, counting: [[0, 0.12], [0.45, 0.74]], // scores as the screen arrives, podium + the climb to #4
    play: (t, wide) => {
      const rank = t < 0.5 ? 11 : Math.round(tr(t, 0.52, 11, 0.74, 4));
      return {
        cursor: [[0, 520, 900], [0.13, 240, 340], [0.19, 240, 340], [0.42, 240, 556], [0.55, 240, 556], [0.7, 380, 800], [1, 380, 800]],
        clicks: [0.17, 0.45], flashes: [0.17, 0.75],
        cam: { z: [0.06, 1, 0.14, 1.4, 0.3, 1.4, 0.38, 1, 0.42, 1, 0.48, 1.35, 0.7, 1.35, 0.78, 1], x: [0, 240], y: [0, 400, 0.4, 400, 0.44, 556] },
        pops: <>
          <Pop s={pop(t, 0.36)} from={at(240, 400)} to={[10, 30]} wide={wide} glow={LIME} tilt={-8}>
            <PopTitle c={LIME}>SBD total · this month</PopTitle>
            <div className="relative" style={{ width: u(360), height: u(200), marginTop: u(10) }}><Podium t0={0.37} t={t} big={0.75} /></div>
          </Pop>
          <Pop s={pop(t, 0.5)} from={at(240, 556)} to={[90, 64]} wide={wide} glow={LIME} tilt={10}>
            <div className="text-center" style={{ padding: `0 ${u(20)}` }}>
              <PopTitle c={LIME}>Your rank</PopTitle>
              <p className="font-black tabular-nums" style={{ fontSize: u(120), lineHeight: 1, color: rank <= 4 ? "#fde047" : "#fafafa", transform: `scale(${1 + bump(t, 0.75, 0.04) * 0.35})` }}>#{rank}</p>
              <p className="whitespace-nowrap font-black text-lime-400" style={{ fontSize: u(22), ...rise(smooth(0.74, 0.78, t)) }}>▲ 7 places this week</p>
            </div>
          </Pop>
        </>,
      };
    },
  },
  {
    word: ["Find", "anything."], theme: "dark",
    data: { n: equipment.length, tag: "The whole APU SweatZone", what: "machines, racks and benches, every one modelled and placed exactly where it stands on the SweatZone floor." }, text: "The entire APU SweatZone, modelled in 3D, wall to wall. Every exercise points you to the machine that does it.",
    floats: [["/icons/map.webp", 91, 17, 13, 1.4, -8], ["/icons/target.webp", 52, 82, 10, 0.8, 10], ["/hero/props/plate.webp", 97, 72, 14, 1.2, 20], ["/icons/building.webp", 57, 12, 8, 0.6, 0]],
    Screen: MapScreen, typing: [[0.24, 0.36]], // "Used for: ..."
    counting: [[0.16, 0.4]], // the 34 machines
    play: (t, wide) => ({
      cursor: [[0, 520, 900], [0.15, 318, 802], [0.23, 318, 802], [0.4, 250, 440], [1, 250, 440]],
      clicks: [0.2], flashes: [0.2],
      cam: { z: [0.06, 1, 0.15, 1.4, 0.24, 1.4, 0.34, 1.5, 0.5, 1.5, 0.58, 1], x: [0.24, 318, 0.34, 240], y: [0.24, 802, 0.34, 440] },
      pops: <>
        <Pop s={pop(t, 0.58)} from={at(240, 440)} to={[10, 40]} wide={wide} glow={LIME} tilt={-10}>
          <PopTitle c={LIME}>Route from the door</PopTitle>
          <svg viewBox={floor.viewBox} style={{ width: u(230), marginTop: u(10) }}>
            <polygon points={floor.outline} fill="#18181b" stroke="#52525b" strokeWidth="6" pathLength={1} strokeDasharray={`${smooth(0.59, 0.66, t)} 1`} />
            {equipment.map((q, i) => (
              <rect key={q.id} x={q.x} y={q.y} width={q.w} height={q.h} rx="6" fill={q.id === "rack" ? LIME : "#3f3f46"}
                opacity={smooth(0.6 + (i / equipment.length) * 0.08, 0.62 + (i / equipment.length) * 0.08, t)} />
            ))}
            <rect x={floor.door[0] - 6} y={floor.door[1]} width={floor.door[2] + 6} height={floor.door[3]} fill="#fafafa" />
            <polyline points="600,1010 460,1010 460,330 300,330 300,305" fill="none" stroke="#fafafa" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${smooth(0.67, 0.78, t)} 1`} />
            <circle cx="300" cy={265 - Math.abs(Math.sin(t * 60)) * 20} r="16" fill={LIME} opacity={smooth(0.77, 0.79, t)} />
          </svg>
        </Pop>
        <Pop s={pop(t, 0.7)} from={at(318, 802)} to={[90, 66]} wide={wide} glow={LIME} tilt={10}>
          <PopTitle c={LIME}>📍 Benches &amp; racks</PopTitle>
          <p className="font-black" style={{ fontSize: u(46), lineHeight: 1.15 }}>Squat Rack</p>
          <div className="flex flex-wrap" style={{ gap: u(8), marginTop: u(10), width: u(320) }}>
            {["Squat (Barbell)", "Front Squat (Barbell)", "Box Squat"].map((x, i) => (
              <span key={x} className="rounded-full bg-lime-400/15 font-semibold text-lime-300" style={{ padding: `${u(6)} ${u(14)}`, fontSize: u(15), ...rise(smooth(0.73 + i * 0.03, 0.77 + i * 0.03, t), 15) }}>{x}</span>
            ))}
          </div>
        </Pop>
      </>,
    }),
  },
];
const N = scenes.length;
const L = 2.5; // screens of scrolling per scene (more = slower)
const O = 1.6; // screens of scrolling for the outro (the logo on grey, then fading into the page)
const U = 1 + L * N + O; // scroll units: the intro, the scenes, the outro
/** a still phone showing scene k at its own time t (k = -1: the logo screen the Blender phone wakes up to) */
function PhoneMock({ k, t, style }: { k: number; t: number; style?: CSSProperties }) {
  const Screen = k >= 0 ? scenes[k].Screen : null;
  return (
    <div className="absolute aspect-[390/844] [container-type:inline-size]" style={style}>
      <div className="relative h-full rounded-[13%/6%] bg-zinc-800 p-[2.6%] shadow-2xl shadow-black/70 ring-1 ring-white/20">
        <div className="relative h-full overflow-hidden rounded-[11%/5.2%] bg-zinc-950 text-zinc-50">
          {Screen ? <Screen t={t} e={1} /> : <img src="/video/screen.png" alt="" className="absolute inset-0 h-full w-full object-fill" />}
          <div className="absolute left-1/2 top-[1.3%] z-50 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    </div>
  );
}
// The video's hand-off (0..1): phones slide out from behind the main one (EMERGE), the row whips left and eases onto the
// home-screen phone (SWIPE), which becomes the main phone again and snaps right (SNAP).
// ROW: [scene or -1 for the logo screen, its time], slot 0 = the main phone; the last slot (home) is where it lands.
// LAND is the home phone it lands on; the ones after it are just there so the row runs on past the middle.
const ROW: [number, number][] = [[3, 0.6], [5, 0.8], [-1, 0], [1, 0.4], [2, 0.62], [3, 0.6], [4, 0.7], [5, 0.8], [0, 0], [1, 0.4], [4, 0.7], [2, 0.62]];
const ROW0 = 2, LAND = 8, LEAVE = 0.22, EMERGE = [0.03, 0.25], SWIPE = [0.27, 0.62], SNAP = [0.64, 0.92];
/** the hand-off's beats (0..1 of it), for the video page's cursor */
export const HANDOFF = { emerged: EMERGE[1], swipe: SWIPE[0], landed: SWIPE[1] };
/** the hero's timeline in scroll units, for driving it from a clock (the /video page) */
export const HERO = { scenes: N, intro: 1, scene: L, outro: O, total: U };
/** each scene's big moments (clicks and flashes) in its own time 0..1, so a video can land them on the beat */
/** every stretch of typing per scene (its own time 0..1): the headline typing itself, then whatever the screen types */
export const heroTyping = () => scenes.map((s) => [[0, 0.12] as [number, number], ...(s.typing ?? [])]);
/** every cursor click per scene (its own time 0..1), for the video's click sound */
/** every count-up per scene (its own time 0..1) */
export const heroCounting = () => scenes.map((s) => s.counting ?? []);
export const heroClicks = () => scenes.map((s) => s.play(0.5, true).clicks);
export const heroMoments = () => scenes.map((s) => { const pl = s.play(0.5, true); return [...new Set([...pl.clicks, ...pl.flashes])].sort((a, b) => a - b); });
/** the swipe edge: everything right of x% at the top (slanted 40% across to the bottom) */
const cut = (x: number) => `polygon(${x}% 0, 140% 0, 140% 100%, ${x - 40}% 100%)`;
/** the stripe that leads a swipe: a band just ahead of the edge */
const band = (x: number) => `polygon(${x - 7}% 0, ${x}% 0, ${x - 40}% 100%, ${x - 47}% 100%)`;

/** `progress` (0..HERO.total) drives it from outside instead of the scroll position; `video` drops the scroll hint and the tall
 * section; `beat` (1 on a beat, decaying to 0) gives the phone a kick in time with music; `backdrop` sits behind the phone
 * (the video's Blender shot) and `phoneIn` fades the phone itself. */
export default function HeroScroll({ apk, progress, video = false, beat = 0, backdrop, phoneIn = 1 }: { apk: string; progress?: number; video?: boolean; beat?: number; backdrop?: ReactNode; phoneIn?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [scrolled, setP] = useState(0);
  const p = progress ?? scrolled;
  const [wide, setWide] = useState(false);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = ref.current?.getBoundingClientRect();
      if (r && r.height > innerHeight) setP(clamp(-r.top / (r.height - innerHeight)) * U);
      setWide(innerWidth >= 768);
      setVh(innerHeight);
    };
    const on = () => { raf ||= requestAnimationFrame(read); };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const tk = (k: number) => (p - 1 - L * k) / L; // scene k's own time, 0..1 while it's on
  const ek = (k: number) => (k === 0 ? (video ? 1 : smooth(0.35, 1, p)) : smooth(-0.05, 0.14, tk(k))); // its screen's entrance
  const intro = smooth(0, 0.85, p);
  const cur = clamp(Math.floor((p - 1) / L), 0, N - 1);
  const o = (p - 1 - L * N) / O; // the outro's own time, 0..1
  const swipe = (k: number) => (k ? smooth(-0.1, 0.03, tk(k)) : 1); // how far scene k's colour has swiped across
  const th = THEME[scenes[cur].theme];

  const plays = scenes.map((s, k) => { const t = tk(k); return t > -0.1 && t < 1.05 ? s.play(t, wide) : undefined; });
  const live = plays[cur], t = tk(cur);
  const cx = live ? tr(t, ...live.cursor.flatMap(([a, x]) => [a, x])) : 240, cy = live ? tr(t, ...live.cursor.flatMap(([a, , y]) => [a, y])) : 500;
  const press = live ? Math.max(0, ...live.clicks.map((c) => bump(t, c, 0.015))) : 0;
  const flash = Math.max(0, ...plays.flatMap((pl, k) => (pl ? pl.flashes.map((c) => bump(tk(k), c, 0.02)) : [])), ...scenes.map((_, k) => (k ? bump(tk(k), 0, 0.012) : 0)));
  // the camera: push in on the phone around what the cursor is doing
  const z = 1 + ((live?.cam ? tr(t, ...live.cam.z) : 1) - 1) * (wide ? 1 : 0.25); // gentler on a phone, where the copy sits right above
  const [ox, oy] = at(live?.cam ? tr(t, ...live.cam.x) : 240, live?.cam ? tr(t, ...live.cam.y) : 500);
  const centre = clamp((z - 1) / 0.5) * 0.9;
  const kick = Math.max(live ? Math.max(0, ...live.clicks.map((c) => bump(t, c, 0.03))) : 0, beat * 0.5);

  return (
    <section ref={ref} style={{ height: video ? "100dvh" : `${U * 100}dvh` }} className="relative">
            <div className="sticky top-0 h-dvh overflow-hidden">
        {/* each scene's colour swipes across on a hard diagonal, led by a contrasting stripe */}
        <div className="pointer-events-none absolute inset-0 bg-zinc-950" aria-hidden />
        {scenes.map((s, k) => {
          const r = swipe(k);
          if (!k || r <= 0) return null;
          const a = 140 - r * 200, stripe = s.theme === "lime" ? "#fafafa" : LIME;
          return (
            <div key={s.text} className="pointer-events-none absolute inset-0" aria-hidden>
              <div className="absolute inset-0" style={{ background: stripe, clipPath: band(a) }} />
              <div className="absolute inset-0" style={{ background: THEME[s.theme].bg, clipPath: cut(a) }} />
            </div>
          );
        })}
        <div className="pointer-events-none absolute inset-0 [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" aria-hidden
          style={{ opacity: 0.08, backgroundImage: `linear-gradient(${th.fg} 1px,transparent 1px),linear-gradient(90deg,${th.fg} 1px,transparent 1px)` }} />

        {backdrop}
        {video && wide && p > EMERGE[0] && p < SWIPE[1] + LEAVE && (() => {
          const H = 0.7 * vh, W = (H * 390) / 844, gap = W * 1.12; // phone size and slot spacing, px
          const spread = io(clamp((p - EMERGE[0]) / (EMERGE[1] - EMERGE[0])));
          const x = clamp((p - SWIPE[0]) / (SWIPE[1] - SWIPE[0])), shift = (1 - Math.pow(1 - Math.pow(x, 1.4), 4)) * (LAND - ROW0); // a soft start, fast, then a long ease out
          const leave = io(clamp((p - SWIPE[1]) / LEAVE)); // after landing the others ease out sideways and fade
          const speed = 4 * Math.pow(1 - x, 3) * (x > 0 && x < 1 ? Math.min(1, x * 8) : 0);
          return (
            <div className="pointer-events-none absolute inset-0 z-[9]" style={{ filter: speed > 0.05 ? `blur(${(speed * 1.2).toFixed(2)}px)` : undefined }}>
              {ROW.map(([k, at], i) => {
                const base = (i - ROW0) * spread - shift, slot = base + Math.sign(base) * leave * 1.6, d = Math.min(1, Math.abs(slot));
                if (i === LAND && p >= SWIPE[1]) return null; // the main phone has taken over
                return (
                  <PhoneMock key={i} k={k} t={at} style={{
                    height: H, width: W, left: `calc(50% - ${W / 2}px)`, top: `calc(50% - ${H / 2}px)`,
                    zIndex: 30 - Math.round(Math.abs(i - ROW0 - shift) * 2), // the one nearest the middle on top, so the rest come out from behind it
                    transform: `translateX(${slot * gap}px) scale(${1 - 0.14 * d})`, opacity: (0.6 + 0.4 * (1 - d)) * (1 - leave),
                  }} />
                );
              })}
            </div>
          );
        })()}

        {/* intro headline: zooms past you as you scroll */}
        <div className="absolute inset-x-0 top-[13dvh] z-20 px-4 text-center md:top-[16dvh]"
          style={{ opacity: video ? 0 : 1 - smooth(0, 0.55, p), transform: `scale(${1 + p * 0.5})`, filter: `blur(${smooth(0, 0.6, p) * 12}px)`, pointerEvents: p > 0.3 ? "none" : undefined }}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Built for the APU SweatZone</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.75rem,9vw,7.5rem)] font-bold leading-[0.95] tracking-[-0.05em]">
            Your gym,{" "}
            <span className="text-lime-400">in your pocket.</span>
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#demo" className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-zinc-950 transition active:scale-[0.97]">Try the live demo</a>
            <a href={apk} className="rounded-full bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-[0.97]">Download for Android</a>
          </div>
          {!video && <p className="mt-10 text-sm text-zinc-500 motion-safe:animate-bounce">Scroll ↓</p>}
        </div>

        {/* scene copy: the headline types itself, white with the key word in lime */}
        {scenes.map((s, k) => {
          const t = tk(k), vis = smooth(-0.04, 0.01, t) * (1 - smooth(0.93, 0.99, t));
          if (vis <= 0) return null;
          const c = THEME[s.theme], [w1, w2] = s.word, n = typed(w1 + " " + w2, t, 0, 0.12).length;
          const accent: CSSProperties = s.theme === "dark" ? { color: LIME } : { color: s.theme === "lime" ? LIME : "#09090b", background: s.theme === "lime" ? "#09090b" : LIME, padding: "0 0.12em", boxDecorationBreak: "clone" };
          return (
            <div key={s.text} className="pointer-events-none absolute inset-x-0 top-[8dvh] z-10 px-6 text-center md:inset-x-auto md:left-[max(2rem,calc(50%-36rem))] md:top-1/2 md:w-[min(34rem,42vw)] md:text-left"
              style={{ opacity: vis, color: c.fg, transform: `translateY(${(1 - vis) * -40}px)${wide ? " translateY(-50%)" : ""}` }}>
              <p className="font-mono text-sm font-semibold tracking-[0.2em]" style={{ color: c.sub }}>{String(k + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}{k === N - 1 && <span style={{ color: LIME }}> · APU SweatZone</span>}</p>
              <h2 className="mt-3 pb-2 text-[clamp(2.4rem,6.5vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.05em]">
                {w1.slice(0, n)}{n > w1.length && " "}{n > w1.length + 1 && <span style={accent}>{w2.slice(0, n - w1.length - 1)}</span>}
                <span className="ml-1 inline-block w-[0.06em] animate-pulse" style={{ height: "0.8em", background: s.theme === "dark" ? LIME : "#09090b" }} />
              </h2>
              <div className="grid">
                <p className="mx-auto mt-1 max-w-md text-base [grid-area:1/1] md:mx-0 md:mt-4 md:text-xl" style={{ color: c.sub, opacity: smooth(0.08, 0.16, t) * ((s.data || s.points) && !wide ? 1 - smooth(0.14, 0.2, t) : 1) }}>{s.text}</p>
                {s.data && !wide && ( // on a phone the dataset line takes the paragraph's place
                  <p className="mx-auto mt-1 max-w-md text-base [grid-area:1/1]" style={{ opacity: smooth(0.16, 0.22, t) }}>
                    <b className="text-2xl tabular-nums" style={{ color: s.theme === "dark" ? LIME : c.fg }}>{Math.round(s.data.n * smooth(0.16, 0.4, t))}</b> {s.data.what}
                  </p>
                )}
                {s.points && ( // ticked list, one by one (in the paragraph's place on a phone)
                  <ul className={wide ? "mt-6 space-y-3 [grid-area:2/1]" : "mx-auto mt-1 max-w-md space-y-1.5 text-left text-sm [grid-area:1/1]"}>
                    {s.points.map((x, i) => {
                      const v = smooth(0.16 + i * 0.05, 0.22 + i * 0.05, t);
                      return (
                        <li key={x} className="flex items-start gap-3 font-semibold md:text-lg" style={{ color: c.fg, opacity: v, transform: `translateX(${(1 - v) * -24}px)` }}>
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-sm font-black" style={{ background: s.theme === "dark" ? LIME : "#09090b", color: s.theme === "dark" ? "#09090b" : LIME, transform: `scale(${back((t - 0.16 - i * 0.05) / 0.05)})` }}>✓</span>
                          {x}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {s.data && wide && (() => {
                const v = smooth(0.14, 0.22, t);
                return (
                  <div className="mt-8" style={{ opacity: v, transform: `translateY(${(1 - v) * 20}px)` }}>
                    <div className="flex items-center gap-4">
{!s.data.imgs && (
                      <svg viewBox={floor.viewBox} className="h-24 shrink-0" aria-label="Floor plan of the APU SweatZone">
                        <polygon points={floor.outline} fill="none" stroke={c.fg} strokeOpacity=".8" strokeWidth="8" pathLength={1} strokeDasharray={`${smooth(0.16, 0.3, t)} 1`} />
                        {equipment.map((q, i) => (
                          <rect key={q.id} x={q.x} y={q.y} width={q.w} height={q.h} rx="6" fill={q.id === "rack" && t > 0.2 ? LIME : c.fg} fillOpacity={q.id === "rack" && t > 0.2 ? 1 : 0.55}
                            opacity={smooth(0.2 + (i / equipment.length) * 0.15, 0.23 + (i / equipment.length) * 0.15, t)} />
                        ))}
                        <rect x={floor.door[0] - 6} y={floor.door[1]} width={floor.door[2] + 6} height={floor.door[3]} fill={LIME} opacity={smooth(0.3, 0.34, t)} />
                      </svg>
)}
<div className="flex items-baseline gap-3">
                      <span className="text-6xl font-bold tabular-nums tracking-[-0.04em]" style={{ color: s.theme === "dark" ? LIME : c.fg }}>{Math.round(s.data.n * smooth(0.16, 0.4, t))}</span>
                      <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em]" style={{ background: c.fg, color: c.bg }}>{s.data.tag ?? "Our own dataset"}</span>
                    </div>
                    </div>
                    <p className="mt-2 max-w-sm" style={{ color: c.fg }}>{s.data.what}</p>
                    {s.data.imgs ? (
                    <div className="mt-5 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
                      <div className="flex gap-2" style={{ transform: `translateX(${-t * 520}px)` }}>
                        {[...s.data.imgs!, ...s.data.imgs!].map((src, i) => (
                          <img key={i} src={src} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-zinc-900 object-cover ring-1 ring-black/10"
                            style={{ opacity: smooth(0.16 + i * 0.008, 0.22 + i * 0.008, t), transform: `translateY(${(1 - smooth(0.16 + i * 0.008, 0.22 + i * 0.008, t)) * 16}px)` }} />
                        ))}
                      </div>
                    </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          );
        })}

        {/* the phone */}
        <div className="absolute inset-x-0 bottom-[3dvh] top-[36dvh] z-10 flex items-center justify-center [perspective:1400px] md:inset-y-0 md:left-[40%]">
          <div className="relative aspect-[390/844] h-full max-h-[760px] [container-type:inline-size] md:h-[80dvh]"
            style={{
              // the video picks up from the Blender phone: centred and big, it tilts up to face you, then swipes right into place
              transform: video && wide && p < 1
                ? (() => { // starts exactly over the Blender phone (70% of the height, see tools/intro_phone.py), lifts, swipes
                  const b = io(clamp((p - SNAP[0]) / (SNAP[1] - SNAP[0]))), s0 = (0.7 * vh) / Math.min(0.8 * vh, 760);
                  return `translateX(${(1 - b) * -20}vw) rotateY(${Math.sin(b * Math.PI) * -12}deg) scale(${s0 + (1 - s0) * b + kick * 0.04})`;
                })()
                : `translateY(${(1 - intro) * (wide ? 55 : 48)}dvh) rotateX(${(1 - intro) * 28}deg) rotateY(${intro * ((cx - 240) / 240) * -7}deg) scale(${1.1 - intro * 0.1 + kick * 0.04})`,
              transformOrigin: video ? "50% 50%" : "50% 100%", opacity: video && wide && p > EMERGE[0] && p < SWIPE[1] ? 0 : phoneIn,
            }}>
            <div className="absolute inset-0" style={{ transformOrigin: `${ox}% ${oy}%`, transform: `translate(${(50 - ox) * centre}%, ${(46 - oy) * centre}%) scale(${z})` }}>
              <div className="relative h-full rounded-[13%/6%] bg-zinc-800 p-[2.6%] shadow-2xl ring-1 ring-white/20">
                <div className="relative h-full overflow-hidden rounded-[11%/5.2%] bg-zinc-950 text-zinc-50">
                  {scenes.map(({ text, Screen }, k) => {
                    const t = tk(k);
                    const y = k === 0 ? 0 : (1 - smooth(-0.06, 0.02, t)) * 100; // slides up over the last screen
                    const under = k < N - 1 ? smooth(-0.06, 0.02, tk(k + 1)) : 0; // and this one sinks back
                    if (y >= 100 || under >= 1) return null;
                    const pl = plays[k];
                    const ring = pl ? Math.max(0, ...pl.clicks.map((c) => (t >= c && t < c + 0.06 ? (t - c) / 0.06 : 0))) : 0;
                    return (
                      <div key={text} className="absolute inset-0 overflow-hidden bg-zinc-950" style={{ transform: `translateY(${y}%) scale(${1 - under * 0.1})`, opacity: 1 - under * 0.7 }}>
                        <Screen t={clamp(t, 0, 1.2)} e={ek(k)} />
                        {k === cur && pl && <>
                          {ring > 0 && <div className="absolute z-40 rounded-full border-lime-300" style={{ left: u(cx), top: u(cy), width: u(90), height: u(90), borderWidth: u(4), transform: `translate(-50%,-50%) scale(${0.3 + ring * 1.6})`, opacity: 1 - ring }} />}
                          <svg viewBox="0 0 24 24" className="absolute z-40 drop-shadow-[0_4px_8px_rgba(0,0,0,.6)]" style={{ left: u(cx), top: u(cy), width: u(46), opacity: smooth(0.02, 0.07, t) * (1 - smooth(0.9, 0.95, t)), transform: `translate(-18%,-8%) scale(${1 - press * 0.2})` }}>
                            <path d="M4 2.5 20 11l-7 2.2-3.4 7.3z" fill="#fff" stroke="#09090b" strokeWidth="1.6" strokeLinejoin="round" />
                          </svg>
                        </>}
                      </div>
                    );
                  })}
                  {video && p < SNAP[0] && ( // the same logo screen the Blender phone wakes up to (hidden while the row plays)
                    <img src="/video/screen.png" alt="" className="absolute inset-0 z-[45] h-full w-full object-fill" style={{ opacity: p < EMERGE[0] ? 1 : 0 }} />
                  )}
                  <div className="absolute left-1/2 top-[1.3%] z-50 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
                  <div className="pointer-events-none absolute inset-0 z-50 bg-lime-300 mix-blend-overlay" style={{ opacity: flash * 0.8 }} />
                </div>
              </div>
            </div>
            {plays.map((pl, k) => pl && <div key={k}>{pl.pops}</div>)}
          </div>
        </div>

        {/* 3D props and app art drifting around the phone, behind (depth < 1) and in front */}
        {scenes.flatMap((s, k) => {
          const t = tk(k), vis = smooth(-0.06, 0.1, t) * (1 - smooth(0.88, 1, t));
          if (vis <= 0) return [];
          return s.floats.map(([src, x, y, size, depth, rot], j) => (
            <img key={src + j} src={src} alt="" aria-hidden className="pointer-events-none absolute drop-shadow-[0_20px_30px_rgba(0,0,0,.55)]"
              style={{
                left: `${wide ? x : ((x - 50) / 47) * 92 + 4}%`, top: `${wide ? y : 30 + y * 0.68}%`, width: `${size * (wide ? 1 : 1.5)}vmin`,
                zIndex: depth > 1 ? 30 : 5, opacity: vis * (depth < 1 ? 0.75 : 1),
                transform: `translate(-50%,-50%) translateY(${(0.5 - t) * depth * 26}vh) rotate(${rot + (t - 0.5) * depth * 50}deg) scale(${0.3 + 0.7 * vis})`,
              }} />
          ));
        })}

        {/* the lime flash on the big moments */}
        <div className="pointer-events-none absolute inset-0 z-40" style={{ background: th.flash, opacity: flash * 0.45 }} aria-hidden />

        {/* outro: the logo on the signature grey, which then fades into the page below */}
        {o > -0.1 && (() => {
          const r = smooth(-0.08, 0.2, o), a = 140 - r * 200, fade = smooth(0.62, 0.95, o);
          if (r <= 0) return null;
          return (
            <div className="pointer-events-none absolute -inset-1 z-50" aria-hidden={o < 0.2}>
              <div className="absolute inset-0" style={{ background: LIME, clipPath: band(a) }} />
              <div className="absolute inset-0 grid place-items-center" style={{ background: mix("#27272a", "#09090b", fade), clipPath: cut(a) }}>
                <div className="flex flex-col items-center" style={{ opacity: 1 - fade, transform: `scale(${1 - fade * 0.08})` }}>
                  <img src="/icon-512.png" alt="Spotter" className="rounded-[28px] shadow-2xl shadow-black/50"
                    style={{ width: 120, height: 120, transform: `scale(${back((o - 0.16) / 0.12) * (1 + Math.sin(o * 30) * 0.025)})` }} />
                  <p className="mt-6 text-2xl font-bold uppercase text-lime-400" style={{ letterSpacing: `${0.3 + (1 - smooth(0.24, 0.44, o)) * 0.6}em`, opacity: smooth(0.24, 0.32, o) }}>Spotter</p>
                  <p className="mt-2 text-zinc-400" style={{ opacity: smooth(0.32, 0.42, o) }}>Your gym, in your pocket.</p>
                  <span className="mt-6 block h-0.5 w-32 overflow-hidden rounded-sm bg-zinc-700" style={{ opacity: smooth(0.36, 0.44, o) }}>
                    <span className="block h-full w-2/5 rounded-sm bg-lime-400" style={{ transform: `translateX(${(((o * 5) % 1) * 3.5 - 1) * 100}%)` }} />
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* progress */}
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex" style={{ opacity: intro }} aria-hidden>
          {scenes.map((s, k) => {
            const on = k === cur && p >= 1;
            return <span key={s.text} className="w-1.5 rounded-full transition-all duration-300" style={{ height: on ? 30 : 8, background: on ? (s.theme === "lime" ? "#09090b" : LIME) : th.fg, opacity: on ? 1 : 0.25 }} />;
          })}
        </div>
      </div>
    </section>
  );
}
