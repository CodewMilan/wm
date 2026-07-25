// Writes public/demo-track.mid — a structured piece for exercising the MIDI
// path by hand. It deliberately moves through register, mode and density so the
// climate engine has something to react to: minor and low in the breakdown,
// major and high in the choruses.
//
//   node scripts/make-demo-midi.mjs

import { writeFileSync } from "node:fs";
import midiPkg from "@tonejs/midi";

// @tonejs/midi ships CommonJS, which Node's ESM loader won't destructure.
const { Midi } = midiPkg;

const BPM = 104;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const CHORDS = {
  Am: [57, 60, 64],
  F: [53, 57, 60],
  C: [60, 64, 67],
  G: [55, 59, 62],
  Dm: [50, 53, 57],
  E: [52, 56, 59], // the G# that makes the minor sections read as minor
};
const ROOTS = { Am: 33, F: 29, C: 36, G: 31, Dm: 26, E: 28 };

const SCALE_MINOR = [57, 59, 60, 62, 64, 65, 67, 69];
const SCALE_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72];

/**
 * Each section names its own harmony, density and register. Keeping it
 * declarative makes it obvious at a glance that the piece actually goes
 * somewhere, which is the whole reason this file exists.
 */
const SECTIONS = [
  { name: "intro", bars: 8, chords: ["Am", "Am", "F", "F"], pad: 0.3, bass: false, drums: false, lead: null, octave: 0 },
  { name: "verse", bars: 12, chords: ["Am", "F", "C", "G"], pad: 0.45, bass: true, drums: "soft", lead: "minor", octave: 0 },
  { name: "build", bars: 8, chords: ["Am", "F", "Dm", "E"], pad: 0.6, bass: true, drums: "soft", lead: "minor", octave: 1 },
  { name: "chorus", bars: 16, chords: ["C", "G", "Am", "F"], pad: 0.8, bass: true, drums: "full", lead: "major", octave: 1 },
  { name: "breakdown", bars: 10, chords: ["Am", "Am", "E", "E"], pad: 0.35, bass: true, drums: false, lead: null, octave: -1 },
  { name: "chorus 2", bars: 16, chords: ["C", "G", "F", "C"], pad: 0.9, bass: true, drums: "full", lead: "major", octave: 1 },
  { name: "outro", bars: 8, chords: ["F", "C", "F", "C"], pad: 0.4, bass: false, drums: false, lead: null, octave: 0 },
];

const midi = new Midi();
midi.header.setTempo(BPM);
midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });

const pad = midi.addTrack();
pad.name = "pad";
pad.instrument.number = 48; // string ensemble

const bass = midi.addTrack();
bass.name = "bass";
bass.instrument.number = 33; // fingered bass

const lead = midi.addTrack();
lead.name = "lead";
lead.instrument.number = 0; // piano

const drums = midi.addTrack();
drums.name = "drums";
drums.channel = 9;

let bar = 0;
for (const section of SECTIONS) {
  for (let b = 0; b < section.bars; b++) {
    const time = bar * BAR;
    const chordName = section.chords[b % section.chords.length];
    const chord = CHORDS[chordName];

    for (const note of chord) {
      pad.addNote({
        midi: note + section.octave * 12,
        time,
        duration: BAR * 0.98,
        velocity: section.pad,
      });
    }

    if (section.bass) {
      for (let i = 0; i < 2; i++) {
        bass.addNote({
          midi: ROOTS[chordName],
          time: time + i * BEAT * 2,
          duration: BEAT * 1.6,
          velocity: 0.75,
        });
      }
    }

    if (section.lead) {
      const scale = section.lead === "major" ? SCALE_MAJOR : SCALE_MINOR;
      for (let i = 0; i < 4; i++) {
        // A wandering line rather than a random one: mostly steps, so it reads
        // as a melody instead of as noise in the chroma.
        const step = (bar * 3 + i * 2) % scale.length;
        lead.addNote({
          midi: scale[step] + section.octave * 12,
          time: time + i * BEAT,
          duration: BEAT * 0.85,
          velocity: 0.6 + (i === 0 ? 0.12 : 0),
        });
      }
    }

    if (section.drums) {
      const full = section.drums === "full";
      for (let beat = 0; beat < 4; beat++) {
        const t = time + beat * BEAT;
        if (beat === 0 || (full && beat === 2)) {
          drums.addNote({ midi: 36, time: t, duration: 0.12, velocity: 0.9 });
        }
        if (beat === 1 || beat === 3) {
          drums.addNote({ midi: 38, time: t, duration: 0.12, velocity: 0.8 });
        }
        for (let eighth = 0; eighth < (full ? 2 : 1); eighth++) {
          drums.addNote({
            midi: 42,
            time: t + eighth * (BEAT / 2),
            duration: 0.06,
            velocity: full ? 0.5 : 0.35,
          });
        }
      }
      if (full && b % 8 === 7) {
        drums.addNote({ midi: 49, time: time, duration: 0.8, velocity: 0.85 });
      }
    }

    bar++;
  }
}

writeFileSync("public/demo-track.mid", Buffer.from(midi.toArray()));

const totalNotes = midi.tracks.reduce((n, t) => n + t.notes.length, 0);
console.log(
  `wrote public/demo-track.mid — ${bar} bars, ${(bar * BAR).toFixed(1)}s, ${totalNotes} notes, ${BPM} BPM`,
);
