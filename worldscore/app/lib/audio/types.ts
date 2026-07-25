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
  /** Mean pitch height, 0..1 within this track. Low = the music sits low. */
  register: number;
  /** 0 = firmly minor, 1 = firmly major. */
  majorness: number;
  /** Harmonic roughness, 0..1. High = unresolved and grating. */
  tension: number;
}

export interface KeyEstimate {
  /** 0 = C, 1 = C#, and so on. */
  tonic: number;
  tonicName: string;
  mode: "major" | "minor";
  /** Signed major-versus-minor strength, -1..1. Positive is major. */
  majorness: number;
  /** Correlation of the winning profile, 0..1. Low means "no clear key". */
  confidence: number;
}

export interface KeyChange {
  atMs: number;
  from: string;
  to: string;
  mode: "major" | "minor";
  /** Semitones moved, -6..6, taking the shorter way round the circle. */
  semitones: number;
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
  /** Pitch height sampled at `curveHz`, 0..1 within this track. */
  registerCurve: number[];
  /** Major-versus-minor sampled at `curveHz`, 0 = minor, 1 = major. */
  majornessCurve: number[];
  /** Harmonic roughness sampled at `curveHz`, 0..1. */
  tensionCurve: number[];
  curveHz: number;
  sections: Section[];
  /** Heuristic descriptors handed to the concept generator as hints. */
  moodTags: string[];
  /** Overall 0..1 measures used for both mood tags and prompt shaping. */
  meanEnergy: number;
  meanBrightness: number;
  dynamicRange: number;
  lowEnd: number;

  /** Whole-track key, from the averaged chroma profile. */
  key: KeyEstimate;
  /** Modulations detected between sections — the biggest events in the track. */
  keyChanges: KeyChange[];
  /**
   * Absolute mean pitch as a MIDI number, unlike `registerCurve` which is
   * relative to this track. Needed so a genuinely bass-heavy track reads heavy
   * overall instead of just heavy compared to its own brightest moment.
   */
  meanPitchMidi: number;
  meanTension: number;
}

export interface AnalyzeRequest {
  pcm: Float32Array;
  sampleRate: number;
}
