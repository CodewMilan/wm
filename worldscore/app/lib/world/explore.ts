// Explore mode: the same score, aimed at a navigable model instead of a
// cinematic one.
//
// Two things differ from Watch mode and both come from LingBot World 2's shape.
//
// There is no shot-versus-cut distinction — `set_prompt` is hot-swappable at
// any time with no memory wipe and no scene budget — so the timeline is just a
// list of prompts, and weather is free to drift rather than having to wait for
// a cut.
//
// And the camera is a real control surface rather than a sentence. Writing
// "violent sweeping crane move" into the prompt here would fight the actual
// pose inputs, so the section's camera language is emitted as control values
// and stripped from the text.

import type { AudioAnalysis, SectionRole } from "../audio/types";
import { climateAt, compileClimate, describeWeather, seasonPhrase, weatherPhrase } from "./climate";
import type { Climate } from "./climate";
import type { SeedImage } from "./seeds";
import { composePrompt, type WorldSpec } from "./spec";

/** Mirrors the model's four drive axes plus its rotation rate. */
export interface CameraState {
  moveLongitudinal: "idle" | "forward" | "back";
  moveLateral: "idle" | "strafe_left" | "strafe_right";
  lookHorizontal: "idle" | "left" | "right";
  lookVertical: "idle" | "up" | "down";
  /** Degrees per frame, 0..30. Ignored while both look axes are idle. */
  rotationSpeedDeg: number;
  /**
   * How long to hold this move before settling back to still. The model
   * conditions on its own recent frames, so an indefinite hold smears; short
   * moves with a settled world between them stay clean.
   */
  holdMs: number;
}

export const CAMERA_STILL: CameraState = {
  moveLongitudinal: "idle",
  moveLateral: "idle",
  lookHorizontal: "idle",
  lookVertical: "idle",
  rotationSpeedDeg: 0,
  holdMs: 0,
};

/**
 * The same camera intent Watch mode writes as prose, expressed as inputs.
 * Energy scales the rotation rate so a loud section actually feels faster
 * rather than just being described that way.
 *
 * Two constraints from the model shape these choices. Lateral strafing is its
 * least reliable axis because it slides the camera off whatever it had
 * centred, so sideways intent is routed through turning instead. And the model
 * conditions on its own recent output, so a move that is held indefinitely
 * accumulates drift — hence `holdMs` on every state, after which the world is
 * allowed to settle again.
 */
export function cameraForRole(role: SectionRole, energy: number): CameraState {
  const speed = (base: number) => Math.min(30, Math.round(base + energy * 6));

  switch (role) {
    case "drop":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", lookHorizontal: "right", rotationSpeedDeg: speed(9), holdMs: 5_000 };
    case "chorus":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", lookHorizontal: "left", rotationSpeedDeg: speed(5), holdMs: 5_000 };
    case "build":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(2), holdMs: 6_000 };
    case "breakdown":
      // Everything stops. The stillness is the point — it reads as the world
      // holding its breath, and it costs nothing to implement.
      return CAMERA_STILL;
    case "bridge":
      // Turning rather than strafing: same "we moved sideways" read, on the
      // axis the model is actually good at.
      return { ...CAMERA_STILL, lookHorizontal: "left", rotationSpeedDeg: speed(3), holdMs: 4_000 };
    case "outro":
      return { ...CAMERA_STILL, moveLongitudinal: "back", rotationSpeedDeg: speed(1), holdMs: 6_000 };
    case "intro":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(1), holdMs: 6_000 };
    default:
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(3), holdMs: 5_000 };
  }
}

/**
 * Build a scene description that agrees with the seed image.
 *
 * The model resolves disagreements between prompt and image in the image's
 * favour, and pays for the conflict in artifacts, so the wording here is
 * derived from the image's own sidecar rather than invented. Weather and season
 * are the deliberate exception: they're the channel the music steers.
 */
export function specFromSeed(seed: SeedImage, climate: Climate): WorldSpec {
  return {
    subject: seed.subject,
    action: "holding still as the world moves around it",
    setting: seed.mood || seed.hook,
    timeOfDay: "",
    weather: weatherPhrase(climate),
    season: seasonPhrase(climate.season),
    lighting: "",
    lens: "",
    cameraMove: "",
    palette: seed.palette,
    texture: seed.texture,
    renderCue: "",
    motifs: seed.keywords.slice(0, 4),
  };
}

