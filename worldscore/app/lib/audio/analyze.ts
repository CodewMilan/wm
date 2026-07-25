import { computeFrames, estimateTempo, mean, normalise, smooth } from "./dsp";
import type { AudioAnalysis, Section, SectionRole } from "./types";

/** Texture frames per second — the resolution structure detection works at. */
const TEXTURE_HZ = 4;
/** Half-width of the novelty comparison window, in texture frames. */
const NOVELTY_WINDOW = 12;
/** Minimum musical distance between two section boundaries. */
const MIN_SECTION_MS = 9_000;

/** Average a frame-rate series down onto the texture grid. */
function toTexture(src: ArrayLike<number>, fps: number, textureCount: number): Float32Array {
  const out = new Float32Array(textureCount);
  const per = fps / TEXTURE_HZ;
  for (let t = 0; t < textureCount; t++) {
    out[t] = mean(src, Math.floor(t * per), Math.min(src.length, Math.floor((t + 1) * per)));
  }
  return out;
}

function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Novelty curve over a multi-band texture. For each point we compare the mean
 * feature vector of the window before it against the window after it; a large
 * cosine distance means the track just changed character. This is a cheap
 * stand-in for a full self-similarity checkerboard and holds up well on the
 * 9s+ boundaries we actually care about.
 */
function noveltyCurve(bands: Float32Array[], count: number): Float32Array {
  const novelty = new Float32Array(count);
  for (let t = 0; t < count; t++) {
    const from = Math.max(0, t - NOVELTY_WINDOW);
    const to = Math.min(count, t + NOVELTY_WINDOW);
    if (t - from < 3 || to - t < 3) continue;
    const before = bands.map((b) => mean(b, from, t));
    const after = bands.map((b) => mean(b, t, to));
    novelty[t] = cosineDistance(before, after);
  }
  return novelty;
}

function pickPeaks(novelty: Float32Array, minGapFrames: number): number[] {
  const avg = mean(novelty);
  let variance = 0;
  for (let i = 0; i < novelty.length; i++) variance += (novelty[i] - avg) ** 2;
  const std = Math.sqrt(variance / Math.max(1, novelty.length));
  const threshold = avg + std * 0.6;

  const candidates: { index: number; value: number }[] = [];
  for (let t = 1; t < novelty.length - 1; t++) {
    if (novelty[t] < threshold) continue;
    if (novelty[t] < novelty[t - 1] || novelty[t] < novelty[t + 1]) continue;
    candidates.push({ index: t, value: novelty[t] });
  }

  // Greedy: strongest peaks win, weaker ones inside the exclusion zone drop.
  candidates.sort((a, b) => b.value - a.value);
  const kept: number[] = [];
  for (const c of candidates) {
    if (kept.every((k) => Math.abs(k - c.index) >= minGapFrames)) kept.push(c.index);
  }
  return kept.sort((a, b) => a - b);
}

/**
 * Assign musical roles from relative energy and position. This is deliberately
 * interpretable rather than clever: the spec asks for believable mapping we can
 * debug, not a music-information-retrieval paper.
 */
function labelSections(
  bounds: number[],
  energy: Float32Array,
  brightness: Float32Array,
  durationMs: number,
): Section[] {
  const raw = bounds.slice(0, -1).map((startT, i) => {
    const endT = bounds[i + 1];
    return {
      startT,
      endT,
      energy: mean(energy, startT, endT),
      brightness: mean(brightness, startT, endT),
    };
  });

  if (raw.length === 0) return [];

  const energies = raw.map((s) => s.energy).sort((a, b) => a - b);
  const loud = energies[Math.floor(energies.length * 0.7)];
  const quiet = energies[Math.floor(energies.length * 0.3)];

  return raw.map((s, i) => {
    const startMs = (s.startT / TEXTURE_HZ) * 1000;
    const endMs = (s.endT / TEXTURE_HZ) * 1000;
    const isFirst = i === 0;
    const isLast = i === raw.length - 1;
    const prev = raw[i - 1];
    const next = raw[i + 1];

    // A sharp jump up in energy from the previous section reads as a drop.
    const jump = prev ? s.energy - prev.energy : 0;
    const isImpact = jump > 0.18;

    let role: SectionRole;
    if (isFirst && s.energy <= loud) role = "intro";
    else if (isLast && s.energy < loud) role = "outro";
    else if (s.energy >= loud && isImpact) role = "drop";
    else if (s.energy >= loud) role = "chorus";
    else if (s.energy <= quiet && !isFirst && !isLast) role = "breakdown";
    else if (next && next.energy - s.energy > 0.15) role = "build";
    else if (prev && next && s.brightness > prev.brightness + 0.15) role = "bridge";
    else role = "verse";

    return { startMs, endMs, role, energy: s.energy, brightness: s.brightness, isImpact };
  });
}

