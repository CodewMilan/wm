// Minimal DSP kit: an in-place radix-2 FFT plus the frame-level features the
// analyser needs. Kept dependency-free so it runs unchanged in a worker.

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
}

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
    }

    flux[f] = fluxSum;
    centroid[f] = magSum > 0 ? weighted / magSum : 0;
    low[f] = lowSum;
    mid[f] = midSum;
    high[f] = highSum;

    prevMag.set(mag);
  }

  return { fps: sampleRate / hop, count, rms, flux, centroid, low, mid, high };
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
