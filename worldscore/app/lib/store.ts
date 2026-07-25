"use client";

import { create } from "zustand";
import type { AudioAnalysis } from "./audio/types";
import type { ConceptDirection, ModifierId } from "./world/spec";
import { compileScore, type Cue, type Score } from "./world/score";
import { compileExplore, type ExploreScore, type ExploreStep } from "./world/explore";
import type { SeedImage } from "./world/seeds";

export type Phase = "upload" | "analyzing" | "concepts" | "session";

/**
 * Watch runs the cinematic score on LongLive-2.0; Explore puts you inside the
 * world on LingBot World 2. Everything up to the last step is shared — the same
 * analysis and the same climate drive both.
 */
export type SessionMode = "watch" | "explore";

interface WorldscoreState {
  phase: Phase;
  mode: SessionMode;
  error: string | null;

  trackName: string;
  audioUrl: string | null;
  analysis: AudioAnalysis | null;

  directions: ConceptDirection[];
  conceptSource: "llm" | "fallback" | null;
  /** Why we fell back, when we did. A timeout and a missing key look identical
   *  on screen otherwise, which hides a broken model behind plausible output. */
  conceptNote: string | null;

  direction: ConceptDirection | null;
  score: Score | null;

  seed: SeedImage | null;
  exploreScore: ExploreScore | null;
  firedStepIds: string[];
  activeStep: ExploreStep | null;
  /** True while the player is holding a key, so the score yields the camera. */
  manualCamera: boolean;

  /** Cue ids already sent to the model, so the loop never double-fires. */
  firedCueIds: string[];
  activeCue: Cue | null;
  /** Rolling log of what fired and why, newest first. */
  log: { cue: Cue; atMs: number }[];
  modifiers: ModifierId[];

  setPhase: (phase: Phase) => void;
  setMode: (mode: SessionMode) => void;
  setError: (error: string | null) => void;
  startAnalysis: (name: string, url: string) => void;
  setAnalysis: (analysis: AudioAnalysis) => void;
  setDirections: (
    directions: ConceptDirection[],
    source: "llm" | "fallback",
    note?: string,
  ) => void;
  chooseDirection: (direction: ConceptDirection) => void;
  chooseSeed: (seed: SeedImage) => void;
  markFired: (cue: Cue) => void;
  markStepFired: (step: ExploreStep) => void;
  setManualCamera: (manual: boolean) => void;
  toggleModifier: (id: ModifierId) => void;
  reset: () => void;
}

/** Everything a fresh track starts from. A function so each reset gets its own arrays. */
function blank() {
  return {
    error: null,
    trackName: "",
    audioUrl: null,
    analysis: null,
    directions: [] as ConceptDirection[],
    conceptSource: null,
    conceptNote: null,
    direction: null,
    score: null,
    seed: null,
    exploreScore: null,
    firedStepIds: [] as string[],
    activeStep: null,
    manualCamera: false,
    firedCueIds: [] as string[],
    activeCue: null,
    log: [] as { cue: Cue; atMs: number }[],
    modifiers: [] as ModifierId[],
  } satisfies Partial<WorldscoreState>;
}

export const useWorldscore = create<WorldscoreState>((set, get) => ({
  phase: "upload",
  mode: "watch",
  ...blank(),

  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  setError: (error) => set({ error }),

  startAnalysis: (trackName, audioUrl) =>
    set({ phase: "analyzing", trackName, audioUrl, error: null }),

  setAnalysis: (analysis) => set({ analysis }),

  setDirections: (directions, conceptSource, note) =>
    set({ directions, conceptSource, conceptNote: note ?? null, phase: "concepts" }),

  chooseDirection: (direction) => {
    const analysis = get().analysis;
    if (!analysis) return;
    set({
      direction,
      score: compileScore(analysis, direction),
      phase: "session",
      firedCueIds: [],
      activeCue: null,
      log: [],
      modifiers: [],
    });
  },

  chooseSeed: (seed) => {
    const analysis = get().analysis;
    if (!analysis) return;
    set({
      seed,
      exploreScore: compileExplore(analysis, seed),
      phase: "session",
      firedStepIds: [],
      activeStep: null,
      manualCamera: false,
    });
  },

  markFired: (cue) =>
    set((s) => ({
      firedCueIds: [...s.firedCueIds, cue.id],
      activeCue: cue,
      log: [{ cue, atMs: Date.now() }, ...s.log].slice(0, 24),
    })),

  markStepFired: (step) =>
    set((s) => ({
      firedStepIds: [...s.firedStepIds, step.id],
      activeStep: step,
    })),

  setManualCamera: (manualCamera) => set({ manualCamera }),

  toggleModifier: (id) =>
    set((s) => ({
      modifiers: s.modifiers.includes(id)
        ? s.modifiers.filter((m) => m !== id)
        : [...s.modifiers, id],
    })),

  reset: () => {
    const url = get().audioUrl;
    if (url) URL.revokeObjectURL(url);
    set({ phase: "upload", ...blank() });
  },
}));
