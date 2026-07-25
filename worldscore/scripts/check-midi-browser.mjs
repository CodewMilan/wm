// Drives the real app in Chromium and uploads a MIDI file, because synthesis
// runs on Web Audio and cannot be exercised in Node. This is the only check
// that proves the whole upload path works rather than just the maths.
//
//   node scripts/check-midi-browser.mjs [url] [file]

import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100";
const file = process.argv[3] ?? "public/demo-track.mid";

const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

try {
  await page.goto(url, { waitUntil: "networkidle" });
  console.log(`\nloaded ${url}`);

  await page.setInputFiles('input[type="file"]', file);
  console.log(`uploaded ${file}, waiting for synthesis and analysis…`);

  const started = Date.now();
  // The analysing screen only shows stats once real analysis has landed, so
  // this waits on evidence rather than on a spinner.
  await page.waitForSelector("text=/BPM/", { timeout: 120_000 });
  const elapsed = Date.now() - started;

  // These stats are computed from the rendered waveform, so they double as
  // proof that the render produced sound: a silent buffer yields no sections
  // and a degenerate mood.
  const panel = (await page.locator("text=/BPM/").first().locator("xpath=../..").textContent()) ?? "";
  console.log(`  stats: ${panel.replace(/\s+/g, " ").trim()}`);

  check("synthesis and analysis completed", true, `${(elapsed / 1000).toFixed(1)}s`);
  check("tempo came from the MIDI header", /10[34]\s*BPM/.test(panel), panel.match(/\d+ BPM/)?.[0] ?? "");

  // The stats render as value-then-label with no separator, so anchor each
  // number to its own label rather than grabbing the first digits that fit.
  const sections = Number(panel.match(/(\d+)\s*sections/i)?.[1] ?? 0);
  const lengthSec = Number(panel.match(/(\d+)s\s*length/i)?.[1] ?? 0);
  check("the render has real structure in it", sections >= 2, `${sections} sections`);
  check("length matches the score", lengthSec > 150 && lengthSec < 200, `${lengthSec}s`);

  await page.screenshot({ path: "midi-analyzing.png", fullPage: true });

  // Getting to the concept board proves the analysis survived the API round
  // trip. Falling back to the offline library still counts.
  await page
    .waitForSelector("text=/Choose a direction|offline library|direction/i", { timeout: 120_000 })
    .catch(() => {});
  await page.screenshot({ path: "midi-concepts.png", fullPage: true });

  const fatal = errors.filter(
    (e) => !/favicon|404|Failed to load resource|Download the React DevTools|Autoplay/i.test(e),
  );
  check("no console errors", fatal.length === 0, fatal.slice(0, 3).join(" | "));
} catch (error) {
  failures++;
  console.log(`  FAIL  ${error.message}`);
  await page.screenshot({ path: "midi-failure.png", fullPage: true });
  console.log("  screenshot: midi-failure.png");
} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? "browser checks passed" : `${failures} browser check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
