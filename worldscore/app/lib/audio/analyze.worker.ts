import { analyzePcm } from "./analyze";
import type { AnalyzeRequest } from "./types";

self.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const { pcm, sampleRate } = event.data;
  try {
    self.postMessage({ ok: true, analysis: analyzePcm(pcm, sampleRate) });
  } catch (error) {
    self.postMessage({ ok: false, error: (error as Error).message });
  }
};
