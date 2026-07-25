import {
  computeFrames,
  detectKey,
  dissonance,
  estimateTempo,
  mean,
  meanChroma,
  normalise,
  smooth,
} from "./dsp";
import type { AudioAnalysis, KeyChange, Section, SectionRole } from "./types";

/** Texture frames per second — the resolution structure detection works at. */
const TEXTURE_HZ = 4;
/** Half-width of the novelty comparison window, in texture frames. */
const NOVELTY_WINDOW = 20;
/** Minimum musical distance between two section boundaries. */
const MIN_SECTION_MS = 9_000;
/**
 * Half-width of the window harmony is read over, in texture frames. A quarter
 * of a second of audio can't tell you a key — two seconds either side can, and
 * it also stops the season flickering on every passing chord.
 */
const HARMONY_WINDOW = 8;
/** Below this correlation the track has no key worth naming, so don't claim one. */
const KEY_CONFIDENCE_FLOOR = 0.2;

/** Average a frame-rate series down onto the texture grid. */
function toTexture(src: ArrayLike<number>, fps: number, textureCount: number): Float32Array {
  const out = new Float32Array(textureCount);
  const per = fps / TEXTURE_HZ;
  for (let t = 0; t < textureCount; t++) {
    out[t] = mean(src, Math.floor(t * per), Math.min(src.length, Math.floor((t + 1) * per)));
  }
  return out;
}

/** Same reduction as `toTexture`, but for the interleaved 12-bin chroma array. */
function chromaToTexture(
  chroma: Float32Array,
  fps: number,
  frameCount: number,
  textureCount: number,
): Float32Array {
  const out = new Float32Array(textureCount * 12);
  const per = fps / TEXTURE_HZ;
  for (let t = 0; t < textureCount; t++) {
    const from = Math.floor(t * per);
    const to = Math.min(frameCount, Math.floor((t + 1) * per));
    const n = Math.max(1, to - from);
    const off = t * 12;
    for (let f = from; f < to; f++) {
      const src = f * 12;
      for (let c = 0; c < 12; c++) out[off + c] += chroma[src + c];
    }
    for (let c = 0; c < 12; c++) out[off + c] /= n;
  }
  return out;
}

/** Shortest signed distance between two pitch classes, -6..6. */
function semitoneDistance(from: number, to: number): number {
  let d = (to - from) % 12;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d;
}

/**
 * Cosine distance alone is scale-invariant, so a section that just gets louder
 * with the same spectral shape — a verse dropping into a chorus — scores zero.
 * Blending in a magnitude-sensitive term catches both timbral changes and pure
 * dynamic ones, which is most of what section boundaries actually are.
 */
function featureDistance(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  let sq = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
    sq += (a[i] - b[i]) ** 2;
  }
  const cosine = na === 0 || nb === 0 ? 0 : 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
  const euclidean = Math.sqrt(sq / a.length);
  return 0.45 * cosine + 0.55 * Math.min(1, euclidean);
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
    novelty[t] = featureDistance(before, after);
  }
  return novelty;
}

