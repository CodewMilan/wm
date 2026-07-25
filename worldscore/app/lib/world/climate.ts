// Music -> weather and season.
//
// The one rule that makes this feel composed rather than random: register and
// consonance are separate axes and must stay separate. Low is not the same as
// sad. A cello swell is low and warm; a diminished stab is high and horrible.
// So pitch height drives how heavy the *weather* is, and major-versus-minor
// drives which *season* we're in. Feed both into one dial and the world
// changes for contradictory reasons and stops reading as intentional.
//
// The second rule is about time. Note-rate signals may only touch small things.
// Weather moves on a phrase timescale, seasons only on section boundaries.
// Everything here is committed through a dwell filter for that reason.

import type { AudioAnalysis, Section } from "../audio/types";

export type Season = "winter" | "autumn" | "spring" | "summer";
export type WeatherId = "clear" | "fair" | "overcast" | "fog" | "rain" | "storm" | "snow";

export interface Climate {
  season: Season;
  weather: WeatherId;
  /** How hard it is coming down, 0..1. Drives adjectives, not the state. */
  intensity: number;
  /** 0..1, from energy and tempo. */
  wind: number;
}

/** Seasons ordered by warmth, so the axis can be moved continuously. */
const SEASONS_BY_WARMTH: Season[] = ["winter", "autumn", "spring", "summer"];

/**
 * Minimum time a weather state must hold before another change is allowed.
 * Without this the sky strobes: a bassline crosses the register threshold
 * several times a bar and every crossing would be a new command.
 */
export const WEATHER_DWELL_MS = 12_000;
/** Seasons are structural. They move at section scale or not at all. */
export const SEASON_DWELL_MS = 30_000;

/** Read a 0..1 curve at a wall-clock position, clamped at both ends. */
function sampleCurve(curve: number[], curveHz: number, atMs: number): number {
  if (curve.length === 0) return 0;
  const index = Math.round((atMs / 1000) * curveHz);
  return curve[Math.min(curve.length - 1, Math.max(0, index))];
}

/**
 * How oppressive the sky should be, 0..1.
 *
 * Register carries most of it because that is the axis the ear reads as weight.
 * Tension adds the sense of something about to break, and darkness of timbre
 * fills in what pitch height alone misses on heavily produced material.
 */
function severityOf(register: number, tension: number, brightness: number): number {
  return Math.min(1, Math.max(0, (1 - register) * 0.6 + tension * 0.25 + (1 - brightness) * 0.15));
}

function weatherFor(severity: number, energy: number, season: Season): WeatherId {
  // Cold seasons turn precipitation to snow rather than reaching for a
  // different severity band — same weight of sky, different substance.
  const freezing = season === "winter";

  if (severity > 0.78) return freezing ? "snow" : "storm";
  if (severity > 0.62) return freezing ? "snow" : "rain";
  if (severity > 0.46) {
    // A heavy sky with nothing happening underneath it reads as fog, not cloud.
    return energy < 0.2 ? "fog" : "overcast";
  }
  if (severity > 0.3) return "fair";
  return "clear";
}

/**
 * Place the season on a warmth axis.
 *
 * Absolute thresholds on majorness don't work: real tracks cluster near the
 * middle of that range, so every song would come out the same season. Instead
 * the track's overall key sets a baseline and each section's deviation from
 * the track's own average moves it from there. A minor track lives in autumn
 * and winter and visits spring; a major track does the reverse.
 */
function seasonFor(majorness: number, trackMajorness: number, isMinorKey: boolean): Season {
  const baseline = isMinorKey ? 0.8 : 2.2;
  const deviation = (majorness - trackMajorness) * 8;
  const warmth = Math.round(Math.min(3, Math.max(0, baseline + deviation)));
  return SEASONS_BY_WARMTH[warmth];
}

/** The climate the music is asking for at one instant, before any dwell filter. */
export function climateAt(analysis: AudioAnalysis, atMs: number): Climate {
  const hz = analysis.curveHz;
  const register = sampleCurve(analysis.registerCurve, hz, atMs);
  const majorness = sampleCurve(analysis.majornessCurve, hz, atMs);
  const tension = sampleCurve(analysis.tensionCurve, hz, atMs);
  const energy = sampleCurve(analysis.energyCurve, hz, atMs);
  const brightness = sampleCurve(analysis.brightnessCurve, hz, atMs);

  const trackMajorness =
    analysis.majornessCurve.reduce((a, b) => a + b, 0) / Math.max(1, analysis.majornessCurve.length);

  const season = seasonFor(majorness, trackMajorness, analysis.key.mode === "minor");
  const severity = severityOf(register, tension, brightness);

  return {
    season,
    weather: weatherFor(severity, energy, season),
    intensity: energy,
    wind: Math.min(1, energy * 0.7 + Math.min(1, analysis.bpm / 160) * 0.3),
  };
}

/** The climate for a whole section, read from its averaged features. */
export function climateForSection(analysis: AudioAnalysis, section: Section): Climate {
  const trackMajorness =
    analysis.majornessCurve.reduce((a, b) => a + b, 0) / Math.max(1, analysis.majornessCurve.length);

  const season = seasonFor(section.majorness, trackMajorness, analysis.key.mode === "minor");
  const severity = severityOf(section.register, section.tension, section.brightness);

  return {
    season,
    weather: weatherFor(severity, section.energy, season),
    intensity: section.energy,
    wind: Math.min(1, section.energy * 0.7 + Math.min(1, analysis.bpm / 160) * 0.3),
  };
}

