"use client";
// The ad video, as a web page: the landing page's hero animation (components/HeroScroll) driven by a clock instead of
// the scroll, played to music. Drop an audio file anywhere (or pick one) and the animation stretches to the song.
// Space plays / pauses, ← → skip a second, H hides the controls (or ?clean for recording).
// With the default song (public/video/song.mp3) the hero is cut to its beats (SONG, songCues); any other song you drop
// just spreads the hero evenly over its length.
import { useCallback, useEffect, useRef, useState } from "react";

import HeroScroll, { HANDOFF, HERO, heroMoments, heroTyping } from "@/components/HeroScroll";
import { BEATS } from "./beats";

const SONG = { url: "/video/song.mp3", name: "Dance Baby · Infraction" };
// The pace: every part is a whole number of bars (a bar = 8 tracked beats, ~2.6 s), so cuts always land on a bar line.
// It opens on the Blender shot (public/video/intro.mp4, tools/intro_phone.py: the phone on a box, the camera easing in,
// the screen waking to the logo) for CLIP_BARS, cuts to the hero on the beat drop, then the hero's own intro takes a bar.
// The logo outro is always last.
const CLIP_BARS = 2, HANDOFF_BARS = 1, SCENE_BARS = 2, OUTRO_BARS = 2;
const bar = (i: number) => BEATS[Math.min(BEATS.length - 1, i * 8)];
const FIRST = CLIP_BARS + HANDOFF_BARS; // the bar the first scene starts on
const LAST = FIRST + HERO.scenes * SCENE_BARS; // the bar the scenes end on
const PLAN = {
  clip: bar(CLIP_BARS), // the cut from the Blender shot into the hero
  hold: bar(CLIP_BARS) + 0.2, // our phone fades in over the Blender phone and holds a moment
  intro: bar(FIRST), // the app's screens spin past inside it and land on home, then it snaps right into scene 1
  scenes: Array.from({ length: HERO.scenes + 1 }, (_, k) => bar(FIRST + k * SCENE_BARS)),
  logo: BEATS[Math.min(BEATS.length - 1, LAST * 8 + 4)], // half a bar into the outro
  end: bar(LAST + OUTRO_BARS),
};
const CLIP = "/video/intro.mp4";

const O0 = HERO.intro + HERO.scene * HERO.scenes; // where the hero's logo outro starts
const nearestBeat = (s: number) => BEATS.reduce((a, b) => (Math.abs(b - s) < Math.abs(a - s) ? b : a));
/** [second, progress] pairs for the default song: scenes start on bars, their clicks and flashes land on the nearest beat */
function songCues(): [number, number][] {
  const cues: [number, number][] = [[0, 0], [PLAN.hold, 0], [PLAN.intro, HERO.intro]];
  heroMoments().forEach((moments, k) => {
    const s = PLAN.scenes[k], e = PLAN.scenes[k + 1], p0 = HERO.intro + HERO.scene * k;
    for (const m of moments) {
      const at = nearestBeat(s + m * (e - s));
      if (at > cues[cues.length - 1][0] + 0.15 && at < e - 0.15) cues.push([at, p0 + HERO.scene * m]);
    }
    cues.push([e, p0 + HERO.scene]);
  });
  cues.push([PLAN.logo, O0 + 0.2 * HERO.outro], [PLAN.end, HERO.total]);
  return cues;
}
const SONG_CUES = songCues();
/** 1 on a beat, decaying: a big kick on each bar (every 8th beat), a small one on every other beat, only while scenes play */
function beatAt(t: number) {
  if (t < PLAN.intro || t > PLAN.scenes[PLAN.scenes.length - 1]) return 0;
  let i = 0;
  while (i + 1 < BEATS.length && BEATS[i + 1] <= t) i++;
  const bar = Math.floor(i / 8) * 8, beat = i - (i % 2);
  return Math.max(Math.exp(-(t - BEATS[bar]) * 7), 0.35 * Math.exp(-(t - BEATS[beat]) * 9));
}

