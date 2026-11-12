// Renders the ad (the /video page) to an MP4: headless Chrome steps the page frame by frame (/video?render, its
// window.__render.seek), each frame is captured at 1920x1080, then ffmpeg encodes the frames and mixes the song with every
// sound effect at the times the page lists (window.__render.sfx).
//
// Needs the dev server on :3000, Chrome, ffmpeg on the PATH and puppeteer-core (kept out of the app's dependencies):
//   npm i puppeteer-core --prefix <somewhere>;  NODE_PATH=<somewhere>/node_modules node tools/render-video.cjs [out.mp4]
const puppeteer = require("puppeteer-core");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 30, W = 1920, H = 1080;
const ROOT = path.join(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "video", "out", "spotter-ad.mp4"));
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FRAMES = fs.mkdtempSync(path.join(os.tmpdir(), "spotter-frames-"));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    args: [`--window-size=${W},${H}`, "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/video?render", { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction("window.__render", { timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); // the dev server's badge stays out of the frame
  const all = await page.evaluate(() => ({ end: window.__render.end, song: window.__render.song, sfx: window.__render.sfx }));
  const end = Math.min(all.end, Number(process.env.LIMIT) || Infinity), song = all.song, sfx = all.sfx.filter((e) => e.at < end); // LIMIT=s: a quick test
  const seek = (s) => page.evaluate((s) => window.__render.seek(s), s);

  // warm up: visit every part once so images, models and fonts are loaded before the real pass
  for (let s = 0; s < end && !process.env.LIMIT; s += 2.5) { await seek(s); await new Promise((r) => setTimeout(r, 400)); }

  const n = Math.ceil(end * FPS);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await seek(i / FPS);
    await page.screenshot({ path: path.join(FRAMES, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (i % 60 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();

  // the mix: the song for the cut's length, plus every sound effect delayed to its time
  const inputs = ["-framerate", String(FPS), "-i", path.join(FRAMES, "f%05d.jpg"), "-i", path.join(ROOT, "public", song)];
  const filters = [`[1:a]atrim=0:${end.toFixed(3)},asetpts=PTS-STARTPTS[song]`], labels = ["[song]"];
  sfx.forEach((e, i) => {
    inputs.push("-i", path.join(ROOT, "public", e.file));
    const k = i + 2, ms = Math.round(e.at * 1000);
    const trim = e.dur !== undefined ? `atrim=start=${(e.offset || 0).toFixed(3)}:duration=${e.dur.toFixed(3)},afade=t=out:st=${Math.max(0, e.dur - 0.06).toFixed(3)}:d=0.06,`
      : e.offset ? `atrim=start=${e.offset.toFixed(3)},` : "";
    filters.push(`[${k}:a]${trim}asetpts=PTS-STARTPTS,adelay=${ms}|${ms}[s${i}]`);
    labels.push(`[s${i}]`);
  });
  filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=first,alimiter=limit=0.95[mix]`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[mix]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], { stdio: "inherit" });
  try { fs.rmSync(FRAMES, { recursive: true, force: true }); } catch { /* Windows can hold a frame file a moment longer; the temp folder is harmless */ }
  console.log(`done: ${OUT} (${n} frames, ${sfx.length} sound effects)`);
})().catch((e) => { console.error(e); process.exit(1); });
