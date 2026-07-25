"use client";

import { create } from "zustand";
import type { AudioAnalysis } from "./audio/types";
import type { ConceptDirection, ModifierId } from "./world/spec";
import { compileScore, type Cue, type Score } from "./world/score";

export type Phase = "upload" | "analyzing" | "concepts" | "session";

interface WorldscoreState {
  phase: Phase;
  error: string | null;

  trackName: string;
  audioUrl: string | null;
  analysis: AudioAnalysis | null;

  directions: ConceptDirection[];
  conceptSource: "llm" | "fallback" | null;

  direction: ConceptDirection | null;
  score: Score | null;

  /** Cue ids already sent to the model, so the loop never double-fires. */
  firedCueIds: string[];
  activeCue: Cue | null;
  /** Rolling log of what fired and why, newest first. */
  log: { cue: Cue; atMs: number }[];
  modifiers: ModifierId[];

  setPhase: (phase: Phase) => void;
  setError: (error: string | null) => void;
  startAnalysis: (name: string, url: string) => void;
  setAnalysis: (analysis: AudioAnalysis) => void;
  setDirections: (directions: ConceptDirection[], source: "llm" | "fallback") => void;
  chooseDirection: (direction: ConceptDirection) => void;
  markFired: (cue: Cue) => void;
  toggleModifier: (id: ModifierId) => void;
  reset: () => void;
}

export const useWorldscore = create<WorldscoreState>((set, get) => ({
  phase: "upload",
  error: null,
  trackName: "",
  audioUrl: null,
  analysis: null,
  directions: [],
  conceptSource: null,
  direction: null,
  score: null,
  firedCueIds: [],
  activeCue: null,
  log: [],
  modifiers: [],

  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),

  startAnalysis: (trackName, audioUrl) =>
    set({ phase: "analyzing", trackName, audioUrl, error: null }),

  setAnalysis: (analysis) => set({ analysis }),

  setDirections: (directions, conceptSource) =>
    set({ directions, conceptSource, phase: "concepts" }),

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

  markFired: (cue) =>
    set((s) => ({
      firedCueIds: [...s.firedCueIds, cue.id],
      activeCue: cue,
      log: [{ cue, atMs: Date.now() }, ...s.log].slice(0, 24),
    })),

  toggleModifier: (id) =>
    set((s) => ({
      modifiers: s.modifiers.includes(id)
        ? s.modifiers.filter((m) => m !== id)
        : [...s.modifiers, id],
    })),

  reset: () => {
    const url = get().audioUrl;
    if (url) URL.revokeObjectURL(url);
    set({
      phase: "upload",
      error: null,
      trackName: "",
      audioUrl: null,
      analysis: null,
      directions: [],
      conceptSource: null,
      direction: null,
      score: null,
      firedCueIds: [],
      activeCue: null,
      log: [],
      modifiers: [],
    });
  },
}));
