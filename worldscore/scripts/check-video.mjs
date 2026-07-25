/**
 * Verifies the video-upload path: an MP4 is accepted, its audio track is
 * decoded and analysed like any other track, and that same file is playable
 * through the element the players use as their clock.
 *
 * Usage: node scripts/check-video.mjs [baseUrl] [file.mp4]
 */
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3100";
const clip = process.argv[3] || "/tmp/mov_bbb.mp4";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log(`    pageerror: ${e.message}`));

await page.goto(base, { waitUntil: "networkidle" });

// Check playback before uploading: the file input belongs to the upload screen
// and is gone by the time analysis finishes, so the bytes go in directly.
const playback = await page.evaluate(async (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const audio = document.createElement("audio");
  audio.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
  document.body.appendChild(audio);
  try {
    await audio.play();
    await new Promise((r) => setTimeout(r, 1200));
    return { paused: audio.paused, t: audio.currentTime, duration: audio.duration };
  } catch (e) {
    return { error: String(e) };
  } finally {
    URL.revokeObjectURL(audio.src);
    audio.remove();
  }
}, readFileSync(clip).toString("base64"));

check(
  "the MP4 plays through an audio element",
  Boolean(playback && !playback.error && !playback.paused && playback.t > 0),
  playback?.error ?? `t=${playback?.t?.toFixed(2)}s of ${playback?.duration?.toFixed(1)}s`,
);

console.log(`\nuploading ${clip}`);
await page.setInputFiles('input[type="file"]', clip);

// The concept board only renders once decode, analysis and concept generation
// have all succeeded, so reaching it exercises the whole prepare path.
const reached = await page
  .waitForSelector("text=/Pick a world to enter|Five directions/", { timeout: 180_000 })
  .then(() => true)
  .catch(() => false);

check("the MP4's audio was decoded and analysed", reached, reached ? "reached the concept board" : "never left analysis");

if (!reached) {
  const err = await page.locator("text=/couldn't|error|failed/i").first().textContent().catch(() => null);
  if (err) console.log(`    UI said: ${err.trim()}`);
}

const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const bpm = /(\d+)\s*bpm/i.exec(text);
check(
  "it read a tempo out of the video's audio",
  Boolean(bpm),
  bpm ? `${bpm[1]} bpm` : `no bpm in: ${text.slice(0, 160)}`,
);

const cards = await page.locator("div.grid > button").count();
check("it produced world directions to choose from", cards === 5, `${cards} direction(s)`);

await page.screenshot({ path: "video-upload.png", fullPage: false });
await browser.close();

console.log(
  failures ? `\n${failures} video check(s) failed\n` : "\nall video checks passed\n",
);
process.exit(failures ? 1 : 0);
