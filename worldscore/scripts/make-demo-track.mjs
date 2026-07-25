// Synthesises a 120 BPM track with deliberate structure so the analyser can be
// validated without shipping a copyrighted demo file. Writes a 16-bit mono WAV.
//
//   node scripts/make-demo-track.mjs public/demo-track.wav

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const RATE = 44_100;
const BPM = 120;
const BEAT = 60 / BPM;

/** role, duration in seconds, level 0..1, brightness 0..1 */
const SECTIONS = [
  ["intro", 16, 0.18, 0.75],
  ["verse", 24, 0.5, 0.4],
  ["build", 16, 0.62, 0.7],
  ["drop", 24, 1.0, 0.85],
  ["breakdown", 12, 0.22, 0.3],
  ["chorus", 20, 0.95, 0.8],
  ["outro", 12, 0.25, 0.45],
];

const total = SECTIONS.reduce((n, s) => n + s[1], 0);
const samples = Math.floor(total * RATE);
const out = new Float32Array(samples);

let cursor = 0;
for (const [, duration, level, brightness] of SECTIONS) {
  const start = Math.floor(cursor * RATE);
  const end = Math.min(samples, Math.floor((cursor + duration) * RATE));

  for (let i = start; i < end; i++) {
    const t = i / RATE;
    const local = t - cursor;

    // Sustained pad: low drone plus a brightness-dependent upper partial.
    let v = 0.22 * Math.sin(2 * Math.PI * 55 * t);
    v += 0.16 * brightness * Math.sin(2 * Math.PI * 220 * t);
    v += 0.1 * brightness * Math.sin(2 * Math.PI * 880 * t);

    // Kick on every beat: a fast pitch-swept sine with a sharp decay.
    const intoBeat = local % BEAT;
    if (intoBeat < 0.12) {
      const env = Math.exp(-intoBeat * 38);
      v += 0.95 * env * Math.sin(2 * Math.PI * (150 - 90 * (intoBeat / 0.12)) * intoBeat);
    }

    // Hats on the offbeat, only once the track has real energy.
    const intoOff = (local + BEAT / 2) % BEAT;
    if (level > 0.4 && intoOff < 0.04) {
      v += 0.3 * brightness * Math.exp(-intoOff * 160) * (Math.random() * 2 - 1);
    }

    out[i] = v * level;
  }
  cursor += duration;
}

// Normalise with a little headroom.
let peak = 0;
for (const s of out) peak = Math.max(peak, Math.abs(s));
const gain = peak > 0 ? 0.89 / peak : 1;

const header = Buffer.alloc(44);
const dataBytes = samples * 2;
header.write("RIFF", 0);
header.writeUInt32LE(36 + dataBytes, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(dataBytes, 40);

const pcm = Buffer.alloc(dataBytes);
for (let i = 0; i < samples; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(out[i] * gain * 32767))), i * 2);
}

const target = process.argv[2] ?? "public/demo-track.wav";
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, Buffer.concat([header, pcm]));
console.log(`wrote ${target} — ${total}s, ${BPM} BPM, ${SECTIONS.length} sections`);
