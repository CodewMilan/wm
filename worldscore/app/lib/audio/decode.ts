import { analyzePcm } from "./analyze";
import type { AnalysisOverride, AudioAnalysis } from "./types";

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
 * Analyse already-decoded audio. Split out from `decodeAndAnalyze` because
 * synthesised MIDI arrives as an AudioBuffer that never went near a container
 * format, and it needs the same treatment from here on.
 */
export async function analyzeAudioBuffer(
  buffer: AudioBuffer,
  override?: AnalysisOverride,
): Promise<AudioAnalysis> {
  const pcm = toMonoAtTargetRate(buffer);
  return analyzeInWorker(pcm, override).catch(() => analyzePcm(pcm, TARGET_RATE, override));
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

  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(bytes.slice(0));
  } catch {
    // The browser's own message here is a bare "Unable to decode audio data",
    // which tells nobody anything about which of the many causes it hit.
    throw new Error(
      "This browser couldn't decode that audio. Try exporting it as WAV or MP3.",
    );
  } finally {
    void context.close();
  }

  const analysis = await analyzeAudioBuffer(buffer);
  return { analysis, buffer };
}

function analyzeInWorker(
  pcm: Float32Array,
  override?: AnalysisOverride,
): Promise<AudioAnalysis> {
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
    const transfer: Transferable[] = [copy.buffer];
    // The override arrays are small next to the PCM, so they're copied rather
    // than transferred — the caller may still want them.
    worker.postMessage({ pcm: copy, sampleRate: TARGET_RATE, override }, transfer);
  });
}