export interface ExploreStep {
  id: string;
  atMs: number;
  prompt: string;
  camera: CameraState;
  climate: Climate;
  reason: string;
  sectionRole?: SectionRole;
}

export interface ExploreScore {
  seedId: string;
  steps: ExploreStep[];
  durationMs: number;
}

/** Keep prompts well inside anything the model is likely to truncate. */
const MAX_PROMPT_CHARS = 1000;

function trimPrompt(prompt: string): string {
  if (prompt.length <= MAX_PROMPT_CHARS) return prompt;
  // Cut on a sentence boundary so the model never receives half a clause.
  const clipped = prompt.slice(0, MAX_PROMPT_CHARS);
  const lastStop = clipped.lastIndexOf(". ");
  return lastStop > 0 ? clipped.slice(0, lastStop + 1) : clipped;
}

/**
 * Merge the two things that drive Explore mode onto one timeline: section
 * boundaries move the camera, climate cues rewrite the prompt. Both can land at
 * the same moment, so they're merged and de-duplicated rather than run as two
 * loops racing each other.
 */
/**
 * Climate cues land on a fixed grid and sections land wherever the music says,
 * so the two routinely fall a fraction of a second apart. Anything closer than
 * this is one moment and gets sent as one command.
 */
const MERGE_WINDOW_MS = 1_500;

interface Mark {
  atMs: number;
  climate?: Climate;
  role?: SectionRole;
  reason: string;
}

export function compileExplore(analysis: AudioAnalysis, seed: SeedImage): ExploreScore {
  const raw: Mark[] = [
    ...compileClimate(analysis).map((cue) => ({
      atMs: Math.round(cue.atMs),
      climate: cue.climate,
      reason: cue.reason,
    })),
    ...analysis.sections.map((section) => ({
      atMs: Math.round(section.startMs),
      role: section.role,
      reason: `${section.role} — the camera changes with it`,
    })),
  ].sort((a, b) => a.atMs - b.atMs);

  // Fold near-simultaneous marks together, keeping the earlier time. A section
  // boundary and a weather change 200ms apart would otherwise fire two prompts
  // back to back and read as a stutter.
  const merged: Mark[] = [];
  for (const mark of raw) {
    const previous = merged[merged.length - 1];
    if (previous && mark.atMs - previous.atMs <= MERGE_WINDOW_MS) {
      previous.climate = mark.climate ?? previous.climate;
      previous.role = mark.role ?? previous.role;
      // The climate is the more interesting half, so let it own the wording.
      if (mark.climate) previous.reason = mark.reason;
      continue;
    }
    merged.push({ ...mark });
  }

  const steps: ExploreStep[] = [];
  let climate = climateAt(analysis, 0);
  let role: SectionRole = analysis.sections[0]?.role ?? "intro";

  for (const mark of merged) {
    const atMs = mark.atMs;
    if (mark.climate) climate = mark.climate;
    if (mark.role) role = mark.role;

    const energy =
      analysis.sections.find((s) => atMs >= s.startMs && atMs < s.endMs)?.energy ??
      analysis.meanEnergy;

    steps.push({
      id: `explore-${atMs}`,
      atMs,
      // Camera language is stripped: the pose inputs below are the camera now.
      prompt: trimPrompt(composePrompt(specFromSeed(seed, climate), { camera: false })),
      camera: cameraForRole(role, energy),
      climate,
      reason: mark.reason,
      sectionRole: role,
    });
  }

  return { seedId: seed.id, steps, durationMs: analysis.durationMs };
}

/** Short human label for the camera, for the HUD. */
export function describeCamera(camera: CameraState): string {
  const parts: string[] = [];
  if (camera.moveLongitudinal !== "idle") parts.push(camera.moveLongitudinal);
  if (camera.moveLateral !== "idle") parts.push(camera.moveLateral.replace("_", " "));
  if (camera.lookHorizontal !== "idle") parts.push(`looking ${camera.lookHorizontal}`);
  if (camera.lookVertical !== "idle") parts.push(`looking ${camera.lookVertical}`);
  return parts.length ? parts.join(", ") : "holding still";
}

export { describeWeather };