function deriveMoodTags(
  bpm: number,
  brightness: number,
  energy: number,
  dynamicRange: number,
  lowEnd: number,
): string[] {
  const tags: string[] = [];

  if (bpm < 85) tags.push("slow", "spacious");
  else if (bpm < 110) tags.push("mid-tempo", "loping");
  else if (bpm < 140) tags.push("driving");
  else tags.push("fast", "urgent");

  if (brightness < 0.35) tags.push("dark", "murky");
  else if (brightness > 0.65) tags.push("bright", "airy");
  else tags.push("warm");

  if (energy > 0.65) tags.push("dense", "powerful");
  else if (energy < 0.35) tags.push("sparse", "intimate");

  if (dynamicRange > 0.5) tags.push("dynamic", "cinematic");
  else tags.push("compressed", "hypnotic");

  if (lowEnd > 0.6) tags.push("bass-heavy", "physical");

  return tags;
}

export function analyzePcm(pcm: Float32Array, sampleRate: number): AudioAnalysis {
  const frames = computeFrames(pcm, sampleRate);
  const durationMs = (pcm.length / sampleRate) * 1000;

  const tempo = estimateTempo(frames.flux, frames.fps);

  const energyN = normalise(smooth(frames.rms, 2));
  const brightN = normalise(smooth(frames.centroid, 2));
  const lowN = normalise(smooth(frames.low, 2));
  const midN = normalise(smooth(frames.mid, 2));
  const highN = normalise(smooth(frames.high, 2));

  const textureCount = Math.max(1, Math.floor((durationMs / 1000) * TEXTURE_HZ));
  const tEnergy = toTexture(energyN, frames.fps, textureCount);
  const tBright = toTexture(brightN, frames.fps, textureCount);
  const tLow = toTexture(lowN, frames.fps, textureCount);
  const tMid = toTexture(midN, frames.fps, textureCount);
  const tHigh = toTexture(highN, frames.fps, textureCount);

  const novelty = noveltyCurve([tEnergy, tBright, tLow, tMid, tHigh], textureCount);
  const minGap = Math.round((MIN_SECTION_MS / 1000) * TEXTURE_HZ);
  const peaks = pickPeaks(novelty, minGap);

  const bounds = [0, ...peaks, textureCount].filter(
    (v, i, arr) => i === 0 || v - arr[i - 1] >= Math.min(minGap, 4),
  );
  if (bounds[bounds.length - 1] !== textureCount) bounds.push(textureCount);

  const sections = labelSections(bounds, tEnergy, tBright, durationMs);

  const meanEnergy = mean(tEnergy);
  const meanBrightness = mean(tBright);
  const sortedEnergy = Array.from(tEnergy).sort((a, b) => a - b);
  const dynamicRange =
    sortedEnergy[Math.floor(sortedEnergy.length * 0.9)] -
    sortedEnergy[Math.floor(sortedEnergy.length * 0.1)];
  const lowEnd = mean(tLow);

  return {
    durationMs,
    bpm: Math.round(tempo.bpm * 10) / 10,
    beatMs: 60_000 / tempo.bpm,
    beatPhaseMs: (tempo.phaseFrames / frames.fps) * 1000,
    energyCurve: Array.from(tEnergy),
    brightnessCurve: Array.from(tBright),
    curveHz: TEXTURE_HZ,
    sections,
    moodTags: deriveMoodTags(tempo.bpm, meanBrightness, meanEnergy, dynamicRange, lowEnd),
    meanEnergy,
    meanBrightness,
    dynamicRange,
    lowEnd,
  };
}
