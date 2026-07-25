// Minimal DSP kit: an in-place radix-2 FFT plus the frame-level features the
// analyser needs. Kept dependency-free so it runs unchanged in a worker.

import type { KeyEstimate } from "./types";

/** In-place iterative radix-2 Cooley-Tukey FFT. `re`/`im` length must be a power of two. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len >> 1; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + (len >> 1)] * curRe - im[i + k + (len >> 1)] * curIm;
        const bIm = re[i + k + (len >> 1)] * curIm + im[i + k + (len >> 1)] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + (len >> 1)] = aRe - bRe;
        im[i + k + (len >> 1)] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

export function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  return w;
}

export interface Frames {
  /** Frames per second of the STFT. */
  fps: number;
  count: number;
  rms: Float32Array;
  /** Positive spectral flux — the onset envelope. */
  flux: Float32Array;
  /** Spectral centroid in Hz. */
  centroid: Float32Array;
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
  /**
   * 12-bin pitch-class profile per frame, flattened to `count * 12`. Frame `f`
   * occupies `[f * 12, f * 12 + 12)`. This is what key, mode and dissonance are
   * read from — the harmonic signal the climate mapping runs on.
   */
  chroma: Float32Array;
  /**
   * Magnitude-weighted mean MIDI pitch per frame, over the musical band only.
   * Unlike the spectral centroid this tracks how high the music is *played*
   * rather than how bright it is *produced*, so a muted trumpet and a bright
   * synth playing the same note land in the same place.
   */
  pitch: Float32Array;
}

/** Lowest and highest note we let contribute to chroma and pitch height. */
const PITCH_MIN_HZ = 55; // A1
const PITCH_MAX_HZ = 2093; // C7

/** Run an STFT over mono PCM and reduce each frame to a handful of features. */
export function computeFrames(
  pcm: Float32Array,
  sampleRate: number,
  frameSize = 2048,
  hop = 512,
): Frames {
  const count = Math.max(1, Math.floor((pcm.length - frameSize) / hop) + 1);
  const bins = frameSize >> 1;
  const window = hannWindow(frameSize);
  const binHz = sampleRate / frameSize;

  // Band edges in bins. Low is kick/bass, high is hats/air.
  const lowEnd = Math.max(1, Math.floor(150 / binHz));
  const midEnd = Math.max(lowEnd + 1, Math.floor(2000 / binHz));
  const highStart = Math.max(midEnd + 1, Math.floor(6000 / binHz));

  const rms = new Float32Array(count);
  const flux = new Float32Array(count);
  const centroid = new Float32Array(count);
  const low = new Float32Array(count);
  const mid = new Float32Array(count);
  const high = new Float32Array(count);
  const chroma = new Float32Array(count * 12);
  const pitch = new Float32Array(count);

  // Bin -> pitch lookup, built once. -1 marks a bin outside the musical band,
  // which skips both the sub-bass rumble and the harmonic wash up top where
  // pitch-class estimates stop meaning anything.
  const binPitchClass = new Int8Array(bins).fill(-1);
  const binMidi = new Float32Array(bins);
  for (let b = 1; b < bins; b++) {
    const hz = b * binHz;
    if (hz < PITCH_MIN_HZ || hz > PITCH_MAX_HZ) continue;
    const midi = 69 + 12 * Math.log2(hz / 440);
    binMidi[b] = midi;
    binPitchClass[b] = ((Math.round(midi) % 12) + 12) % 12;
  }

  const re = new Float32Array(frameSize);
  const im = new Float32Array(frameSize);
  const mag = new Float32Array(bins);
  const prevMag = new Float32Array(bins);

  for (let f = 0; f < count; f++) {
    const off = f * hop;
    let sumSq = 0;
    for (let i = 0; i < frameSize; i++) {
      const s = pcm[off + i] ?? 0;
      sumSq += s * s;
      re[i] = s * window[i];
      im[i] = 0;
    }
    rms[f] = Math.sqrt(sumSq / frameSize);

    fft(re, im);

    let magSum = 0;
    let weighted = 0;
    let fluxSum = 0;
    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;
    let pitchMag = 0;
    let pitchWeighted = 0;

    const chromaOff = f * 12;

    for (let b = 0; b < bins; b++) {
      const m = Math.hypot(re[b], im[b]);
      mag[b] = m;
      magSum += m;
      weighted += m * b * binHz;
      const d = m - prevMag[b];
      if (d > 0) fluxSum += d;
      if (b < lowEnd) lowSum += m;
      else if (b < midEnd) midSum += m;
      else if (b >= highStart) highSum += m;

      const pc = binPitchClass[b];
      if (pc >= 0) {
        chroma[chromaOff + pc] += m;
        pitchMag += m;
        pitchWeighted += m * binMidi[b];
      }
    }

    flux[f] = fluxSum;
    centroid[f] = magSum > 0 ? weighted / magSum : 0;
    low[f] = lowSum;
    mid[f] = midSum;
    high[f] = highSum;
    pitch[f] = pitchMag > 0 ? pitchWeighted / pitchMag : 0;

    // Normalise each frame's profile so a loud bar and a quiet bar with the
    // same harmony compare equal — key detection cares about shape, not level.
    let chromaSum = 0;
    for (let c = 0; c < 12; c++) chromaSum += chroma[chromaOff + c];
    if (chromaSum > 0) {
      for (let c = 0; c < 12; c++) chroma[chromaOff + c] /= chromaSum;
    }

    prevMag.set(mag);
  }

  return { fps: sampleRate / hop, count, rms, flux, centroid, low, mid, high, chroma, pitch };
}

