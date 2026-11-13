// The shots capture.cjs can't get in one pass: the set-type sheet, the finish screen, and the first-launch quest step by step
// (a brand-new student; the demo build accepts any TP number and password).
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "shots");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
  async function tab() {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => document.addEventListener("DOMContentLoaded", () => document.head.appendChild(Object.assign(document.createElement("style"), { textContent: "nextjs-portal{display:none!important}html{scrollbar-width:none}" }))));
    return page;
  }
  const nav = async (page, url) => { for (let i = 0; ; i++) { try { return await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 90000 }); } catch (e) { if (i > 5) throw e; await wait(4000); } } };
  const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("shot", name); };
  const click = (page, re, sel = "button,a") => page.evaluate((src, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => new RegExp(src, "i").test(e.textContent || e.getAttribute("aria-label") || "") && e.offsetParent !== null); if (el) el.click(); return !!el; }, re.source, sel);
  const step = async (n, fn) => { try { await fn(); } catch (e) { console.log("FAILED", n, String(e).slice(0, 140)); } };

  const w = await tab();
  await step("sets", async () => {
    await nav(w, "/train?demo=1&t=18:00"); await wait(3000);
    await click(w, /^start routine$/); await wait(2500);
    await w.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /done|tick|complete/i.test(b.getAttribute("aria-label") || "")).slice(0, 6).forEach((b) => b.click())); await wait(900);
    await click(w, /change set type/); await wait(1200); await shot(w, "settype");
    await w.evaluate(() => document.querySelector("[role=dialog] button")?.click()); await wait(600);
    await w.keyboard.press("Escape"); await wait(500);
    await click(w, /^finish/); await wait(3000); await shot(w, "finish"); console.log("url", w.url());
  });

  const q = await tab();
  await step("quest", async () => {
    await nav(q, "/"); await wait(4500);
    await shot(q, "quest-hello");
    await click(q, /start the quest/); await wait(1800); await shot(q, "quest-login");
    await q.type("input[placeholder=TP012345]", "TP012345"); await q.type("input[type=password]", "demo-pass");
    await click(q, /sign in with apu/); await wait(2200); await shot(q, "quest-found");
    await click(q, /^(that.s me|yes|continue|next|looks right)/i); await wait(1800); await shot(q, "quest-3");
    for (let i = 4; i <= 8; i++) { const ok = await click(q, /^(next|skip for now|continue|done|finish)/); await wait(1700); await shot(q, "quest-" + i); if (!ok) break; }
  });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