export interface ClimateCue {
  atMs: number;
  climate: Climate;
  /** Plain-language explanation, surfaced in the UI as the change lands. */
  reason: string;
  changed: ("weather" | "season")[];
}

/**
 * Walk the track and emit only the climate changes worth sending.
 *
 * Sampling happens every `stepMs`, but a change is only committed once the
 * previous one has held for its dwell time. That is what turns a jittery
 * per-frame signal into a handful of deliberate moments.
 */
export function compileClimate(analysis: AudioAnalysis, stepMs = 2_000): ClimateCue[] {
  const cues: ClimateCue[] = [];
  const opening = climateAt(analysis, 0);

  cues.push({
    atMs: 0,
    climate: opening,
    reason: `opening on ${describeWeather(opening)} in ${opening.season}`,
    changed: ["weather", "season"],
  });

  let current = opening;
  let lastWeatherMs = 0;
  let lastSeasonMs = 0;

  for (let atMs = stepMs; atMs < analysis.durationMs; atMs += stepMs) {
    const wanted = climateAt(analysis, atMs);
    const changed: ("weather" | "season")[] = [];

    if (wanted.weather !== current.weather && atMs - lastWeatherMs >= WEATHER_DWELL_MS) {
      changed.push("weather");
      lastWeatherMs = atMs;
    }
    if (wanted.season !== current.season && atMs - lastSeasonMs >= SEASON_DWELL_MS) {
      changed.push("season");
      lastSeasonMs = atMs;
    }
    if (changed.length === 0) continue;

    // Carry forward whichever axis didn't clear its dwell filter, so a season
    // change can't smuggle an un-dwelled weather change along with it.
    const next: Climate = {
      season: changed.includes("season") ? wanted.season : current.season,
      weather: changed.includes("weather") ? wanted.weather : current.weather,
      intensity: wanted.intensity,
      wind: wanted.wind,
    };

    cues.push({
      atMs,
      climate: next,
      reason: changed.includes("season")
        ? `the harmony turns — ${next.season} moves in`
        : `${describeWeather(next)} closing in`,
      changed,
    });
    current = next;
  }

  return cues;
}

/** Short label for UI and logs. */
export function describeWeather(climate: Climate): string {
  const heavy = climate.intensity > 0.6;
  switch (climate.weather) {
    case "clear":
      return "clear skies";
    case "fair":
      return "high thin cloud";
    case "overcast":
      return heavy ? "low heavy overcast" : "flat overcast";
    case "fog":
      return "thick fog";
    case "rain":
      return heavy ? "driving rain" : "steady rain";
    case "storm":
      return "a breaking storm";
    case "snow":
      return heavy ? "blizzard" : "falling snow";
  }
}

/**
 * The weather written the way the video model wants it: what it does to the
 * scene, not a label. These get composed into the prompt paragraph, so they
 * have to read as continuous prose alongside the rest of the WorldSpec.
 */
export function weatherPhrase(climate: Climate): string {
  const hard = climate.intensity > 0.6;
  const windy =
    climate.wind > 0.6 ? ", wind tearing across everything in frame" : ", the air barely moving";

  switch (climate.weather) {
    case "clear":
      return `open cloudless sky with the light falling clean and uninterrupted${windy}`;
    case "fair":
      return `high thin cloud drifting far above, the light soft and even${windy}`;
    case "overcast":
      return hard
        ? `a low bruised ceiling of cloud pressing down close overhead, daylight squeezed to a dull grey${windy}`
        : `flat unbroken overcast flattening every shadow out of the scene${windy}`;
    case "fog":
      return `dense fog swallowing everything past a few paces, shapes surfacing and dissolving again${windy}`;
    case "rain":
      return hard
        ? `heavy rain hammering down, water sheeting off every surface and the ground breaking into puddles${windy}`
        : `steady rain darkening every surface, fine rings spreading across standing water${windy}`;
    case "storm":
      return `a violent storm breaking overhead, rain driving sideways and lightning stuttering behind the cloud${windy}`;
    case "snow":
      return hard
        ? `blizzard snow driving through the frame almost horizontally, visibility collapsing${windy}`
        : `slow heavy snow falling in silence, settling on every upward surface${windy}`;
  }
}

/**
 * The season written as what it does to light, colour and air — never as
 * props. Naming leaves or blossom would wreck any world that has neither: an
 * arctic plain in "late autumn" should read as failing light and draining
 * colour, not as drifts of dead leaves. Same principle the concept generator
 * already applies to lighting.
 */
export function seasonPhrase(season: Season): string {
  switch (season) {
    case "winter":
      return "the stripped-back bareness of deep winter, every surface hard-edged, the air thin and carrying cold";
    case "autumn":
      return "the failing slanted light of late autumn, colour draining out of everything toward grey and rust";
    case "spring":
      return "the thin new light of early spring, everything damp and just beginning to turn over";
    case "summer":
      return "the heavy saturated light of high summer, warmth holding in the air long after its source has gone";
  }
}