export const PITCH_CLASS_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/**
 * Krumhansl-Schmuckler key profiles: how strongly each scale degree is
 * expected to sound in a piece written in that key. Correlating a measured
 * chroma profile against all 24 rotations is the standard way to name a key.
 */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Perceived roughness of each interval, indexed by semitone distance. Minor
 * seconds and major sevenths grate; fifths and thirds sit still. Used to turn
 * a chroma profile into a single "how tense is this harmony" number.
 */
const INTERVAL_DISSONANCE = [0, 1.0, 0.55, 0.25, 0.2, 0.15, 0.75, 0.05, 0.25, 0.2, 0.5, 0.9];

function correlate(a: ArrayLike<number>, b: ArrayLike<number>, rotation: number): number {
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < 12; i++) {
    sumA += a[i];
    sumB += b[(i + rotation) % 12];
  }
  const meanA = sumA / 12;
  const meanB = sumB / 12;

  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < 12; i++) {
    const da = a[i] - meanA;
    const db = b[(i + rotation) % 12] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 1e-9 ? num / den : 0;
}

/**
 * Name the key of a 12-bin chroma profile by best-fitting profile rotation.
 * `majorness` is kept continuous rather than binary so the season can sit
 * between two states instead of snapping, which is what stops it flickering.
 */
export function detectKey(profile: ArrayLike<number>): KeyEstimate {
  let bestMajor = -Infinity;
  let bestMajorTonic = 0;
  let bestMinor = -Infinity;
  let bestMinorTonic = 0;

  for (let rotation = 0; rotation < 12; rotation++) {
    // Rotating the profile by `r` tests the key whose tonic is pitch class `r`.
    const maj = correlate(profile, MAJOR_PROFILE, (12 - rotation) % 12);
    const min = correlate(profile, MINOR_PROFILE, (12 - rotation) % 12);
    if (maj > bestMajor) {
      bestMajor = maj;
      bestMajorTonic = rotation;
    }
    if (min > bestMinor) {
      bestMinor = min;
      bestMinorTonic = rotation;
    }
  }

  const isMajor = bestMajor >= bestMinor;
  const tonic = isMajor ? bestMajorTonic : bestMinorTonic;

  return {
    tonic,
    tonicName: PITCH_CLASS_NAMES[tonic],
    mode: isMajor ? "major" : "minor",
    majorness: Math.max(-1, Math.min(1, bestMajor - bestMinor)),
    confidence: Math.max(0, Math.min(1, isMajor ? bestMajor : bestMinor)),
  };
}

