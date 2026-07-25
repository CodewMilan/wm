import { analyzePcm } from "./analyze";
import type { AudioAnalysis } from "./types";

/** Analysis runs at this rate; decimating from 44.1k keeps the STFT cheap. */
const TARGET_RATE = 22_050;

/** Downmix to mono and decimate to TARGET_RATE with linear interpolation. */
function toMonoAtTargetRate(buffer: AudioBuffer): Float32Array {
  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));

  const ratio = buffer.sampleRate / TARGET_RATE;
  const outLength = Math.floor(buffer.length / ratio);
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    let sum = 0;
    for (const ch of channels) {
      const a = ch[idx] ?? 0;
      const b = ch[idx + 1] ?? a;
      sum += a + (b - a) * frac;
    }
    out[i] = sum / channels.length;
  }

  return out;
}

/**
 * Decode on the main thread (AudioContext is not reliably available in workers)
 * then hand the PCM to a worker for the heavy STFT so the UI keeps animating.
 * Falls back to analysing inline if the worker can't be constructed.
 */
export async function decodeAndAnalyze(
  file: File | ArrayBuffer,
): Promise<{ analysis: AudioAnalysis; buffer: AudioBuffer }> {
  const bytes = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const context = new AudioContext();
  const buffer = await context.decodeAudioData(bytes.slice(0));
  void context.close();

  const pcm = toMonoAtTargetRate(buffer);

  const analysis = await analyzeInWorker(pcm).catch(() => analyzePcm(pcm, TARGET_RATE));
  return { analysis, buffer };
}

function analyzeInWorker(pcm: Float32Array): Promise<AudioAnalysis> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./analyze.worker.ts", import.meta.url));
    } catch (error) {
      reject(error);
      return;
    }

    worker.onmessage = (
      event: MessageEvent<{ ok: boolean; analysis?: AudioAnalysis; error?: string }>,
    ) => {
      worker.terminate();
      if (event.data.ok && event.data.analysis) resolve(event.data.analysis);
      else reject(new Error(event.data.error ?? "analysis failed"));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };

    const copy = pcm.slice();
    worker.postMessage({ pcm: copy, sampleRate: TARGET_RATE }, [copy.buffer]);
  });
}
