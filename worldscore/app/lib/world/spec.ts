// A WorldSpec is a structured scene description. The LLM returns these rather
// than finished prompt strings, because LongLive-2.0 needs every soft shot to
// re-establish subject and setting in full — so we have to re-render a whole
// dense paragraph on each transition, not append a modifier to the last one.
// Keeping the scene as fields also makes the live controls deterministic:
// "darker" is a field transform, not another round-trip to a model.

export interface WorldSpec {
  /** Subject with a concrete distinguishing detail. */
  subject: string;
  /** What the subject is doing right now. */
  action: string;
  /** Where we are. */
  setting: string;
  timeOfDay: string;
  /** Lighting described by its effect on the scene, not a colour temperature. */
  lighting: string;
  lens: string;
  cameraMove: string;
  palette: string;
  texture: string;
  /** "photoreal", "35mm film look", "nature-documentary look". */
  renderCue: string;
  /** Recurring visual motifs the score can reintroduce later. */
  motifs: string[];
}

export interface ConceptDirection {
  id: string;
  name: string;
  hook: string;
  summary: string;
  styleTags: string[];
  /** Why this direction suits the track — shown on the card. */
  rationale: string;
  /** Two hex colours driving the card's treatment. */
  colors: [string, string];
  world: WorldSpec;
}

/**
 * Render a WorldSpec as the dense cinematic paragraph LongLive-2.0 responds to.
 * Order follows the model's documented prompt anatomy: subject, action,
 * setting, light, lens and camera, palette and texture, render cue.
 */
export function composePrompt(spec: WorldSpec): string {
  const parts = [
    `${spec.subject} ${spec.action}`,
    `${spec.setting}, ${spec.timeOfDay}`,
    spec.lighting,
    `${spec.lens}, ${spec.cameraMove}`,
    `${spec.palette}, ${spec.texture}`,
    spec.renderCue,
  ];
  return parts
    .map((p) => p.trim().replace(/[.,]$/, ""))
    .filter(Boolean)
    .join(". ")
    .concat(".");
}

export type ModifierId =
  | "darker"
  | "brighter"
  | "surreal"
  | "movement"
  | "scale"
  | "calm"
  | "dense";

export interface Modifier {
  id: ModifierId;
  label: string;
  apply: (spec: WorldSpec) => WorldSpec;
}

/**
 * Live creative controls. Each one rewrites fields of the spec, so the composer
 * can emit a fresh full paragraph that still reads as one coherent scene.
 */
export const MODIFIERS: Modifier[] = [
  {
    id: "darker",
    label: "Darker",
    apply: (s) => ({
      ...s,
      timeOfDay: "deep night",
      lighting: "only a thin rim of cold light separates the shapes from the darkness, everything else falling into shadow",
      palette: "near-monochrome palette of black, slate and bruised blue",
    }),
  },
  {
    id: "brighter",
    label: "Brighter",
    apply: (s) => ({
      ...s,
      timeOfDay: "high golden hour",
      lighting: "warm low sunlight rakes across the scene and blows out the horizon into pale haze",
      palette: "luminous palette of gold, amber and bleached white",
    }),
  },
  {
    id: "surreal",
    label: "More surreal",
    apply: (s) => ({
      ...s,
      setting: `${s.setting}, where the ordinary rules of gravity and scale have quietly stopped applying`,
      texture: "impossible reflections and softly duplicating forms, dreamlike but photographically rendered",
      renderCue: "photoreal but uncanny, shot like a memory",
    }),
  },
  {
    id: "movement",
    label: "More movement",
    apply: (s) => ({
      ...s,
      cameraMove: "fast sweeping tracking shot that races alongside the subject, the frame surging and settling",
      action: `${s.action}, everything around it rushing past`,
    }),
  },
  {
    id: "scale",
    label: "Bigger scale",
    apply: (s) => ({
      ...s,
      lens: "extreme wide-angle establishing shot on a long lens",
      setting: `${s.setting}, stretching out to an impossibly vast horizon that dwarfs everything in frame`,
    }),
  },
  {
    id: "calm",
    label: "Calmer",
    apply: (s) => ({
      ...s,
      cameraMove: "almost motionless slow drift, the frame barely breathing",
      action: `${s.action} very slowly, held in stillness`,
    }),
  },
  {
    id: "dense",
    label: "Denser",
    apply: (s) => ({
      ...s,
      texture: "thick volumetric haze, drifting particles and fine airborne debris catching the light",
    }),
  },
];

export function applyModifiers(spec: WorldSpec, ids: ModifierId[]): WorldSpec {
  return ids.reduce((acc, id) => {
    const mod = MODIFIERS.find((m) => m.id === id);
    return mod ? mod.apply(acc) : acc;
  }, spec);
}
