"use client";
// The landing page hero: a scroll-pinned, Apple-style tour. A headline zooms away as a phone rises and lands, then each
// scroll step slides the next real app screen (public/hero, captured from the demo account) over the last while the
// colours, the headline and floating stat chips change with it. Everything is a function of scroll position.
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const scenes = [
  { img: "home", word: "Skip the queue.", text: "Scan the QR at the door to clock in, and see how packed the SweatZone is before you walk over.", from: "#a3e635", to: "#10b981", chips: ["55 / 60 · Packed", "Best time 19:30"] },
  { img: "train", word: "Lift more.", text: "Routines, rest timers and every set logged. PRs land with a bang and your progress keeps climbing.", from: "#a78bfa", to: "#ec4899", chips: ["New PR · Squat 100 kg", "Push · Pull · Legs"] },
  { img: "eat", word: "Eat smart.", text: "Every dish in the APU cafeteria with its macros, counted against a target tuned to your goal.", from: "#fb923c", to: "#f43f5e", chips: ["Nasi lemak · 780 kcal", "32 g protein"] },
  { img: "board", word: "Climb the ranks.", text: "Leaderboards by lift, faculty and bodyweight class. The heaviest lift wins, not the most reps.", from: "#fde047", to: "#f59e0b", chips: ["#1 · 396.7 DOTS", "Pound for pound"] },
  { img: "map", word: "Find anything.", text: "A 3D map of the whole gym. Every exercise points you to the machine that does it.", from: "#22d3ee", to: "#6366f1", chips: ["Squat Rack", "Tap any machine"] },
];
const N = scenes.length;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// raw scroll steps -> eased steps that hold on each scene and move between them
const settle = (p: number) => Math.floor(p) + smooth(0.3, 0.75, p - Math.floor(p));
const mix = (a: string, b: string, t: number) => {
  const h = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(h(a, i) + (h(b, i) - h(a, i)) * t)).join(",")})`;
};

export default function HeroScroll({ apk }: { apk: string }) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const r = ref.current?.getBoundingClientRect();
      if (r) setP(clamp(-r.top / (r.height - innerHeight)) * N);
      setWide(innerWidth >= 768);
    };
    const on = () => { raf ||= requestAnimationFrame(read); };
    read();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);

  const q = settle(p); // 0 = intro, k + 1 = scene k
  const intro = smooth(0, 0.85, p); // the phone rising in
  const at = clamp(q - 1, 0, N - 1);
  const k0 = Math.floor(at), k1 = Math.min(N - 1, k0 + 1), f = at - k0;
  const from = mix(scenes[k0].from, scenes[k1].from, f), to = mix(scenes[k0].to, scenes[k1].to, f);

  return (
    <section ref={ref} style={{ height: `${(N + 1) * 100}dvh` }} className="relative">
      <style>{`@keyframes hero-drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6vw,-4vh) scale(1.15)}100%{transform:translate(0,0) scale(1)}}`}</style>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* colour field */}
        <div className="pointer-events-none absolute inset-0" style={{ opacity: 0.25 + intro * 0.45 }} aria-hidden>
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

        {/* scene copy */}
        {scenes.map((s, k) => {
          const d = q - (k + 1), vis = clamp(1 - Math.abs(d) * 1.6);
          return (
            <div key={s.img} aria-hidden={vis < 0.5}
              className="pointer-events-none absolute inset-x-0 top-[9dvh] z-10 px-6 text-center md:inset-x-auto md:left-[max(2rem,calc(50%-36rem))] md:top-1/2 md:w-[min(34rem,45vw)] md:text-left"
              style={{ opacity: vis, transform: `translateY(${-d * 70}px)${wide ? " translateY(-50%)" : ""}`, filter: `blur(${(1 - vis) * 10}px)` }}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">{String(k + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</p>
              <h2 className="mt-2 bg-clip-text pb-2 text-[clamp(2.4rem,7vw,6rem)] font-black leading-[0.95] tracking-[-0.04em] text-transparent"
                style={{ backgroundImage: `linear-gradient(100deg, ${s.from}, ${s.to})` }}>{s.word}</h2>
              <p className="mx-auto mt-3 max-w-md text-base text-zinc-300 md:mx-0 md:mt-5 md:text-xl">{s.text}</p>
            </div>
          );
        })}

        {/* the phone */}
        <div className="absolute inset-x-0 bottom-[3dvh] top-[34dvh] flex items-center justify-center md:inset-y-0 md:top-0 md:bottom-0 md:left-[40%] [perspective:1400px]">
          <div className="relative aspect-[390/844] h-full max-h-[760px] md:h-[82dvh]"
            style={{ transform: `translateY(${(1 - intro) * (wide ? 55 : 48)}dvh) rotateX(${(1 - intro) * 28}deg) scale(${1.1 - intro * 0.1})`, transformOrigin: "50% 100%" }}>
            <div className="absolute -inset-10 rounded-[4rem] blur-3xl transition-colors" style={{ background: `linear-gradient(160deg, ${from}, ${to})`, opacity: 0.35 * intro }} aria-hidden />
            <div className="relative h-full rounded-[13%/6%] bg-zinc-800 p-[2.6%] shadow-2xl ring-1 ring-white/20">
              <div className="relative h-full overflow-hidden rounded-[11%/5.2%] bg-zinc-950">
                <div className="absolute left-1/2 top-[1.3%] z-10 h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
                {scenes.map((s, k) => {
                  const y = k === 0 ? 0 : clamp(k + 1 - q) * 100; // each screen slides up over the last
                  const under = clamp(q - (k + 1)); // and the one underneath sinks back
                  return (
                    <div key={s.img} className="absolute inset-0 bg-zinc-950 pt-[9%]" style={{ transform: `translateY(${y}%) scale(${1 - under * 0.08})`, opacity: 1 - under * 0.6, borderRadius: "inherit" }}>
                      <Image src={`/hero/${s.img}.webp`} alt="" fill sizes="400px" priority={k === 0} className="object-cover object-top" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* floating chips */}
            {scenes.map((s, k) => {
              const d = q - (k + 1), vis = clamp(1 - Math.abs(d) * 1.8);
              return s.chips.map((c, j) => {
                const left = j === 0;
                const style: CSSProperties = {
                  opacity: vis,
                  transform: `translate(${(left ? -1 : 1) * (1 - vis) * 60}px, ${d * (left ? -140 : 160)}px) scale(${0.85 + vis * 0.15}) rotate(${(left ? -4 : 3) * (1 - vis)}deg)`,
                  [left ? "left" : "right"]: wide ? "-34%" : "-10%",
                  top: left ? "22%" : "62%",
                  boxShadow: `0 10px 40px -10px ${left ? s.from : s.to}`,
                };
                return (
                  <div key={s.img + j} aria-hidden className="pointer-events-none absolute z-20 whitespace-nowrap rounded-2xl bg-zinc-900/70 px-3 py-2 text-xs font-bold ring-1 ring-white/15 backdrop-blur-xl md:px-4 md:py-3 md:text-base" style={style}>
                    <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: left ? s.from : s.to }} />{c}
                  </div>
                );
              });
            })}
          </div>
        </div>

        {/* progress */}
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex" style={{ opacity: intro }} aria-hidden>
          {scenes.map((s, k) => {
            const on = clamp(1 - Math.abs(q - (k + 1)));
            return <span key={s.img} className="w-1.5 rounded-full" style={{ height: 8 + on * 22, background: on > 0.5 ? s.from : "rgba(255,255,255,.25)" }} />;
          })}
        </div>
      </div>
    </section>
  );
}
