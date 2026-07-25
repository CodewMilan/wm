// Drives a real Explore session end to end against Reactor, to prove the arming
// handshake actually gets the model generating. This opens a real GPU session,
// so it disconnects as soon as it has an answer.
//
//   node scripts/check-explore-live.mjs [url]

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100";
/** "explore" drives LingBot with a seed image; "watch" drives LongLive. */
const mode = process.argv[3] === "watch" ? "watch" : "explore";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();

const errors = [];
const commandErrors = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (/command_error/.test(text)) commandErrors.push(text);
  if (msg.type() === "error") errors.push(text);
});
page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

try {
  await page.goto(url, { waitUntil: "networkidle" });

  console.log("\nloading a track");
  await page.click("text=the MIDI one");
  await page.waitForSelector("text=/Pick a world to enter|Five directions/", { timeout: 180_000 });
  console.log("  reached the concept board");

  console.log(`\nentering ${mode} mode`);
  if (mode === "explore") {
    await page.click("button:has-text('Explore')");
    await page.waitForSelector("text=Pick a world to enter", { timeout: 30_000 });
    // The first seed card is the best-ranked fit for the track.
    await page.locator("main >> button >> img").first().click();
    console.log("  seed chosen, session opening");
  } else {
    await page.click("button:has-text('Watch')");
    await page.waitForSelector("text=Five directions", { timeout: 30_000 });
    await page.locator("main .grid > button").first().click();
    console.log("  direction chosen, session opening");
  }

  // Follow the arming stages as the handshake progresses, which is the part
  // that used to skip straight to a rejected `start`.
  const seen = new Set();
  const deadline = Date.now() + 180_000;
  let started = false;

  while (Date.now() < deadline) {
    const label = await page
      .locator("div.absolute >> p, div.absolute >> span")
      .first()
      .textContent()
      .catch(() => null);
    if (label) {
      const clean = label.replace(/\s+/g, " ").trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        console.log(`  stage: ${clean}`);
      }
    }

    // The overlay disappears once the world has settled and input is accepted.
    const overlay = await page.locator("div.absolute.inset-0").count();
    const video = await page.evaluate(() => {
      const v = document.querySelector("video");
      return v ? { w: v.videoWidth, h: v.videoHeight, t: v.currentTime } : null;
    });

    if (video && video.w > 0) {
      started = true;
      console.log(`  video streaming: ${video.w}x${video.h} at t=${video.t.toFixed(1)}s`);
      break;
    }
    if (overlay === 0) break;

    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: `${mode}-live.png` });

  const noPromptSet = commandErrors.some((e) => /No prompt set|no shot has been set/i.test(e));
  check("no 'No prompt set' rejection", !noPromptSet, commandErrors.join(" | ") || "clean");
  check("the model started generating frames", started, started ? "frames arriving" : "never started");

  const shownError = await page.locator("p.text-red-400").first().textContent().catch(() => null);
  check("no error shown in the UI", !shownError, shownError ?? "none");

  if (commandErrors.length) {
    console.log(`\n  command errors seen (${commandErrors.length}):`);
    for (const e of commandErrors.slice(0, 5)) console.log(`    ${e}`);
  }
} catch (error) {
  failures++;
  console.log(`  FAIL  ${error.message}`);
  await page.screenshot({ path: "explore-live-failure.png" }).catch(() => {});
} finally {
  // Leaving the page tears the session down via the pagehide handler.
  await page.close();
  await browser.close();
}

console.log(`\n${failures === 0 ? "live explore checks passed" : `${failures} live check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