function pickPeaks(novelty: Float32Array, minGapFrames: number): number[] {
  const avg = mean(novelty);
  let variance = 0;
  for (let i = 0; i < novelty.length; i++) variance += (novelty[i] - avg) ** 2;
  const std = Math.sqrt(variance / Math.max(1, novelty.length));
  const threshold = avg + std * 0.35;

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
  register: Float32Array,
  majorness: Float32Array,
  tension: Float32Array,
): Section[] {
  const raw = bounds.slice(0, -1).map((startT, i) => {
    const endT = bounds[i + 1];
    return {
      startT,
      endT,
      energy: mean(energy, startT, endT),
      brightness: mean(brightness, startT, endT),
      register: mean(register, startT, endT),
      majorness: mean(majorness, startT, endT),
      tension: mean(tension, startT, endT),
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

    return {
      startMs,
      endMs,
      role,
      energy: s.energy,
      brightness: s.brightness,
      isImpact,
      register: s.register,
      majorness: s.majorness,
      tension: s.tension,
    };
  });
}

function deriveMoodTags(
  bpm: number,
  brightness: number,
  energy: number,
  dynamicRange: number,
  lowEnd: number,
  mode: "major" | "minor",
  tension: number,
  register: number,
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

  tags.push(mode === "minor" ? "melancholic" : "resolved");
  if (tension > 0.55) tags.push("unresolved", "restless");
  else if (tension < 0.3) tags.push("consonant", "settled");

  if (register < 40) tags.push("subterranean");
  else if (register > 62) tags.push("high-register", "weightless");

  return tags;
}

export function analyzePcm(pcm: Float32Array, sampleRate: number): AudioAnalysis {
  const frames = computeFrames(pcm, sampleRate);
  const durationMs = (pcm.length / sampleRate) * 1000;

  const tempo = estimateTempo(frames.flux, frames.fps);

  // Centroid is in Hz and spans orders of magnitude, so a few noisy-hat frames
  // would otherwise squash the whole track toward zero. Compress it first.
  const logCentroid = new Float32Array(frames.centroid.length);
  for (let i = 0; i < frames.centroid.length; i++) {
    logCentroid[i] = Math.log2(1 + frames.centroid[i]);
  }

  const energyN = normalise(smooth(frames.rms, 2));
  const brightN = normalise(smooth(logCentroid, 2));
  const lowN = normalise(smooth(frames.low, 2));
  const midN = normalise(smooth(frames.mid, 2));
  const highN = normalise(smooth(frames.high, 2));
  const pitchN = normalise(smooth(frames.pitch, 2));

  const textureCount = Math.max(1, Math.floor((durationMs / 1000) * TEXTURE_HZ));
  const tEnergy = toTexture(energyN, frames.fps, textureCount);
  const tBright = toTexture(brightN, frames.fps, textureCount);
  const tLow = toTexture(lowN, frames.fps, textureCount);
  const tMid = toTexture(midN, frames.fps, textureCount);
  const tHigh = toTexture(highN, frames.fps, textureCount);
  const tRegister = toTexture(pitchN, frames.fps, textureCount);

  // Harmony is read over a sliding window rather than per texture frame, so a
  // passing chord can't yank the season around. Both curves come off the same
  // averaged profile, which keeps them consistent with each other.
  const tChroma = chromaToTexture(frames.chroma, frames.fps, frames.count, textureCount);
  const tMajorness = new Float32Array(textureCount);
  const tTension = new Float32Array(textureCount);
  for (let t = 0; t < textureCount; t++) {
    const from = Math.max(0, t - HARMONY_WINDOW);
    const to = Math.min(textureCount, t + HARMONY_WINDOW + 1);
    const profile = meanChroma(tChroma, from, to);
    // detectKey returns -1..1; the curves are 0..1 like every other curve here.
    tMajorness[t] = (detectKey(profile).majorness + 1) / 2;
    tTension[t] = dissonance(profile);
  }

  const novelty = noveltyCurve([tEnergy, tBright, tLow, tMid, tHigh], textureCount);
  const minGap = Math.round((MIN_SECTION_MS / 1000) * TEXTURE_HZ);
  const peaks = pickPeaks(novelty, minGap);

  const bounds = [0, ...peaks, textureCount].filter(
    (v, i, arr) => i === 0 || v - arr[i - 1] >= Math.min(minGap, 4),
  );
  if (bounds[bounds.length - 1] !== textureCount) bounds.push(textureCount);

  const sections = labelSections(bounds, tEnergy, tBright, tRegister, tMajorness, tTension);

  const meanEnergy = mean(tEnergy);
  const meanBrightness = mean(tBright);
  const sortedEnergy = Array.from(tEnergy).sort((a, b) => a - b);
  const dynamicRange =
    sortedEnergy[Math.floor(sortedEnergy.length * 0.9)] -
    sortedEnergy[Math.floor(sortedEnergy.length * 0.1)];
  const lowEnd = mean(tLow);

  const key = detectKey(meanChroma(tChroma, 0, textureCount));

  // A modulation is the loudest event a piece of music can hand us, so it gets
  // detected per section rather than per frame — we want the ones that stick.
  const keyChanges: KeyChange[] = [];
  let previous = key;
  for (const section of sections) {
    const from = Math.floor((section.startMs / 1000) * TEXTURE_HZ);
    const to = Math.min(textureCount, Math.ceil((section.endMs / 1000) * TEXTURE_HZ));
    if (to - from < HARMONY_WINDOW) continue;

    const local = detectKey(meanChroma(tChroma, from, to));
    if (local.confidence < KEY_CONFIDENCE_FLOOR) continue;
    if (local.tonic === previous.tonic && local.mode === previous.mode) continue;

    keyChanges.push({
      atMs: section.startMs,
      from: `${previous.tonicName} ${previous.mode}`,
      to: `${local.tonicName} ${local.mode}`,
      mode: local.mode,
      semitones: semitoneDistance(previous.tonic, local.tonic),
    });
    previous = local;
  }

  // Absolute pitch height, averaged over frames that actually had pitch in
  // them. Silence would otherwise drag a sparse track's register to the floor.
  let pitchSum = 0;
  let pitchN2 = 0;
  for (let f = 0; f < frames.count; f++) {
    if (frames.pitch[f] > 0) {
      pitchSum += frames.pitch[f];
      pitchN2++;
    }
  }
  const meanPitchMidi = pitchN2 > 0 ? pitchSum / pitchN2 : 0;
  const meanTension = mean(tTension);

  return {
    durationMs,
    bpm: Math.round(tempo.bpm * 10) / 10,
    beatMs: 60_000 / tempo.bpm,
    beatPhaseMs: (tempo.phaseFrames / frames.fps) * 1000,
    energyCurve: Array.from(tEnergy),
    brightnessCurve: Array.from(tBright),
    registerCurve: Array.from(tRegister),
    majornessCurve: Array.from(tMajorness),
    tensionCurve: Array.from(tTension),
    curveHz: TEXTURE_HZ,
    sections,
    moodTags: deriveMoodTags(
      tempo.bpm,
      meanBrightness,
      meanEnergy,
      dynamicRange,
      lowEnd,
      key.mode,
      meanTension,
      meanPitchMidi,
    ),
    meanEnergy,
    meanBrightness,
    dynamicRange,
    lowEnd,
    key,
    keyChanges,
    meanPitchMidi,
    meanTension,
  };
}
