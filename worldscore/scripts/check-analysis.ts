// Runs the browser analyser headlessly against a 16-bit mono WAV so the DSP can
// be verified without a browser.
//
//   npx tsx scripts/check-analysis.ts public/demo-track.wav

import { readFileSync } from "node:fs";
import { analyzePcm } from "../app/lib/audio/analyze";
import { fallbackDirections } from "../app/lib/concepts/generate";
import { compileScore, CHUNK_MS, SCENE_MAX_CHUNKS } from "../app/lib/world/score";

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
console.log(
  `  key         ${analysis.key.tonicName} ${analysis.key.mode} ` +
    `(confidence ${analysis.key.confidence.toFixed(2)}, majorness ${analysis.key.majorness.toFixed(2)})`,
);
console.log(
  `  register    MIDI ${analysis.meanPitchMidi.toFixed(1)}  tension ${analysis.meanTension.toFixed(2)}`,
);
console.log(`  mood        ${analysis.moodTags.join(", ")}`);

if (analysis.keyChanges.length) {
  console.log(`\n  key changes (${analysis.keyChanges.length}):`);
  for (const k of analysis.keyChanges) {
    console.log(
      `    ${(k.atMs / 1000).toFixed(1).padStart(6)}s  ${k.from} → ${k.to} ` +
        `(${k.semitones > 0 ? "+" : ""}${k.semitones} semitones)`,
    );
  }
}

console.log(`\n  sections (${analysis.sections.length}):`);
for (const s of analysis.sections) {
  console.log(
    `    ${(s.startMs / 1000).toFixed(1).padStart(6)}s → ${(s.endMs / 1000).toFixed(1).padStart(6)}s  ` +
      `${s.role.padEnd(10)} energy ${s.energy.toFixed(2)}  bright ${s.brightness.toFixed(2)}  ` +
      `reg ${s.register.toFixed(2)}  maj ${s.majorness.toFixed(2)}  tens ${s.tension.toFixed(2)}` +
      `${s.isImpact ? "  IMPACT" : ""}`,
  );
}

// Compile the first direction's score and assert the invariant that actually
// breaks generation: a scene must be cut before LongLive's 48-chunk ceiling.
const direction = fallbackDirections(analysis)[0];
const score = compileScore(analysis, direction);

console.log(`\n  score for "${direction.name}" (${score.cues.length} cues):`);
let lastCutMs = 0;
let worstChunks = 0;
for (const cue of score.cues) {
  const sinceCut = cue.atMs - lastCutMs;
  const chunks = sinceCut / CHUNK_MS;
  if (cue.kind === "cut") {
    worstChunks = Math.max(worstChunks, chunks);
    lastCutMs = cue.atMs;
  }
  console.log(
    `    ${(cue.atMs / 1000).toFixed(1).padStart(6)}s  ${cue.kind.padEnd(4)}  ${cue.reason}`,
  );
}
const tailChunks = (analysis.durationMs - lastCutMs) / CHUNK_MS;
worstChunks = Math.max(worstChunks, tailChunks);

console.log(`\n  longest scene: ${worstChunks.toFixed(1)} chunks (ceiling ${SCENE_MAX_CHUNKS})`);
if (worstChunks >= SCENE_MAX_CHUNKS) {
  console.error("  FAIL: a scene exceeds the chunk ceiling and would stop generating");
  process.exit(1);
}
console.log("  OK: every scene stays inside the budget\n");

console.log(`  opening prompt:\n    ${score.cues[0].prompt}\n`);
