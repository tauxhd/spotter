"use client";
// The ad video, as a web page: the landing page's hero animation (components/HeroScroll) driven by a clock instead of
// the scroll, played to music. Drop an audio file anywhere (or pick one) and the animation stretches to the song.
// Space plays / pauses, ← → skip a second, H hides the controls (or ?clean for recording).
// With the default song (public/video/song.mp3) the hero is cut to its beats (SONG, songCues); any other song you drop
// just spreads the hero evenly over its length.
import { useCallback, useEffect, useRef, useState } from "react";

import HeroScroll, { HERO, heroMoments } from "@/components/HeroScroll";
import { BEATS } from "./beats";

const SONG = { url: "/video/song.mp3", name: "Dance Baby · Infraction" };
// Where each part sits in the song (s), all on bar lines: a quiet sax intro, the beat drops at 5.2 s, a softer stretch
// from ~24 s (the Eat scene's typing), the energy back at ~44 s (Ranks climbing), and the drop-off at ~64 s for the logo.
const PLAN = { hold: 2.6, intro: 5.18, scenes: [5.18, 17.95, 28.26, 41.12, 51.46, 62.95], logo: 64.25, end: 69.06 };

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
  const o0 = HERO.intro + HERO.scene * HERO.scenes;
  cues.push([PLAN.logo, o0 + 0.2 * HERO.outro], [PLAN.end, HERO.total]);
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
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Video() {
  const audio = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<{ url: string; name: string } | null>(SONG);
  const [len, setLen] = useState(PLAN.end); // the song's length (60 s with no song)
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
      if (now >= len) { setT(len); setPlaying(false); return; }
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
  return (
    <div className="relative h-dvh overflow-hidden bg-zinc-950 text-zinc-100 [color-scheme:dark]">
      <HeroScroll apk="#" progress={progressAt(t, cues)} video beat={own ? beatAt(t) : 0} />
      {song && <audio ref={audio} src={song.url} preload="auto" onLoadedMetadata={(e) => setLen(e.currentTarget.duration)} onEnded={() => setPlaying(false)} />}

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