function evenCues(len: number): [number, number][] {
  return [[0, 0], [len, HERO.total]];
}
function progressAt(t: number, cues: [number, number][]) {
  if (t <= cues[0][0]) return cues[0][1];
  for (let i = 0; i + 1 < cues.length; i++) {
    const [t0, p0] = cues[i], [t1, p1] = cues[i + 1];
    if (t <= t1) return p0 + ((p1 - p0) * (t - t0)) / (t1 - t0);
  }
  return cues[cues.length - 1][1];
}
// The opening's cursor (x vw, y vh over the whole frame): it glides in over the 3D phone and clicks its logo on the drop,
// rides along as the phones fan out and whip past, then picks the home phone as the row settles, and drifts off.
const handoffAt = (k: number) => PLAN.hold + k * (PLAN.intro - PLAN.hold);
const LANDED = handoffAt(HANDOFF.landed);
const CURSOR: [number, number, number][] = [
  [PLAN.clip - 1.3, 84, 104], [PLAN.clip - 0.2, 51, 46], [PLAN.clip + 0.3, 51, 46], // in, onto the logo, click on the drop
  [handoffAt(HANDOFF.emerged), 60, 52], [handoffAt(HANDOFF.swipe) + 0.25, 66, 56], // drifts toward the phones on the right as they fan out
  [LANDED - 0.15, 51, 50], [LANDED + 0.25, 51, 50], [LANDED + 0.7, 58, 74], // onto the home phone, click, away
];
const CLICKS = [PLAN.clip, LANDED + 0.02];
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function cursorAt(t: number) {
  if (t < CURSOR[0][0] || t > CURSOR[CURSOR.length - 1][0]) return null;
  let i = 0;
  while (i + 2 < CURSOR.length && CURSOR[i + 1][0] < t) i++;
  const [t0, x0, y0] = CURSOR[i], [t1, x1, y1] = CURSOR[i + 1], k = ease(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
  const fade = Math.min(1, (t - CURSOR[0][0]) / 0.2, (CURSOR[CURSOR.length - 1][0] - t) / 0.3);
  const press = Math.max(0, ...CLICKS.map((c) => 1 - Math.abs(t - c) / 0.08));
  const ring = Math.max(0, ...CLICKS.map((c) => (t >= c && t < c + 0.4 ? (t - c) / 0.4 : 0)));
  return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, fade, press, ring };
}

