// Verifies the MIDI path without a browser: writes test scores in known keys,
// parses them back, and checks that the harmony grid recovers the right key and
// that a full analysis comes out the far end.
//
// Synthesis itself needs Web Audio, so it is exercised in the browser instead;
// everything here is the part that decides what the world actually does.
//
//   npx tsx scripts/check-midi.ts

import { Midi } from "@tonejs/midi";
import { analyzePcm, TEXTURE_HZ } from "../app/lib/audio/analyze";
import { detectKey, meanChroma } from "../app/lib/audio/dsp";
import { harmonyGrid } from "../app/lib/midi/harmony";
import { parseMidi } from "../app/lib/midi/parse";
import { compileScore } from "../app/lib/world/score";
import { fallbackDirections } from "../app/lib/concepts/generate";

const SEC_PER_BAR = 2;

interface TestCase {
  name: string;
  expect: string;
  bpm: number;
  /** Chords as MIDI note numbers, one per bar. */
  chords: number[][];
  melody: number[];
}

const CASES: TestCase[] = [
  {
    name: "C major I-V-vi-IV",
    expect: "C major",
    bpm: 120,
    chords: [
      [48, 52, 55, 60],
      [43, 47, 50, 55],
      [45, 48, 52, 57],
      [41, 45, 48, 53],
    ],
    melody: [72, 71, 69, 67, 69, 71, 72, 76],
  },
  {
    name: "A minor with leading tone",
    expect: "A minor",
    bpm: 96,
    chords: [
      [45, 48, 52, 57],
      [50, 53, 57, 62],
      [40, 44, 47, 56], // E major: the G# is what makes this minor, not C major
      [45, 48, 52, 57],
    ],
    melody: [69, 71, 72, 74, 76, 77, 80, 81],
  },
  {
    name: "Eb major",
    expect: "D# major", // the DSP names black keys sharp
    bpm: 140,
    chords: [
      [51, 55, 58, 63],
      [46, 50, 53, 58],
      [56, 60, 63, 68],
      [51, 55, 58, 63],
    ],
    melody: [75, 77, 79, 80, 82, 80, 79, 77],
  },
];

/** Build a Standard MIDI File so we exercise the real parser, not a stub. */
function writeMidi(test: TestCase, repeats = 4): ArrayBuffer {
  const midi = new Midi();
  midi.header.setTempo(test.bpm);

  const pad = midi.addTrack();
  pad.instrument.number = 48; // string ensemble
  const lead = midi.addTrack();
  lead.instrument.number = 0; // piano
  const drums = midi.addTrack();
  drums.channel = 9;

  let bar = 0;
  for (let r = 0; r < repeats; r++) {
    for (const chord of test.chords) {
      const time = bar * SEC_PER_BAR;
      for (const note of chord) {
        pad.addNote({ midi: note, time, duration: SEC_PER_BAR * 0.95, velocity: 0.55 });
      }
      for (let i = 0; i < 2; i++) {
        const step = (bar * 2 + i) % test.melody.length;
        lead.addNote({
          midi: test.melody[step],
          time: time + i * (SEC_PER_BAR / 2),
          duration: SEC_PER_BAR / 2.2,
          velocity: 0.7,
        });
      }
      // Drums are pitched nonsense harmonically; if they leak into the chroma
      // the key detection below will drift, which is exactly what we're testing.
      for (let b = 0; b < 4; b++) {
        drums.addNote({
          midi: b % 2 === 0 ? 36 : 38,
          time: time + b * (SEC_PER_BAR / 4),
          duration: 0.1,
          velocity: 0.8,
        });
      }
      bar++;
    }
  }

  return new Uint8Array(midi.toArray()).buffer;
}

/**
 * A crude additive render, purely so `analyzePcm` has a waveform with the right
 * energy shape. The real synthesiser is far nicer; this only needs to be honest
 * about where the loud parts are.
 */
