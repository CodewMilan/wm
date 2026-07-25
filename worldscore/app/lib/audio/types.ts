// The output of client-side track analysis. This is the only thing that ever
// leaves the browser: the audio itself never gets uploaded.

export type SectionRole =
  | "intro"
  | "verse"
  | "build"
  | "chorus"
  | "drop"
  | "breakdown"
  | "bridge"
  | "outro";

export interface Section {
  startMs: number;
  endMs: number;
  role: SectionRole;
  /** Mean energy across the section, normalised 0..1 across the track. */
  energy: number;
  /** Mean spectral centroid, normalised 0..1. High = bright/airy, low = dark. */
  brightness: number;
  /** True when this section's onset is a sharp jump up in energy. */
  isImpact: boolean;
}

export interface AudioAnalysis {
  durationMs: number;
  bpm: number;
  /** Seconds per beat, derived from bpm. */
  beatMs: number;
  /** Offset of the first detected beat, in ms. */
  beatPhaseMs: number;
  /** Energy envelope sampled at `curveHz`, each value 0..1. */
  energyCurve: number[];
  /** Spectral centroid sampled at `curveHz`, each value 0..1. */
  brightnessCurve: number[];
  curveHz: number;
  sections: Section[];
  /** Heuristic descriptors handed to the concept generator as hints. */
  moodTags: string[];
  /** Overall 0..1 measures used for both mood tags and prompt shaping. */
  meanEnergy: number;
  meanBrightness: number;
  dynamicRange: number;
  lowEnd: number;
}

export interface AnalyzeRequest {
  pcm: Float32Array;
  sampleRate: number;
}
