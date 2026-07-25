// Runs the browser analyser headlessly against a 16-bit mono WAV so the DSP can
// be verified without a browser.
//
//   npx tsx scripts/check-analysis.ts public/demo-track.wav

import { readFileSync } from "node:fs";
import { analyzePcm } from "../app/lib/audio/analyze";

const path = process.argv[2] ?? "public/demo-track.wav";
const buf = readFileSync(path);

const sampleRate = buf.readUInt32LE(24);
const channels = buf.readUInt16LE(22);
const bits = buf.readUInt16LE(34);
if (bits !== 16) throw new Error(`expected 16-bit PCM, got ${bits}`);

// Walk the chunk list rather than assuming the data starts at byte 44.
let offset = 12;
let dataStart = 44;
let dataLength = buf.length - 44;
while (offset + 8 <= buf.length) {
  const id = buf.toString("ascii", offset, offset + 4);
  const size = buf.readUInt32LE(offset + 4);
  if (id === "data") {
    dataStart = offset + 8;
    dataLength = size;
    break;
  }
  offset += 8 + size + (size % 2);
}

const frames = Math.floor(dataLength / 2 / channels);
const pcm = new Float32Array(frames);
for (let i = 0; i < frames; i++) {
  let sum = 0;
  for (let c = 0; c < channels; c++) {
    sum += buf.readInt16LE(dataStart + (i * channels + c) * 2) / 32768;
  }
  pcm[i] = sum / channels;
}

const started = Date.now();
const analysis = analyzePcm(pcm, sampleRate);
const elapsed = Date.now() - started;

console.log(`\nanalysed ${path} in ${elapsed}ms`);
console.log(`  duration    ${(analysis.durationMs / 1000).toFixed(1)}s`);
console.log(`  tempo       ${analysis.bpm} BPM`);
console.log(`  energy      ${analysis.meanEnergy.toFixed(2)}`);
console.log(`  brightness  ${analysis.meanBrightness.toFixed(2)}`);
console.log(`  dynamics    ${analysis.dynamicRange.toFixed(2)}`);
console.log(`  mood        ${analysis.moodTags.join(", ")}`);
console.log(`\n  sections (${analysis.sections.length}):`);
for (const s of analysis.sections) {
  console.log(
    `    ${(s.startMs / 1000).toFixed(1).padStart(6)}s → ${(s.endMs / 1000).toFixed(1).padStart(6)}s  ` +
      `${s.role.padEnd(10)} energy ${s.energy.toFixed(2)}  bright ${s.brightness.toFixed(2)}` +
      `${s.isImpact ? "  IMPACT" : ""}`,
  );
}
