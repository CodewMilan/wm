import type { AudioAnalysis, Section, SectionRole } from "../audio/types";
import { composePrompt, type ConceptDirection, type WorldSpec } from "./spec";

/** LongLive-2.0 emits 29-frame chunks at 24fps. */
export const CHUNK_MS = (29 / 24) * 1000;
/** A scene auto-completes at 48 chunks; we cut early to leave headroom. */
export const SCENE_MAX_CHUNKS = 48;
const SCENE_SAFE_CHUNKS = 42;
const SCENE_SAFE_MS = SCENE_SAFE_CHUNKS * CHUNK_MS;

export type CueKind = "shot" | "cut";
export type CueSource = "opening" | "structure" | "budget" | "manual";

export interface Cue {
  id: string;
  atMs: number;
  kind: CueKind;
  spec: WorldSpec;
  prompt: string;
  /** Plain-language explanation surfaced in the UI as the cue fires. */
  reason: string;
  source: CueSource;
  sectionRole?: SectionRole;
}

export interface Score {
  directionId: string;
  cues: Cue[];
  durationMs: number;
}

/**
 * Roles that warrant a hard cut: the track has genuinely changed place, so
 * carrying the old scene's memory across would muddy it. Everything else is a
 * soft shot that evolves the world we're already in.
 */
const CUT_ROLES: SectionRole[] = ["drop", "chorus", "breakdown", "bridge"];

/** Camera language scaled by how hard the section is hitting. */
function cameraForSection(section: Section, bpm: number): string {
  const fast = bpm >= 128;
  switch (section.role) {
    case "drop":
      return fast
        ? "violent sweeping crane move that hurtles through the space, the horizon tilting"
        : "heavy accelerating push-in that slams toward the subject";
    case "chorus":
      return "wide soaring tracking shot rising up and pulling back to reveal the full scale";
    case "build":
      return "relentless slow push-in that tightens frame by frame, pressure building";
    case "breakdown":
      return "near-static hold, the camera barely drifting, everything suspended";
    case "bridge":
      return "slow lateral dolly gliding sideways past the subject, revealing new ground";
    case "outro":
      return "gentle drifting pull-back that lets the scene recede into the distance";
    case "intro":
      return "patient slow dolly easing forward into the space";
    default:
      return fast
        ? "steady tracking dolly moving with the subject at pace"
        : "slow tracking dolly moving alongside the subject";
  }
}

function lensForSection(section: Section, base: WorldSpec): string {
  switch (section.role) {
    case "chorus":
    case "drop":
      return "sweeping wide-angle cinematic shot, deep focus";
    case "breakdown":
      return "intimate close shot on a long lens, very shallow depth of field";
    case "build":
      return "tightening medium shot on a long lens, shallow depth of field";
    default:
      return base.lens;
  }
}

/** Push the palette hotter or colder depending on the section's energy. */
function paletteForSection(section: Section, base: WorldSpec): string {
  if (section.role === "drop" || section.role === "chorus") {
    return `${base.palette}, pushed to its most saturated and high-contrast`;
  }
  if (section.role === "breakdown" || section.role === "outro") {
    return `${base.palette}, desaturated and cooled almost to monochrome`;
  }
  return base.palette;
}

function lightingForSection(section: Section, base: WorldSpec): string {
  if (section.isImpact) {
    return `${base.lighting}, and the whole scene suddenly floods with hard light`;
  }
  if (section.role === "breakdown") {
    return "a single weak source barely lifts the scene out of darkness, everything else falling away";
  }
  return base.lighting;
}

/**
 * Build the section's scene as a variation on the direction's base world.
 * Every cue stays recognisably the same world — that's what makes the result
 * feel composed rather than a slideshow of unrelated prompts.
 */
