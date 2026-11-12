"use client";
// The landing page hero: a scroll-pinned, Apple-style ad for the app. A headline zooms away as a phone rises in, then
// each feature plays like a screen recording scrubbed by the scroll: a cursor moves and clicks, text types itself,
// parts of the screen burst out of the phone at a bigger size, the screen zooms in, and the page flashes lime on the
// big moments. Real screens (public/hero, captured from the demo account) with live overlays on top.
// Everything is a pure function of scroll position, so scrolling back plays it in reverse.
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
/** 0 before a, springs past 1 and settles, gone by b */
function pop(t: number, a: number, b = 0.97) {
  const x = clamp((t - a) / 0.08);
  if (x <= 0) return 0;
  return (1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2)) * (1 - smooth(b - 0.05, b, t));
}
const bump = (t: number, c: number, w = 0.022) => Math.max(0, 1 - Math.abs(t - c) / w);
const typed = (s: string, t: number, a: number, b: number) => s.slice(0, Math.round(clamp((t - a) / (b - a)) * s.length));
const mix = (a: string, b: string, t: number) => {
  const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(h(a, i) + (h(b, i) - h(a, i)) * t)).join(",")})`;
};

// --- phone coordinates: screenshots are 480 px wide; the phone root is a size container, so cqw scales with it -------
const S = 0.1975; // cqw of the phone per screenshot px (the screen is 94.8% of the phone's width)
const u = (n: number) => `${(n * S).toFixed(3)}cqw`;
const OFF = 40; // screenshot top inside the screen, under the island
/** a screenshot point as % of the phone box (for things outside the screen) */
const at = (x: number, y: number): [number, number] => [2.6 + (x / 480) * 94.8, 1.2 + ((y + OFF) / 1069) * 97.6];

function Crop({ img, r: [x, y, w, h], z = 1.35 }: { img: string; r: number[]; z?: number }) {
  return <div className="rounded-[inherit]" style={{ width: u(w * z), height: u(h * z), backgroundImage: `url(/hero/${img}.webp)`, backgroundSize: `${u(480 * z)} auto`, backgroundPosition: `${u(-x * z)} ${u(-y * z)}`, backgroundRepeat: "no-repeat" }} />;
}

/** a component flying out of the phone (from) to a bigger spot beside it (to), springing on arrival */
function Pop({ s, from, to, wide, glow, tilt = 0, children }: { s: number; from: [number, number]; to: [number, number]; wide: boolean; glow: string; tilt?: number; children: ReactNode }) {
  if (s <= 0.001) return null;
  const k = clamp(s);
  const tx = wide ? to[0] : 50 + (to[0] - 50) * 0.55;
  return (
    <div className="pointer-events-none absolute z-30" style={{ left: `${from[0] + (tx - from[0]) * k}%`, top: `${from[1] + (to[1] - from[1]) * k}%`, opacity: clamp(s * 3), transform: `translate(-50%,-50%) scale(${0.35 + 0.65 * s}) rotate(${tilt * (1 - k)}deg)` }}>
      <div className="overflow-hidden rounded-[3.5cqw] bg-zinc-900 ring-1 ring-white/20" style={{ boxShadow: `0 30px 80px -20px ${glow}, 0 0 0 1px rgba(255,255,255,.06)` }}>{children}</div>
    </div>
  );
}

const Caret = () => <span className="ml-[0.2cqw] inline-block w-[0.6cqw] animate-pulse bg-lime-400 align-middle" style={{ height: "1.1em" }} />;

type Play = { cursor: number[][]; clicks: number[]; flashes: number[]; zoom?: number[]; focus?: [number, number]; screen?: ReactNode; pops?: ReactNode };
type Scene = { img: string; word: string; text: string; from: string; to: string; play: (t: number, wide: boolean) => Play };

const LIME = "#a3e635";

const scenes: Scene[] = [
  {
    img: "home", word: "Skip the queue.", text: "Scan the QR at the door to clock in, and see how packed the SweatZone is before you walk over.", from: "#a3e635", to: "#10b981",
    play: (t, wide) => {
      const done = pop(t, 0.24, 0.45);
      return {
        cursor: [[0, 520, 900], [0.08, 420, 640], [0.2, 300, 214], [0.36, 300, 214], [0.47, 66, 330], [0.6, 66, 330], [0.7, 150, 600], [1, 150, 600]],
        clicks: [0.23, 0.5, 0.72], flashes: [0.23],
        zoom: [0.49, 1, 0.55, 1.22, 0.64, 1.22, 0.7, 1], focus: [200, 380],
        screen: done > 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-lime-400 text-zinc-950" style={{ opacity: clamp(done * 2) }}>
            <div className="flex items-center justify-center rounded-full bg-zinc-950 text-lime-400" style={{ width: u(150), height: u(150), transform: `scale(${done}) rotate(${(1 - clamp(done)) * -90}deg)`, fontSize: u(90) }}>✓</div>
            <p className="font-black tracking-tight" style={{ fontSize: u(52), marginTop: u(28) }}>You&apos;re in.</p>
            <p className="font-semibold opacity-70" style={{ fontSize: u(22) }}>Clocked in · 17:45</p>
          </div>
        ),
        pops: <>
          <Pop s={pop(t, 0.51)} from={at(240, 390)} to={[8, 34]} wide={wide} glow="#a3e635" tilt={-8}><Crop img="home" r={[22, 255, 437, 200]} /></Pop>
          <Pop s={pop(t, 0.73)} from={at(240, 590)} to={[92, 70]} wide={wide} glow="#10b981" tilt={8}><Crop img="home" r={[22, 480, 437, 170]} /></Pop>
        </>,
      };
    },
  },
  {
    img: "train", word: "Lift more.", text: "Routines, rest timers and every set logged. PRs land with a bang and your progress keeps climbing.", from: "#a78bfa", to: "#ec4899",
    play: (t, wide) => {
      const sheet = smooth(0.19, 0.27, t), set = t > 0.56, secs = Math.round(90 - clamp((t - 0.68) / 0.28) * 45);
      const cell = (x: number, w: number, text: string, live: boolean) => (
        <div className="absolute flex items-center justify-center rounded-[1.2cqw] font-bold" style={{ left: u(x), top: 0, width: u(w), height: u(44), fontSize: u(22), background: set ? "transparent" : live ? "#27272a" : "#18181b", outline: live && !set ? `${u(2)} solid ${LIME}` : undefined }}>{text}{live && !set && <Caret />}</div>
      );
      return {
        cursor: [[0, 520, 900], [0.15, 398, 300], [0.2, 398, 300], [0.31, 215, 520], [0.44, 215, 520], [0.46, 325, 520], [0.52, 325, 520], [0.55, 425, 520], [0.62, 425, 520], [0.75, 300, 420], [1, 300, 420]],
        clicks: [0.18, 0.32, 0.46, 0.56], flashes: [0.56],
        zoom: [0.29, 1, 0.33, 1.25, 0.6, 1.25, 0.66, 1], focus: [300, 500],
        screen: sheet > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-10 rounded-t-[4cqw] bg-zinc-950 ring-1 ring-white/10" style={{ top: u(330 + OFF), transform: `translateY(${(1 - sheet) * 100}%)` }}>
            <div className="mx-auto rounded-full bg-zinc-700" style={{ width: u(60), height: u(6), marginTop: u(12) }} />
            <div className="flex items-center justify-between" style={{ padding: `${u(18)} ${u(28)} 0` }}>
              <p className="font-black" style={{ fontSize: u(30) }}>Push day</p>
              <p className="font-mono font-bold text-lime-400" style={{ fontSize: u(22) }}>00:{String(12 + Math.floor(t * 40)).padStart(2, "0")}</p>
            </div>
            <p className="font-bold text-sky-400" style={{ fontSize: u(24), padding: `${u(22)} ${u(28)} ${u(10)}` }}>Bench Press (Barbell)</p>
            <div className="grid grid-cols-[1fr_2fr_2fr_1fr] font-semibold text-zinc-500" style={{ fontSize: u(18), padding: `0 ${u(28)}` }}><span>SET</span><span>KG</span><span>REPS</span><span>✓</span></div>
            <div className="relative bg-lime-400/15" style={{ height: u(56), marginTop: u(8) }}>
              <div className="absolute grid w-full grid-cols-[1fr_2fr_2fr_1fr] items-center font-bold" style={{ fontSize: u(22), padding: `0 ${u(28)}`, height: u(56) }}><span>1</span><span>70</span><span>6</span><span className="text-lime-400">✓</span></div>
            </div>
            <div className="relative" style={{ height: u(56), marginTop: u(4), background: set ? "rgba(163,230,53,.25)" : undefined }}>
              <span className="absolute font-bold" style={{ left: u(28), top: u(14), fontSize: u(22) }}>2</span>
              <div className="absolute" style={{ top: u(6), left: 0, right: 0 }}>
                {cell(170, 100, typed("72.5", t, 0.33, 0.41) || (t < 0.32 ? "70" : ""), t > 0.32 && t < 0.46)}
                {cell(285, 90, typed("6", t, 0.47, 0.49) || (t < 0.46 ? "6" : ""), t > 0.46 && t < 0.56)}
                <div className="absolute flex items-center justify-center rounded-[1.2cqw] font-black" style={{ left: u(400), width: u(50), height: u(44), fontSize: u(24), background: set ? LIME : "#27272a", color: set ? "#09090b" : "#71717a", transform: `scale(${1 + bump(t, 0.565, 0.03) * 0.4})` }}>✓</div>
              </div>
            </div>
            {set && <p className="font-black text-lime-400" style={{ fontSize: u(22), padding: `${u(18)} ${u(28)}`, opacity: smooth(0.57, 0.6, t) }}>🏆 New best: 72.5 kg</p>}
          </div>
        ),
        pops: <>
          <Pop s={pop(t, 0.58)} from={at(425, 520)} to={[90, 26]} wide={wide} glow="#ec4899" tilt={12}>
            <div className="relative overflow-hidden" style={{ padding: `${u(26)} ${u(40)}` }}>
              <div className="absolute inset-[-60%] opacity-60" style={{ background: `repeating-conic-gradient(from ${t * 400}deg, #ec4899 0 6deg, transparent 6deg 18deg)` }} />
              <div className="relative whitespace-nowrap text-center">
                <p className="font-black tracking-[0.2em] text-pink-300" style={{ fontSize: u(20) }}>NEW PR</p>
                <p className="bg-gradient-to-r from-violet-300 to-pink-400 bg-clip-text font-black text-transparent" style={{ fontSize: u(80), lineHeight: 1 }}>72.5 kg</p>
                <p className="font-bold text-zinc-300" style={{ fontSize: u(22) }}>Bench Press · +2.5 kg</p>
              </div>
            </div>
          </Pop>
          <Pop s={pop(t, 0.68)} from={at(240, 380)} to={[10, 66]} wide={wide} glow="#a78bfa" tilt={-10}>
            <div className="flex items-center" style={{ padding: u(26), gap: u(22) }}>
              <svg viewBox="0 0 40 40" style={{ width: u(110) }}><circle cx="20" cy="20" r="17" fill="none" stroke="#27272a" strokeWidth="4" /><circle cx="20" cy="20" r="17" fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(secs / 90) * 106.8} 200`} transform="rotate(-90 20 20)" /></svg>
              <div><p className="font-bold text-zinc-400" style={{ fontSize: u(20) }}>Rest</p><p className="font-mono font-black" style={{ fontSize: u(54) }}>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p></div>
            </div>
          </Pop>
        </>,
      };
    },
  },
  {
    img: "eat", word: "Eat smart.", text: "Every dish in the APU cafeteria with its macros, counted against a target tuned to your goal.", from: "#fb923c", to: "#f43f5e",
    play: (t, wide) => {
      const q = typed("nasi lemak", t, 0.17, 0.33), ring = smooth(0.35, 0.4, t) * (1 - smooth(0.62, 0.66, t)), fill = smooth(0.56, 0.72, t);
      const bar = (label: string, g: number, max: number, c: string) => (
        <div style={{ marginTop: u(14) }}>
          <div className="flex justify-between font-bold" style={{ fontSize: u(20) }}><span className="text-zinc-400">{label}</span><span>{Math.round(g * fill)} g</span></div>
          <div className="overflow-hidden rounded-full bg-zinc-800" style={{ height: u(12), marginTop: u(6) }}><div className="h-full rounded-full" style={{ width: `${(g / max) * 100 * fill}%`, background: c }} /></div>
        </div>
      );
      return {
        cursor: [[0, 520, 900], [0.12, 200, 636], [0.16, 200, 636], [0.34, 260, 700], [0.44, 437, 792], [0.55, 437, 792], [0.66, 300, 300], [1, 300, 300]],
        clicks: [0.15, 0.5], flashes: [0.5],
        zoom: [0.35, 1, 0.41, 1.3, 0.6, 1.3, 0.67, 1], focus: [260, 790],
        screen: <>
          {t > 0.15 && (
            <div className="absolute z-10 flex items-center rounded-[1.6cqw] bg-zinc-900 font-semibold" style={{ left: u(34), top: u(612 + OFF), width: u(420), height: u(48), padding: `0 ${u(16)}`, fontSize: u(22), outline: `${u(2)} solid ${LIME}` }}>
              <span className="text-zinc-500" style={{ marginRight: u(10) }}>⌕</span>{q}<Caret />
            </div>
          )}
          <div className="absolute z-10 rounded-[2cqw]" style={{ left: u(30), top: u(770 + OFF), width: u(428), height: u(108), opacity: ring, boxShadow: `0 0 0 ${u(3)} ${LIME}, 0 0 ${u(40)} ${LIME}` }} />
          {t > 0.5 && (
            <div className="absolute z-20 flex items-center whitespace-nowrap rounded-full bg-lime-400 font-bold text-zinc-950" style={{ left: "50%", top: u(60 + OFF), padding: `${u(10)} ${u(22)}`, fontSize: u(20), gap: u(8), transform: `translate(-50%, ${(1 - clamp(pop(t, 0.5, 0.8))) * -200}%)` }}>✓ Added nasi lemak</div>
          )}
        </>,
        pops: <>
          <Pop s={pop(t, 0.53)} from={at(437, 792)} to={[9, 36]} wide={wide} glow="#fb923c" tilt={-10}>
            <div style={{ padding: u(28), width: u(330) }}>
              <p className="font-bold text-zinc-400" style={{ fontSize: u(20) }}>Nasi lemak + fried chicken</p>
              <p className="bg-gradient-to-r from-orange-300 to-rose-400 bg-clip-text font-black text-transparent" style={{ fontSize: u(72), lineHeight: 1.05 }}>{Math.round(780 * smooth(0.54, 0.68, t))}<span style={{ fontSize: u(28) }}> kcal</span></p>
              {bar("Protein", 32, 60, "#38bdf8")}{bar("Carbs", 85, 120, "#fb923c")}{bar("Fat", 34, 60, "#f43f5e")}
            </div>
          </Pop>
          <Pop s={pop(t, 0.7)} from={at(240, 220)} to={[91, 66]} wide={wide} glow="#f43f5e" tilt={10}><Crop img="eat" r={[22, 150, 437, 140]} /></Pop>
        </>,
      };
    },
  },
  {
    img: "board", word: "Climb the ranks.", text: "Leaderboards by lift, faculty and bodyweight class. The heaviest lift wins, not the most reps.", from: "#fde047", to: "#f59e0b",
    play: (t, wide) => {
      const rank = Math.round(tr(t, 0.5, 11, 0.74, 4)), up = t > 0.74;
      return {
        cursor: [[0, 520, 900], [0.15, 246, 370], [0.22, 246, 370], [0.42, 200, 607], [0.55, 200, 607], [0.7, 380, 300], [1, 380, 300]],
        clicks: [0.18, 0.45], flashes: [0.18, 0.75],
        zoom: [0.18, 1, 0.24, 1.2, 0.36, 1.2, 0.42, 1], focus: [246, 430],
        pops: <>
          <Pop s={pop(t, 0.19)} from={at(246, 430)} to={[10, 32]} wide={wide} glow="#fde047" tilt={-8}><Crop img="board" r={[27, 320, 437, 220]} /></Pop>
          <Pop s={pop(t, 0.46)} from={at(200, 607)} to={[90, 64]} wide={wide} glow="#f59e0b" tilt={10}>
            <div className="text-center" style={{ padding: `${u(26)} ${u(46)}` }}>
              <p className="font-bold text-zinc-400" style={{ fontSize: u(20) }}>Your rank</p>
              <p className="font-black tabular-nums" style={{ fontSize: u(110), lineHeight: 1, color: up ? "#fde047" : "#fafafa", transform: `scale(${1 + bump(t, 0.75, 0.04) * 0.35})` }}>#{rank}</p>
              <p className="font-black text-lime-400" style={{ fontSize: u(24), opacity: smooth(0.74, 0.78, t) }}>▲ 7 places</p>
            </div>
          </Pop>
        </>,
      };
    },
  },
  {
    img: "map", word: "Find anything.", text: "A 3D map of the whole gym. Every exercise points you to the machine that does it.", from: "#22d3ee", to: "#6366f1",
    play: (t, wide) => {
      const pulse = (((t - 0.22) * 6) % 1 + 1) % 1;
      return {
        cursor: [[0, 520, 900], [0.17, 327, 789], [0.24, 327, 789], [0.4, 330, 560], [1, 330, 560]],
        clicks: [0.21], flashes: [0.21],
        zoom: [0.24, 1, 0.42, 2.1, 0.76, 2.1, 0.88, 1], focus: [243, 400],
        screen: t > 0.22 && (
          <div className="absolute z-10 rounded-full" style={{ left: u(243), top: u(400 + OFF), width: u(120), height: u(70), transform: `translate(-50%,-50%) scale(${0.4 + pulse * 1.2})`, opacity: (1 - pulse) * (1 - smooth(0.8, 0.9, t)), border: `${u(4)} solid #22d3ee` }} />
        ),
        pops: <>
          <Pop s={pop(t, 0.44)} from={at(243, 400)} to={[10, 30]} wide={wide} glow="#22d3ee" tilt={-10}>
            <div style={{ padding: u(28), width: u(330) }}>
              <p className="font-bold text-cyan-300" style={{ fontSize: u(20) }}>📍 Benches &amp; racks</p>
              <p className="font-black" style={{ fontSize: u(50), lineHeight: 1.1 }}>Squat Rack</p>
              <p className="text-zinc-400" style={{ fontSize: u(20), marginTop: u(8) }}>Used for Squat (Barbell) and Front Squat (Barbell)</p>
            </div>
          </Pop>
          <Pop s={pop(t, 0.56)} from={at(240, 790)} to={[90, 70]} wide={wide} glow="#6366f1" tilt={10}><Crop img="map" r={[20, 770, 450, 80]} z={1.3} /></Pop>
        </>,
      };
    },
  },
];
const N = scenes.length;
const U = 1 + 2 * N; // scroll units: the intro, then two screens of scrolling per scene

