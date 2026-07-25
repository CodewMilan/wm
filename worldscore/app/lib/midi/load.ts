import { TEXTURE_HZ } from "../audio/analyze";
import { analyzeAudioBuffer } from "../audio/decode";
import type { AudioAnalysis } from "../audio/types";
import { encodeWav } from "../audio/wav";
import { harmonyGrid } from "./harmony";
import { parseMidi, type MidiScore } from "./parse";
import { synthesize } from "./synth";

export interface LoadedMidi {
  analysis: AudioAnalysis;
  /** Blob URL for the synthesised audio, which the player treats as the track. */
  audioUrl: string;
  score: MidiScore;
}

/**
 * Turn a MIDI file into something the rest of the app can treat as a track:
 * render it to audio so there is a clock and something to hear, then analyse
 * that audio while feeding the analyser the exact harmony from the score.
 */
export async function loadMidi(file: File): Promise<LoadedMidi> {
  const score = parseMidi(await file.arrayBuffer());
  const buffer = await synthesize(score);
  const audioUrl = URL.createObjectURL(encodeWav(buffer));

  // The audio keeps its reverb tail so it doesn't end abruptly, but analysis
  // stops at the last note: everything after it is decay, not music.
  const lastNoteEnd = score.notes.reduce((max, n) => Math.max(max, n.timeMs + n.durationMs), 0);

  const grid = harmonyGrid(score, TEXTURE_HZ);
  const analysis = await analyzeAudioBuffer(
    buffer,
    {
      chroma: grid.chroma,
      pitch: grid.pitch,
      bpm: score.bpm,
      // MIDI time zero is the downbeat, so there is no phase to hunt for.
      beatPhaseMs: 0,
    },
    lastNoteEnd,
  );

  return { analysis, audioUrl, score };
}