function specForSection(section: Section, base: WorldSpec, bpm: number): WorldSpec {
  const motif = base.motifs[Math.floor(section.startMs / 1000) % Math.max(1, base.motifs.length)];
  const wantsMotif = section.role === "bridge" || section.role === "breakdown";

  return {
    ...base,
    action: section.isImpact ? `${base.action}, breaking into sudden violent motion` : base.action,
    setting: wantsMotif && motif ? `${base.setting}, ${motif} appearing again` : base.setting,
    lighting: lightingForSection(section, base),
    lens: lensForSection(section, base),
    cameraMove: cameraForSection(section, bpm),
    palette: paletteForSection(section, base),
  };
}

function reasonFor(section: Section, kind: CueKind): string {
  const verb = kind === "cut" ? "hard cut" : "shot change";
  const role = section.role;
  if (section.isImpact) return `${role} — ${verb} on the impact`;
  return `${role} — ${verb} on the section boundary`;
}

/** Snap a time onto the nearest downbeat so cues land musically, not arbitrarily. */
function quantiseToDownbeat(ms: number, analysis: AudioAnalysis): number {
  const bar = analysis.beatMs * 4;
  if (!Number.isFinite(bar) || bar <= 0) return ms;
  const offset = ms - analysis.beatPhaseMs;
  const snapped = Math.round(offset / bar) * bar + analysis.beatPhaseMs;
  return Math.max(0, snapped);
}

/**
 * Compile a track's structure into a shot/cut score for one direction.
 *
 * Two invariants matter and both are enforced here:
 *  1. A scene must be cut before it reaches LongLive's 48-chunk ceiling, or
 *     generation silently stops. Long sections get a forced mid-section cut.
 *  2. The first cue is always the opener, sent as `set_shot` before `start`.
 */
export function compileScore(analysis: AudioAnalysis, direction: ConceptDirection): Score {
  const base = direction.world;
  const cues: Cue[] = [];
  let msSinceCut = 0;
  let lastAt = 0;

  const push = (cue: Omit<Cue, "id" | "prompt">) => {
    const prompt = composePrompt(cue.spec);
    cues.push({ ...cue, id: `${cue.source}-${Math.round(cue.atMs)}`, prompt });
    if (cue.kind === "cut") msSinceCut = 0;
    lastAt = cue.atMs;
  };

  const opening = analysis.sections[0];
  push({
    atMs: 0,
    kind: "cut",
    spec: opening ? specForSection(opening, base, analysis.bpm) : base,
    reason: "opening shot — establishing the world",
    source: "opening",
    sectionRole: opening?.role,
  });

  for (let i = 1; i < analysis.sections.length; i++) {
    const section = analysis.sections[i];
    const at = quantiseToDownbeat(section.startMs, analysis);

    msSinceCut += at - lastAt;

    // Invariant 1: never let a scene run past the safe chunk budget.
    const forcedByBudget = msSinceCut >= SCENE_SAFE_MS;
    const kind: CueKind =
      forcedByBudget || CUT_ROLES.includes(section.role) || section.isImpact ? "cut" : "shot";

    push({
      atMs: at,
      kind,
      spec: specForSection(section, base, analysis.bpm),
      reason: forcedByBudget && !CUT_ROLES.includes(section.role)
        ? `${section.role} — cut to extend the scene budget`
        : reasonFor(section, kind),
      source: forcedByBudget && !CUT_ROLES.includes(section.role) ? "budget" : "structure",
      sectionRole: section.role,
    });

    // A single section can outlast the budget on its own; break it up.
    let cursor = at;
    const end = Math.min(section.endMs, analysis.durationMs);
    while (end - cursor > SCENE_SAFE_MS) {
      cursor = quantiseToDownbeat(cursor + SCENE_SAFE_MS, analysis);
      if (cursor >= end) break;
      push({
        atMs: cursor,
        kind: "cut",
        spec: specForSection(section, base, analysis.bpm),
        reason: `${section.role} — cut to extend the scene budget`,
        source: "budget",
        sectionRole: section.role,
      });
    }
  }

  cues.sort((a, b) => a.atMs - b.atMs);
  return { directionId: direction.id, cues, durationMs: analysis.durationMs };
}
