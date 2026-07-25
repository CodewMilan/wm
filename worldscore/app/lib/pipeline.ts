"use client";

import { decodeAndAnalyze } from "./audio/decode";
import { useWorldscore } from "./store";
import type { ConceptDirection } from "./world/spec";

/**
 * Upload → analysis → concept generation. Kept out of the components so the
 * whole flow reads in one place and can be driven by the demo shortcut too.
 */
/** Fallback demo path, so a broken upload can never strand a live demo. */
export async function runDemoTrack(): Promise<void> {
  const res = await fetch("/demo-track.wav");
  const blob = await res.blob();
  await runPipeline(new File([blob], "Synthetic Test Track.wav", { type: "audio/wav" }));
}

export async function runPipeline(file: File): Promise<void> {
  const store = useWorldscore.getState();
  const url = URL.createObjectURL(file);
  store.startAnalysis(file.name.replace(/\.[^.]+$/, ""), url);

  try {
    const { analysis } = await decodeAndAnalyze(file);
    useWorldscore.getState().setAnalysis(analysis);

    const res = await fetch("/api/concepts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analysis),
    });
    if (!res.ok) throw new Error(`Concept generation failed: ${res.status}`);

    const { directions, source, note } = (await res.json()) as {
      directions: ConceptDirection[];
      source: "llm" | "fallback";
      note?: string;
    };
    if (!directions?.length) throw new Error("No directions returned");

    useWorldscore.getState().setDirections(directions, source, note);
  } catch (error) {
    const store = useWorldscore.getState();
    store.setError((error as Error).message);
    store.setPhase("upload");
  }
}
