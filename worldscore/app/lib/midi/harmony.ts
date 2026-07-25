import type { MidiScore } from "./parse";

/**
 * Harmony read straight off the notes instead of inferred from a spectrum.
 *
 * This is the reason MIDI is worth supporting at all. Estimating chroma from
 * audio means fighting overtones, percussion and reverb, and the result is
 * often honestly ambiguous. A score has no such problem: we know exactly which
 * pitches sound and when, so key, mode and dissonance become measurements
 * rather than guesses — and the season, which hangs off mode, stops wobbling.
 */
export interface MidiHarmony {
  /** Interleaved 12-bin chroma, one group per texture frame. */
  chroma: Float32Array;
  /** Mean sounding MIDI pitch per texture frame, 0 where nothing sounds. */
  pitch: Float32Array;
  frameCount: number;
}

export function harmonyGrid(score: MidiScore, textureHz: number): MidiHarmony {
  const frameCount = Math.max(1, Math.ceil((score.durationMs / 1000) * textureHz));
  const chroma = new Float32Array(frameCount * 12);
  const pitch = new Float32Array(frameCount);
  const weights = new Float32Array(frameCount);

  for (const note of score.notes) {
    // Drums carry no pitch information — a kick mapped to C would tilt the key
    // of every four-to-the-floor track toward C major.
    if (note.isDrum) continue;

    const from = Math.max(0, Math.floor((note.timeMs / 1000) * textureHz));
    const to = Math.min(
      frameCount,
      Math.max(from + 1, Math.ceil(((note.timeMs + note.durationMs) / 1000) * textureHz)),
    );
    const pc = ((note.midi % 12) + 12) % 12;
    const weight = Math.max(note.velocity, 0.05);

    for (let t = from; t < to; t++) {
      chroma[t * 12 + pc] += weight;
      pitch[t] += note.midi * weight;
      weights[t] += weight;
    }
  }

  for (let t = 0; t < frameCount; t++) {
    if (weights[t] > 0) pitch[t] /= weights[t];

    // Normalise each frame so a fortissimo chord doesn't outvote a whole quiet
    // passage when frames get averaged into the key window.
    let sum = 0;
    for (let c = 0; c < 12; c++) sum += chroma[t * 12 + c];
    if (sum > 0) {
      for (let c = 0; c < 12; c++) chroma[t * 12 + c] /= sum;
    }
  }

  return { chroma, pitch, frameCount };
}