/** the second the hero reaches progress p (cues only go forward; on a hold, the hold's start) */
function timeAt(p: number, cues: [number, number][]) {
  for (let i = 0; i + 1 < cues.length; i++) {
    const [t0, p0] = cues[i], [t1, p1] = cues[i + 1];
    if (p >= p0 && p <= p1 && p1 > p0) return t0 + ((p - p0) / (p1 - p0)) * (t1 - t0);
  }
  return cues[cues.length - 1][0];
}
// Sound effects, one kind at a time. Typing: every headline typing itself and everything typed inside the phone.
const TYPING = heroTyping().flatMap((spans, k) => spans.map(([a, b]) => {
  const p0 = HERO.intro + HERO.scene * k;
  return [timeAt(p0 + HERO.scene * a, SONG_CUES), timeAt(p0 + HERO.scene * b, SONG_CUES)] as const;
}));

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Video() {
  const audio = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<{ url: string; name: string } | null>(SONG);
  const [len, setLen] = useState(PLAN.end); // where the cut ends (a dropped song: its length; no song: 60 s)
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ui, setUi] = useState(true);
  const clock = useRef({ start: 0, from: 0 });

  useEffect(() => { if (new URLSearchParams(location.search).has("clean")) setUi(false); }, []);

  // the clock: the song's own time when there is one, else wall time
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    clock.current = { start: performance.now(), from: t };
    const tick = () => {
      const a = audio.current;
      const now = song && a ? a.currentTime : clock.current.from + (performance.now() - clock.current.start) / 1000;
      if (now >= len) { setT(len); setPlaying(false); a?.pause(); return; }
      setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback((on: boolean) => {
    const a = audio.current;
    if (on && t >= len) { setT(0); if (a) a.currentTime = 0; }
    if (song && a) { if (on) void a.play(); else a.pause(); }
    setPlaying(on);
  }, [song, t, len]);
  const seek = useCallback((s: number) => {
    const v = Math.min(len, Math.max(0, s));
    setT(v);
    clock.current = { start: performance.now(), from: v };
    if (audio.current && song) audio.current.currentTime = v;
  }, [len, song]);

  const load = (f?: File | null) => {
    if (!f || !f.type.startsWith("audio")) return;
    if (song && song.url !== SONG.url) URL.revokeObjectURL(song.url);
    setSong({ url: URL.createObjectURL(f), name: f.name });
    setPlaying(false); setT(0);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); play(!playing); }
      else if (e.key === "ArrowRight") seek(t + 1);
      else if (e.key === "ArrowLeft") seek(t - 1);
      else if (e.key.toLowerCase() === "h") setUi((v) => !v);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => { e.preventDefault(); load(e.dataTransfer?.files[0]); };
    addEventListener("keydown", key); addEventListener("dragover", over); addEventListener("drop", drop);
    return () => { removeEventListener("keydown", key); removeEventListener("dragover", over); removeEventListener("drop", drop); };
  });

  const own = song?.url === SONG.url, cues = own ? SONG_CUES : evenCues(len);

  // the typing sound loops while anything types (Web Audio, started on the first play, which counts as a user gesture)
  const sfx = useRef<{ ctx?: AudioContext; typing?: AudioBuffer; src?: AudioBufferSourceNode; gain?: GainNode }>({});
  const typing = own && playing && TYPING.some(([a, b]) => t >= a && t < b);
  useEffect(() => {
    const x = sfx.current;
    if (playing && !x.ctx) {
      x.ctx = new AudioContext();
      x.gain = x.ctx.createGain(); x.gain.gain.value = 0.7; x.gain.connect(x.ctx.destination);
      void fetch("/video/sfx/typing.mp3").then((r) => r.arrayBuffer()).then((b) => x.ctx!.decodeAudioData(b)).then((buf) => { x.typing = buf; });
    }
    if (typing && !x.src && x.ctx && x.typing) {
      const src = x.ctx.createBufferSource();
      src.buffer = x.typing; src.loop = true; src.connect(x.gain!);
      src.start(0, (t * 1.7) % (x.typing.duration - 0.5)); // a different stretch of keys each time
      x.src = src;
    } else if (!typing && x.src) {
      x.src.stop(); x.src = undefined;
    }
  }, [typing, playing, t]);
  // the Blender shot sits behind our phone: ours fades in exactly on top of its phone, then the set around it fades to black
  const inClip = own && t < PLAN.clip + 0.7, clipFade = 1 - Math.max(0, Math.min(1, (t - PLAN.clip - 0.1) / 0.6));
  const phoneIn = own ? Math.max(0, Math.min(1, (t - PLAN.clip) / 0.15)) : 1;
  // keep the Blender clip on the song's clock: play along, re-sync when it drifts or after a seek
  const clip = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = clip.current;
    if (!v) return;
    if (Math.abs(v.currentTime - t) > 0.08) v.currentTime = Math.min(t, PLAN.clip);
    if (playing && inClip) { if (v.paused) void v.play(); } else if (!v.paused) v.pause();
  }, [t, playing, inClip]);

  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      <HeroScroll apk="#" progress={progressAt(t, cues)} video beat={own ? beatAt(t) : 0} phoneIn={phoneIn}
        backdrop={own && <video ref={clip} src={CLIP} muted playsInline preload="auto" className="absolute inset-0 z-[5] h-full w-full bg-black object-cover" style={{ opacity: inClip ? clipFade : 0 }} />} />
      {song && <audio ref={audio} src={song.url} preload="auto" onLoadedMetadata={(e) => setLen(song.url === SONG.url ? PLAN.end : e.currentTarget.duration)} onEnded={() => setPlaying(false)} />}

      {own && (() => {
        const c = cursorAt(t);
        return c && (
          <div className="pointer-events-none fixed inset-0 z-[57]" aria-hidden>
            {c.ring > 0 && <div className="absolute rounded-full border-4 border-lime-300" style={{ left: `${c.x}vw`, top: `${c.y}vh`, width: 90, height: 90, transform: `translate(-50%,-50%) scale(${0.3 + c.ring * 1.8})`, opacity: 1 - c.ring }} />}
            <svg viewBox="0 0 24 24" className="absolute drop-shadow-[0_6px_10px_rgba(0,0,0,.6)]" style={{ left: `${c.x}vw`, top: `${c.y}vh`, width: 40, opacity: c.fade, transform: `translate(-18%,-8%) scale(${1 - c.press * 0.2})` }}>
              <path d="M4 2.5 20 11l-7 2.2-3.4 7.3z" fill="#fff" stroke="#09090b" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
        );
      })()}
      {ui && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex items-center gap-3 bg-zinc-950/80 px-4 py-3 text-sm backdrop-blur">
          <button onClick={() => play(!playing)} className="w-20 rounded-lg bg-lime-400 py-1.5 font-semibold text-zinc-950">{playing ? "Pause" : "Play"}</button>
          <span className="w-24 tabular-nums text-zinc-400">{mmss(t)} / {mmss(len)}</span>
          <input type="range" min={0} max={len} step={0.01} value={t} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-lime-400" aria-label="Position" />
          <label className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
            {song ? `♪ ${song.name.length > 24 ? song.name.slice(0, 22) + "…" : song.name}` : "Choose a song"}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
          </label>
          <span className="hidden text-xs text-zinc-500 lg:block">Space · ← → · H hides this · drop a song anywhere</span>
        </div>
      )}
    </div>
  );
}