export default function HeroScroll({ apk }: { apk: string }) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = ref.current?.getBoundingClientRect();
      if (r) setP(clamp(-r.top / (r.height - innerHeight)) * U);
      setWide(innerWidth >= 768);
    };
    const on = () => { raf ||= requestAnimationFrame(read); };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const tk = (k: number) => (p - 1 - 2 * k) / 2; // scene k's own time, 0..1 while it's on
  const intro = smooth(0, 0.85, p);
  const cur = clamp(Math.floor((p - 1) / 2), 0, N - 1);
  const f = clamp(((p - 1) / 2 - cur - 0.9) * 10); // blend colours into the next scene
  const nxt = Math.min(N - 1, cur + 1);
  const from = mix(scenes[cur].from, scenes[nxt].from, f), to = mix(scenes[cur].to, scenes[nxt].to, f);

  const plays = scenes.map((s, k) => { const t = tk(k); return t > -0.1 && t < 1.05 ? s.play(t, wide) : undefined; });
  const live = plays[cur], t = tk(cur);
  const cx = live ? tr(t, ...live.cursor.flatMap(([a, x]) => [a, x])) : 240, cy = live ? tr(t, ...live.cursor.flatMap(([a, , y]) => [a, y])) : 500;
  const press = live ? Math.max(0, ...live.clicks.map((c) => bump(t, c, 0.015))) : 0;
  const flash = Math.max(0, ...plays.flatMap((pl, k) => (pl ? pl.flashes.map((c) => bump(tk(k), c, 0.02)) : [])), ...scenes.map((_, k) => (k ? bump(tk(k), 0, 0.012) : 0)));
  const kick = live ? Math.max(0, ...live.clicks.map((c) => bump(t, c, 0.03))) : 0;

  return (
    <section ref={ref} style={{ height: `${U * 100}dvh` }} className="relative">
      <style>{`@keyframes hero-drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6vw,-4vh) scale(1.15)}100%{transform:translate(0,0) scale(1)}}`}</style>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* colour field */}
        <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.25 + intro * 0.5 }} aria-hidden>
          <div className="absolute -left-[10vw] top-[10vh] h-[60vmax] w-[60vmax] rounded-full blur-[120px] motion-safe:animate-[hero-drift_14s_ease-in-out_infinite]" style={{ background: from, opacity: 0.55 }} />
          <div className="absolute -right-[10vw] bottom-[-20vh] h-[55vmax] w-[55vmax] rounded-full blur-[120px] motion-safe:animate-[hero-drift_18s_ease-in-out_infinite_reverse]" style={{ background: to, opacity: 0.5 }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#09090b_85%)]" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" aria-hidden />

        {/* intro headline: zooms past you as you scroll */}
        <div className="absolute inset-x-0 top-[13dvh] z-20 px-4 text-center md:top-[16dvh]"
          style={{ opacity: 1 - smooth(0, 0.55, p), transform: `scale(${1 + p * 0.5})`, filter: `blur(${smooth(0, 0.6, p) * 12}px)`, pointerEvents: p > 0.3 ? "none" : undefined }}>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Built for the APU SweatZone</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.75rem,9vw,7.5rem)] font-black leading-[0.95] tracking-[-0.04em]">
            Your gym,{" "}
            <span className="bg-gradient-to-r from-lime-300 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">in your pocket.</span>
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#demo" className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-zinc-950 transition active:scale-[0.97]">Try the live demo</a>
            <a href={apk} className="rounded-full bg-white/10 px-6 py-3 font-semibold ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 active:scale-[0.97]">Download for Android</a>
          </div>
          <p className="mt-10 text-sm text-zinc-500 motion-safe:animate-bounce">Scroll ↓</p>
        </div>

        {/* scene copy: the headline types itself */}
        {scenes.map((s, k) => {
          const t = tk(k), vis = smooth(-0.04, 0.01, t) * (1 - smooth(0.93, 0.99, t));
          if (vis <= 0) return null;
          return (
            <div key={s.img} className="pointer-events-none absolute inset-x-0 top-[8dvh] z-10 px-6 text-center md:inset-x-auto md:left-[max(2rem,calc(50%-36rem))] md:top-1/2 md:w-[min(34rem,42vw)] md:text-left"
              style={{ opacity: vis, transform: `translateY(${(1 - vis) * -40}px)${wide ? " translateY(-50%)" : ""}` }}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">{String(k + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</p>
              <h2 className="mt-2 pb-2 text-[clamp(2.2rem,6.5vw,5.75rem)] font-black leading-[0.95] tracking-[-0.04em]">
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(100deg, ${s.from}, ${s.to})` }}>{typed(s.word, t, 0, 0.12)}</span>
                <span className="ml-1 inline-block w-[0.08em] animate-pulse" style={{ height: "0.8em", background: s.to }} />
              </h2>
              <p className="mx-auto mt-1 max-w-md text-base text-zinc-300 md:mx-0 md:mt-4 md:text-xl" style={{ opacity: smooth(0.08, 0.16, t) }}>{s.text}</p>
            </div>
          );
        })}

        {/* the phone */}
        <div className="absolute inset-x-0 bottom-[3dvh] top-[36dvh] flex items-center justify-center [perspective:1400px] md:inset-y-0 md:left-[40%]">
          <div className="relative aspect-[390/844] h-full max-h-[760px] [container-type:inline-size] md:h-[80dvh]"
            style={{
              transform: `translateY(${(1 - intro) * (wide ? 55 : 48)}dvh) rotateX(${(1 - intro) * 28}deg) rotateY(${intro * ((cx - 240) / 240) * -7}deg) scale(${1.1 - intro * 0.1 + kick * 0.04})`,
              transformOrigin: "50% 100%",
            }}>
            <div className="absolute -inset-10 rounded-[4rem] blur-3xl" style={{ background: `linear-gradient(160deg, ${from}, ${to})`, opacity: 0.35 * intro + flash * 0.4 }} aria-hidden />
            <div className="relative h-full rounded-[13%/6%] bg-zinc-800 p-[2.6%] shadow-2xl ring-1 ring-white/20">
              <div className="relative h-full overflow-hidden rounded-[11%/5.2%] bg-zinc-950">
                {scenes.map((s, k) => {
                  const pl = plays[k], t = tk(k);
                  const y = k === 0 ? 0 : (1 - smooth(-0.06, 0.02, t)) * 100; // slides up over the last screen
                  const under = k < N - 1 ? smooth(-0.06, 0.02, tk(k + 1)) : 0; // and this one sinks back
                  if (y >= 100 || under >= 1) return null;
                  const z = pl?.zoom ? tr(t, ...pl.zoom) : 1, [fx, fy] = pl?.focus ?? [240, 500];
                  const cOn = smooth(0.02, 0.07, t) * (1 - smooth(0.9, 0.95, t));
                  const ring = pl ? Math.max(0, ...pl.clicks.map((c) => (t >= c && t < c + 0.06 ? (t - c) / 0.06 : 0))) : 0;
                  return (
                    <div key={s.img} className="absolute inset-0 overflow-hidden bg-zinc-950" style={{ transform: `translateY(${y}%) scale(${1 - under * 0.1})`, opacity: 1 - under * 0.7 }}>
                      <div className="absolute inset-0" style={{ transform: `scale(${z})`, transformOrigin: `${u(fx)} ${u(fy + OFF)}` }}>
                        <Image src={`/hero/${s.img}.webp`} alt="" width={960} height={2078} sizes="420px" priority className="absolute left-0 w-full" style={{ top: u(OFF) }} />
                        {pl?.screen}
                        {k === cur && pl && <>
                          {ring > 0 && <div className="absolute z-40 rounded-full border-lime-300" style={{ left: u(cx), top: u(cy + OFF), width: u(90), height: u(90), borderWidth: u(4), transform: `translate(-50%,-50%) scale(${0.3 + ring * 1.6})`, opacity: 1 - ring }} />}
                          <svg viewBox="0 0 24 24" className="absolute z-40 drop-shadow-[0_4px_8px_rgba(0,0,0,.6)]" style={{ left: u(cx), top: u(cy + OFF), width: u(46), opacity: cOn, transform: `translate(-18%,-8%) scale(${1 - press * 0.2})` }}>
                            <path d="M4 2.5 20 11l-7 2.2-3.4 7.3z" fill="#fff" stroke="#09090b" strokeWidth="1.6" strokeLinejoin="round" />
                          </svg>
                        </>}
                      </div>
                    </div>
                  );
                })}
                <div className="absolute left-1/2 top-[1.3%] z-50 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
                <div className="pointer-events-none absolute inset-0 z-50 bg-lime-300 mix-blend-overlay" style={{ opacity: flash * 0.8 }} />
              </div>
            </div>
            {plays.map((pl, k) => pl && <div key={k}>{pl.pops}</div>)}
          </div>
        </div>

        {/* the lime flash on the big moments */}
        <div className="pointer-events-none absolute inset-0 z-40 bg-lime-400" style={{ opacity: flash * 0.45 }} aria-hidden />

        {/* progress */}
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex" style={{ opacity: intro }} aria-hidden>
          {scenes.map((s, k) => {
            const on = k === cur && p >= 1;
            return <span key={s.img} className="w-1.5 rounded-full transition-all duration-300" style={{ height: on ? 30 : 8, background: on ? s.from : "rgba(255,255,255,.25)" }} />;
          })}
        </div>
      </div>
    </section>
  );
}
