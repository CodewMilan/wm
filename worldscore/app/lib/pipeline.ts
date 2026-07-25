"use client";

import type { AudioAnalysis } from "./audio/types";
import { decodeAndAnalyze } from "./audio/decode";
import { loadMidi } from "./midi/load";
import { isMidiFile } from "./midi/parse";
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

/**
 * A MIDI file is a score with no sound in it, so there is nothing to play and
 * nothing to measure until we render it. Everything downstream then behaves
 * exactly as it does for an upload, except the harmony is exact rather than
 * estimated off a spectrum.
 */
async function prepare(file: File): Promise<AudioAnalysis> {
  if (!isMidiFile(file)) return (await decodeAndAnalyze(file)).analysis;

  const { analysis, audioUrl } = await loadMidi(file);
  useWorldscore.getState().setAudioUrl(audioUrl);
  return analysis;
}

export async function runPipeline(file: File): Promise<void> {
  const store = useWorldscore.getState();
  const midi = isMidiFile(file);
  // MIDI gets its URL later, once there is audio to point at.
  store.startAnalysis(
    file.name.replace(/\.[^.]+$/, ""),
    midi ? null : URL.createObjectURL(file),
    midi ? "midi" : "audio",
  );

  try {
    const analysis = await prepare(file);
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
