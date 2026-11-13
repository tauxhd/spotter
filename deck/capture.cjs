// Photographs every screen of the web app (the demo account, /?demo=1) at phone size, for the slide deck (deck/build.cjs).
// Needs the dev server on :3000, Chrome and puppeteer-core (kept out of the app's dependencies):
//   NODE_PATH=<folder with puppeteer-core>/node_modules node deck/capture.cjs [only,these,names]
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "shots");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required"],
  });

  // a fresh phone-sized tab; `demo` signs in to the made-up demo account
  async function tab(demo = true) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      const hide = () => document.head && document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "nextjs-portal{display:none!important}html{scrollbar-width:none}" }));
      document.addEventListener("DOMContentLoaded", hide);
    });
    page.demo = demo;
    return page;
  }
  const nav = async (page, full) => { for (let i = 0; ; i++) { try { return await page.goto(full, { waitUntil: "networkidle2", timeout: 90000 }); } catch (e) { if (i >= 5) throw e; await wait(4000); } } }; // the dev server can blink while it recompiles
  const go = async (page, url, ms = 3500) => { await nav(page, BASE + url + (page.demo ? (url.includes("?") ? "&" : "?") + "demo=1&t=18:00" : "")); await wait(ms); };
  const goOld = async (page, url, ms = 3500) => { await page.goto(BASE + url + (page.demo ? (url.includes("?") ? "&" : "?") + "demo=1&t=18:00" : ""), { waitUntil: "networkidle2", timeout: 90000 }); await wait(ms); };
  const shot = async (page, name) => { if (only && !only.has(name)) return; await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("shot", name); };
  // click the first element whose text matches
  const click = (page, re, sel = "button,a,[role=button],summary", nth = 0) => page.evaluate((src, sel, nth) => {
    const els = [...document.querySelectorAll(sel)].filter((e) => new RegExp(src, "i").test(e.textContent || e.getAttribute("aria-label") || "") && e.offsetParent !== null);
    const el = els[nth]; if (el) { el.click(); return true; } return false;
  }, re.source, sel, nth);
  const scroll = (page, y) => page.evaluate((y) => window.scrollTo(0, y), y);
  const step = async (name, fn) => { try { await fn(); } catch (e) { console.log("FAILED", name, String(e).slice(0, 120)); } };

  // ---- plain pages ----
  const p = await tab();
  await step("home", async () => { await go(p, "/"); await shot(p, "home"); await scroll(p, 760); await wait(700); await shot(p, "home-scroll"); });
  await step("checkin", async () => { await go(p, "/checkin"); await shot(p, "checkin"); });
  await step("poster", async () => { await go(p, "/poster"); await shot(p, "poster"); });
  await step("map", async () => {
    await go(p, "/map?e=rack", 9000); await shot(p, "map3d");
    await click(p, /floor plan/); await wait(900); await shot(p, "mapplan");
  });
  await step("train", async () => { await go(p, "/train"); await shot(p, "train"); await scroll(p, 900); await wait(600); await shot(p, "train-scroll"); });
  await step("routine", async () => { await go(p, "/train/routine?from=Push"); await shot(p, "routine"); });
  await step("exercise", async () => {
    await go(p, "/exercise/barbell-bench-press"); await shot(p, "exercise"); await scroll(p, 800); await wait(600); await shot(p, "exercise-scroll");
    await go(p, "/exercise/barbell-bench-press/lifts"); await shot(p, "lifts");
  });
  await step("eat", async () => {
    await go(p, "/eat"); await shot(p, "eat"); await scroll(p, 800); await wait(600); await shot(p, "eat-scroll"); await scroll(p, 0);
    await click(p, /^progress$/); await wait(1200); await shot(p, "eat-progress");
    await go(p, "/eat/nasi-lemak-fried-chicken"); await shot(p, "food"); await scroll(p, 700); await wait(600); await shot(p, "food-scroll");
    await go(p, "/eat/plan"); await shot(p, "plan");
  });
  await step("board", async () => {
    await go(p, "/board"); await shot(p, "board"); await scroll(p, 700); await wait(500); await shot(p, "board-scroll"); await scroll(p, 0);
    await click(p, /weight class/); await wait(1200); await shot(p, "board-class");
    await click(p, /^squat$/); await wait(1200); await shot(p, "board-squat");
  });
  await step("feed", async () => {
    await go(p, "/feed"); await shot(p, "feed"); await scroll(p, 700); await wait(500); await shot(p, "feed-scroll");
    await go(p, "/feed");
    if (await click(p, /exercises|just now|ago/, "a")) { await wait(2500); await shot(p, "post"); }
  });
  await step("me", async () => {
    await go(p, "/me"); await shot(p, "me"); await scroll(p, 800); await wait(600); await shot(p, "me-scroll");
    await go(p, "/me/edit"); await shot(p, "edit");
    await go(p, "/settings"); await shot(p, "settings");
  });
  await step("user", async () => {
    await go(p, "/board");
    const href = await p.evaluate(() => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href")).find((h) => /^\/u\//.test(h || "")));
    if (href) { await go(p, href); await shot(p, "user"); await go(p, href.replace(/\?.*/, "") + "/stats"); await shot(p, "userstats"); }
  });

  // ---- the live workout: start a routine, tick sets, open the components on top of it ----
  const w = await tab();
  await step("workout", async () => {
    await go(w, "/train");
    await click(w, /^start( routine)?$/i, "button,a", 0); await wait(2500);
    await shot(w, "workout");
    await w.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /done|tick|complete/i.test(b.getAttribute("aria-label") || "")).slice(0, 8).forEach((b) => b.click())); await wait(900);
    await shot(w, "workout-sets");
    await w.evaluate(() => document.querySelector('button[aria-label="Muscles hit"]')?.click()); await wait(1800); await shot(w, "muscles");
    await w.evaluate(() => document.querySelector("[role=dialog] .snap-x")?.scrollTo({ left: 9999 })); await wait(900); await shot(w, "radar");
    await w.evaluate(() => document.querySelector('[role=dialog] button[aria-label="Close"]')?.click()); await wait(500);
    if (await click(w, /add exercise/)) { await wait(1500); await shot(w, "picker"); await w.keyboard.press("Escape"); await wait(500); }
    await w.evaluate(() => { const d = document.querySelector("[role=dialog]"); d?.querySelector("button[aria-label=Close],button")?.click(); });
    if (await click(w, /^finish/)) { await wait(2500); await shot(w, "finish"); }
  });

  // ---- the first-launch quest, as a brand-new student (no demo account) ----
  const q = await tab(false);
  await step("quest", async () => {
    await go(q, "/", 4500); await shot(q, "quest-hello");
    await click(q, /./, "button.btn,button[type=button],button", 0).catch(() => {});
    await wait(1500); await shot(q, "quest-2");
  });

  await browser.close();
  console.log("done");
})().catch((e) => { console.error(e); process.exit(1); });