function renderPcm(
  notes: { timeMs: number; durationMs: number; midi: number; velocity: number; isDrum: boolean }[],
  durationMs: number,
  sampleRate: number,
): Float32Array {
  const pcm = new Float32Array(Math.ceil((durationMs / 1000) * sampleRate));
  for (const note of notes) {
    const start = Math.floor((note.timeMs / 1000) * sampleRate);
    const length = Math.floor((note.durationMs / 1000) * sampleRate);
    const hz = 440 * Math.pow(2, (note.midi - 69) / 12);
    for (let i = 0; i < length; i++) {
      const idx = start + i;
      if (idx >= pcm.length) break;
      const env = Math.exp(-3 * (i / length));
      const t = idx / sampleRate;
      pcm[idx] += note.isDrum
        ? (Math.random() * 2 - 1) * env * note.velocity * 0.3
        : Math.sin(2 * Math.PI * hz * t) * env * note.velocity * 0.18;
    }
  }
  return pcm;
}

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures++;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

for (const test of CASES) {
  console.log(`\n${test.name}`);

  const score = parseMidi(writeMidi(test));
  check(
    "tempo survives the round trip",
    Math.abs(score.bpm - test.bpm) < 0.5,
    `${score.bpm} BPM`,
  );
  check("notes parsed", score.notes.length > 0, `${score.notes.length} notes`);
  check(
    "drums flagged separately",
    score.notes.some((n) => n.isDrum) && score.notes.some((n) => !n.isDrum),
    `${score.notes.filter((n) => n.isDrum).length} drum hits`,
  );

  const grid = harmonyGrid(score, TEXTURE_HZ);
  const key = detectKey(meanChroma(grid.chroma, 0, grid.frameCount));
  check(
    "key detected from the score",
    `${key.tonicName} ${key.mode}` === test.expect,
    `got ${key.tonicName} ${key.mode} (want ${test.expect}), confidence ${key.confidence.toFixed(2)}`,
  );

  const sampleRate = 22_050;
  const pcm = renderPcm(score.notes, score.durationMs, sampleRate);
  const analysis = analyzePcm(pcm, sampleRate, {
    chroma: grid.chroma,
    pitch: grid.pitch,
    bpm: score.bpm,
    beatPhaseMs: 0,
  });

  check(
    "analysis carries the exact key through",
    `${analysis.key.tonicName} ${analysis.key.mode}` === test.expect,
    `${analysis.key.tonicName} ${analysis.key.mode}`,
  );
  check(
    "override wins over tempo estimation",
    Math.abs(analysis.bpm - test.bpm) < 0.5,
    `${analysis.bpm} BPM`,
  );
  check(
    "register reads as real pitch",
    analysis.meanPitchMidi > 40 && analysis.meanPitchMidi < 90,
    `mean MIDI ${analysis.meanPitchMidi.toFixed(1)}`,
  );
  check("sections found", analysis.sections.length > 0, `${analysis.sections.length}`);
  check(
    "curves are the right length",
    analysis.majornessCurve.length === analysis.energyCurve.length &&
      analysis.registerCurve.length === analysis.energyCurve.length,
    `${analysis.energyCurve.length} frames`,
  );

  const mode = analysis.key.mode;
  const majorness = analysis.majornessCurve.reduce((a, b) => a + b, 0) / analysis.majornessCurve.length;
  check(
    "majorness agrees with the detected mode",
    mode === "major" ? majorness > 0.5 : majorness < 0.5,
    `${majorness.toFixed(2)} for ${mode}`,
  );

  // The whole point is that this feeds the world engine, so compile a score too.
  const compiled = compileScore(analysis, fallbackDirections(analysis)[0]);
  const seasons = new Set(compiled.cues.map((c) => c.spec.season).filter(Boolean));
  check("score compiles", compiled.cues.length > 0, `${compiled.cues.length} cues`);
  console.log(`  seasons: ${[...seasons].join(", ") || "none"}`);
  console.log(`  mood: ${analysis.moodTags.slice(0, 6).join(", ")}`);
}

console.log(
  `\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}`,
);
process.exit(failures === 0 ? 0 : 1);
