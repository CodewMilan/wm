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
}

export const CAMERA_STILL: CameraState = {
  moveLongitudinal: "idle",
  moveLateral: "idle",
  lookHorizontal: "idle",
  lookVertical: "idle",
  rotationSpeedDeg: 0,
};

/**
 * The same camera intent Watch mode writes as prose, expressed as inputs.
 * Energy scales the rotation rate so a loud section actually feels faster
 * rather than just being described that way.
 */
export function cameraForRole(role: SectionRole, energy: number): CameraState {
  const speed = (base: number) => Math.min(30, Math.round(base + energy * 6));

  switch (role) {
    case "drop":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", lookHorizontal: "right", rotationSpeedDeg: speed(9) };
    case "chorus":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", lookHorizontal: "left", rotationSpeedDeg: speed(5) };
    case "build":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(2) };
    case "breakdown":
      // Everything stops. The stillness is the point — it reads as the world
      // holding its breath, and it costs nothing to implement.
      return CAMERA_STILL;
    case "bridge":
      return { ...CAMERA_STILL, moveLateral: "strafe_left", rotationSpeedDeg: speed(2) };
    case "outro":
      return { ...CAMERA_STILL, moveLongitudinal: "back", rotationSpeedDeg: speed(1) };
    case "intro":
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(1) };
    default:
      return { ...CAMERA_STILL, moveLongitudinal: "forward", rotationSpeedDeg: speed(3) };
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
export function compileExplore(analysis: AudioAnalysis, seed: SeedImage): ExploreScore {
  const climateCues = compileClimate(analysis);
  const marks = new Map<number, { climate?: Climate; role?: SectionRole; reason: string }>();

  for (const cue of climateCues) {
    marks.set(Math.round(cue.atMs), { climate: cue.climate, reason: cue.reason });
  }

  for (const section of analysis.sections) {
    const at = Math.round(section.startMs);
    const existing = marks.get(at);
    if (existing) {
      existing.role = section.role;
      continue;
    }
    marks.set(at, { role: section.role, reason: `${section.role} — the camera changes with it` });
  }

  const ordered = [...marks.entries()].sort((a, b) => a[0] - b[0]);
  const steps: ExploreStep[] = [];

  let climate = climateAt(analysis, 0);
  let role: SectionRole = analysis.sections[0]?.role ?? "intro";

  for (const [atMs, mark] of ordered) {
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