/**
 * How rough a chroma profile sounds, 0..1. Every pair of sounding pitch
 * classes contributes its interval's roughness, weighted by how present both
 * are, so a bare fifth scores near zero and a cluster scores high.
 */
export function dissonance(profile: ArrayLike<number>): number {
  let total = 0;
  let weight = 0;
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      const pair = profile[i] * profile[j];
      total += pair * INTERVAL_DISSONANCE[j - i];
      weight += pair;
    }
  }
  return weight > 1e-9 ? Math.min(1, total / weight) : 0;
}

/** Average the per-frame chroma profiles across a frame range into one profile. */
export function meanChroma(chroma: Float32Array, from: number, to: number): number[] {
  const out = new Array<number>(12).fill(0);
  const n = Math.max(1, to - from);
  for (let f = from; f < to; f++) {
    const off = f * 12;
    for (let c = 0; c < 12; c++) out[c] += chroma[off + c];
  }
  for (let c = 0; c < 12; c++) out[c] /= n;
  return out;
}

/** Scale a series into 0..1 using robust percentile bounds, so one spike can't flatten it. */
export function normalise(src: ArrayLike<number>): Float32Array {
  const out = new Float32Array(src.length);
  if (src.length === 0) return out;
  const sorted = Array.from(src).sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)];
  const span = hi - lo;
  if (span <= 1e-9) return out;
  for (let i = 0; i < src.length; i++) {
    out[i] = Math.min(1, Math.max(0, (src[i] - lo) / span));
  }
  return out;
}

export function smooth(src: ArrayLike<number>, radius: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(src.length - 1, i + radius); j++) {
      sum += src[j];
      n++;
    }
    out[i] = sum / n;
  }
  return out;
}

export function mean(src: ArrayLike<number>, from = 0, to = src.length): number {
  if (to <= from) return 0;
  let sum = 0;
  for (let i = from; i < to; i++) sum += src[i];
  return sum / (to - from);
}

/**
 * Tempo via autocorrelation of the onset envelope, searched over 60-180 BPM.
 * Returns the period in frames alongside the beat phase, so cues can be
 * quantised onto the grid rather than landing between beats.
 */
export function estimateTempo(
  flux: ArrayLike<number>,
  fps: number,
): { bpm: number; periodFrames: number; phaseFrames: number } {
  const minBpm = 60;
  const maxBpm = 180;
  const minLag = Math.floor((60 / maxBpm) * fps);
  const maxLag = Math.ceil((60 / minBpm) * fps);

  const env = normalise(smooth(flux, 1));
  const avg = mean(env);
  const centred = new Float32Array(env.length);
  for (let i = 0; i < env.length; i++) centred[i] = env[i] - avg;

  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let acc = 0;
    for (let i = 0; i + lag < centred.length; i++) acc += centred[i] * centred[i + lag];
    // Normalise by overlap so long lags aren't penalised, and gently favour
    // the 90-140 BPM range where most music actually sits.
    const overlap = centred.length - lag;
    if (overlap <= 0) continue;
    const bpm = (60 * fps) / lag;
    const prior = 1 - 0.25 * Math.min(1, Math.abs(Math.log2(bpm / 115)));
    const score = (acc / overlap) * prior;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  // Phase: slide a pulse train over the envelope and keep the best alignment.
  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let p = 0; p < bestLag; p++) {
    let acc = 0;
    for (let i = p; i < env.length; i += bestLag) acc += env[i];
    if (acc > bestPhaseScore) {
      bestPhaseScore = acc;
      bestPhase = p;
    }
  }

  return { bpm: (60 * fps) / bestLag, periodFrames: bestLag, phaseFrames: bestPhase };
}
