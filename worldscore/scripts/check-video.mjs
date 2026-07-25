/**
 * Verifies the video-upload path: an MP4 is accepted, its audio track is
 * decoded and analysed like any other track, and that same file is playable
 * through the element the players use as their clock.
 *
 * Usage: node scripts/check-video.mjs [baseUrl] [file.mp4]
 */
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

console.log(`\nuploading ${clip}`);
await page.setInputFiles('input[type="file"]', clip);

// The concept board only renders once decode, analysis and concept generation
// have all succeeded, so reaching it exercises the whole prepare path.
const reached = await page
  .getByText(/choose a direction|choose a world|direction/i)
  .first()
  .waitFor({ timeout: 120_000 })
  .then(() => true)
  .catch(() => false);

check("the MP4's audio was decoded and analysed", reached, reached ? "reached the concept board" : "never left analysis");

if (!reached) {
  const err = await page.locator("text=/couldn't|error|failed/i").first().textContent().catch(() => null);
  if (err) console.log(`    UI said: ${err.trim()}`);
}

const stats = await page.evaluate(() => {
  const el = document.body.innerText;
  return el.slice(0, 600);
});

const bpm = /(\d+)\s*bpm/i.exec(stats);
check("it read a tempo out of the video's audio", Boolean(bpm), bpm ? `${bpm[1]} bpm` : "no bpm shown");

// The players drive playback through a media element pointed at this same file,
// so confirm the browser will actually play it rather than just decode it.
const playback = await page.evaluate(async () => {
  const input = document.querySelector('input[type="file"]');
  const file = input?.files?.[0];
  if (!file) return { error: "no file on the input" };

  const audio = document.createElement("audio");
  audio.src = URL.createObjectURL(file);
  document.body.appendChild(audio);
  try {
    await audio.play();
    await new Promise((r) => setTimeout(r, 1200));
    return { paused: audio.paused, t: audio.currentTime, duration: audio.duration };
  } catch (e) {
    return { error: String(e) };
  } finally {
    URL.revokeObjectURL(audio.src);
  }
});

check(
  "the MP4 plays through an audio element",
  Boolean(playback && !playback.error && !playback.paused && playback.t > 0),
  playback?.error ?? `t=${playback?.t?.toFixed(2)}s of ${playback?.duration?.toFixed(1)}s`,
);

await page.screenshot({ path: "video-upload.png", fullPage: false });
await browser.close();

console.log(
  failures ? `\n${failures} video check(s) failed\n` : "\nall video checks passed\n",
);
process.exit(failures ? 1 : 0);
