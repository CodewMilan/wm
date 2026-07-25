import type { ConceptDirection } from "../world/spec";

// The offline concept library. Two jobs: it's the fallback when no LLM is
// configured or the provider is slow, and it's the few-shot reference for what
// a good direction looks like.
//
// Every archetype leans on natural environments, weather and wildlife, because
// that is LongLive-2.0's documented strength. Purely architectural worlds look
// noticeably weaker, so where we want built structures they're always being
// reclaimed by landscape rather than standing on their own.

export interface Archetype extends Omit<ConceptDirection, "id" | "rationale"> {
  /** Where this world sits on each axis, 0..1. Used to match it to a track. */
  affinity: { energy: number; brightness: number; tempo: number };
  /** Coarse family, so the five picks stay visually distinct from each other. */
  family: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    name: "Salt Cathedral",
    hook: "A dried inland sea that turned into architecture.",
    summary:
      "Endless cracked salt flat under a blown-out white sky, broken by mineral spires that grew like columns. Everything is bleached, silent and enormous.",
    styleTags: ["minimal", "blinding", "vast", "sacred"],
    colors: ["#EDE7DC", "#8C97A8"],
    family: "desert",
    affinity: { energy: 0.35, brightness: 0.85, tempo: 0.3 },
    world: {
      subject: "a colossal mineral spire of white crystalline salt, its flanks scored with fine wind-cut grooves",
      action: "stands motionless above a cracked hexagonal salt pan that runs to every horizon",
      setting: "an endless dried inland sea of blinding white salt",
      timeOfDay: "flat midday under a blown-out sky",
      lighting:
        "harsh vertical sunlight bleaches the crust to pure white and throws only the thinnest hard shadows",
      lens: "wide cinematic establishing shot on a long lens, deep focus",
      cameraMove: "slow patient dolly gliding low across the salt",
      palette: "near-white palette of bone, pale grey and faint mineral blue",
      texture: "fine crystalline grain, shimmering heat distortion in the far distance",
      renderCue: "photoreal, large-format landscape photography look",
      motifs: ["a single line of footprints", "a distant salt spire", "heat shimmer"],
    },
  },
  {
    name: "Ashfall",
    hook: "Snowfall, if the snow were burning.",
    summary:
      "Black basalt fields under a sky raining warm grey ash, embers drifting upward through the fall. Beautiful and quietly apocalyptic.",
    styleTags: ["volcanic", "brooding", "monochrome", "heavy"],
    colors: ["#1B1A19", "#C2440E"],
    family: "volcanic",
    affinity: { energy: 0.7, brightness: 0.2, tempo: 0.5 },
    world: {
      subject: "a vast field of jagged black basalt, still faintly glowing in the cracks between the rocks",
      action: "lies under a slow steady fall of warm grey ash that settles and softens every edge",
      setting: "a cooling lava plain beneath an invisible volcano",
      timeOfDay: "an hour with no sun, the sky a lid of smoke",
      lighting:
        "dull orange light leaks up from the fissures underfoot and catches the underside of the falling ash",
      lens: "wide cinematic shot on a long lens, shallow depth of field",
      cameraMove: "slow tracking dolly drifting across the rock",
      palette: "charcoal and ash grey cut with molten orange",
      texture: "thick drifting ash, floating embers, heavy volumetric smoke",
      renderCue: "photoreal, 35mm film look with deep blacks",
      motifs: ["a rising ember", "a glowing fissure", "ash settling on stone"],
    },
  },
  {
    name: "Deep Current",
    hook: "The ocean at the depth where light gives up.",
    summary:
      "Shafts of pale light falling through open blue water into a swaying kelp forest, enormous shapes moving somewhere below.",
    styleTags: ["submerged", "weightless", "vast", "hypnotic"],
    colors: ["#062B3F", "#3FB8C4"],
    family: "aquatic",
    affinity: { energy: 0.3, brightness: 0.4, tempo: 0.25 },
    world: {
      subject: "a towering kelp forest, each frond turning slowly in the current, backlit to translucent gold-green",
      action: "sways in a deep unhurried rhythm as pale light falls through it in solid shafts",
      setting: "deep open ocean above a kelp canopy, the seafloor invisible below",
      timeOfDay: "midday far above, filtered to dusk down here",
      lighting:
        "God-rays punch down through the surface and scatter into fine drifting particles, everything beyond fading to blue",
      lens: "wide underwater cinematic shot, shallow depth of field",
      cameraMove: "weightless slow drift rising gently through the kelp",
      palette: "deep teal and midnight blue lit by pale gold shafts",
      texture: "suspended marine snow, soft caustics rippling over every surface",
      renderCue: "photoreal, natural-history documentary look",
      motifs: ["a vast shadow passing below", "a rising column of bubbles", "light shafts"],
    },
  },
  {
    name: "Monsoon Terraces",
    hook: "A hillside of mirrors in a downpour.",
    summary:
      "Flooded rice terraces stacked up a green mountainside in torrential rain, each one a sheet of silver reflecting a bruised sky.",
    styleTags: ["saturated", "rain-soaked", "layered", "alive"],
    colors: ["#123524", "#9FB6A0"],
    family: "verdant",
    affinity: { energy: 0.55, brightness: 0.5, tempo: 0.55 },
    world: {
      subject: "hundreds of flooded rice terraces stepping up a steep mountainside, each one a still sheet of silver water",
      action: "take a heavy monsoon downpour, the rain stippling every surface into shivering light",
      setting: "a terraced mountain valley deep in the rainy season",
      timeOfDay: "late afternoon under a bruised storm sky",
      lighting:
        "flat silver storm light turns every flooded terrace into a mirror while the hills behind sink into grey",
      lens: "wide cinematic establishing shot on a long lens",
      cameraMove: "slow lateral dolly gliding sideways across the terraces",
      palette: "saturated emerald and moss green against pewter and rain-silver",
      texture: "dense falling rain, low cloud tearing across the ridge, fine mist",
      renderCue: "photoreal, cinematic anamorphic look",
      motifs: ["a single figure under a wide hat", "cloud snagged on a ridge", "rain rings on water"],
    },
  },
  {
    name: "Aurora Tundra",
    hook: "A frozen plain lit entirely from the sky.",
    summary:
      "Wind-scoured snow under an aurora that fills the whole frame, a wolf pack moving through on the horizon line.",
    styleTags: ["frozen", "electric", "lonely", "immense"],
    colors: ["#0A1428", "#5CE1A8"],
    family: "polar",
    affinity: { energy: 0.4, brightness: 0.35, tempo: 0.35 },
    world: {
      subject: "an endless wind-scoured snow plain under an aurora that fills the entire sky in slow green curtains",
      action: "lies utterly still while the light overhead writhes and reorganises itself",
      setting: "high arctic tundra with a low broken ridge on the horizon",
      timeOfDay: "the middle of a polar night",
      lighting:
        "the aurora is the only light source, washing the snow in shifting green and casting no hard shadow at all",
      lens: "very wide cinematic establishing shot, deep focus",
      cameraMove: "slow drifting dolly moving forward across the snow",
      palette: "deep indigo and black snow lit by electric green and violet",
      texture: "fine spindrift blowing across the crust, crystalline sparkle",
      renderCue: "photoreal, long-exposure night photography look",
      motifs: ["a distant wolf pack", "spindrift curling off a ridge", "the aurora reforming"],
    },
  },
  {
    name: "Dust Rally",
    hook: "Two hundred horses and nowhere to stop.",
    summary:
      "A herd at full gallop through a red canyon, the whole frame consumed by low sun and thrown dust.",
    styleTags: ["kinetic", "scorched", "physical", "urgent"],
    colors: ["#4A1C0E", "#E2822F"],
    family: "desert",
    affinity: { energy: 0.9, brightness: 0.6, tempo: 0.85 },
    world: {
      subject: "a herd of wild horses at full gallop, muscle and mane straining, hooves throwing up sheets of red dust",
      action: "thunders down a narrowing sandstone canyon at speed",
      setting: "a deep red sandstone canyon with sheer scored walls",
      timeOfDay: "low sun an hour before dusk",
      lighting:
        "hard raking sunlight cuts between the canyon walls and backlights the dust into a solid glowing curtain",
      lens: "wide tracking shot on a long lens, shallow depth of field",
      cameraMove: "fast sweeping tracking shot racing alongside the herd",
      palette: "burnt sienna, rust red and hot amber",
      texture: "heavy airborne dust, grit streaking through the light",
      renderCue: "photoreal, high-shutter action cinematography",
      motifs: ["a lead horse breaking clear", "dust curtain", "canyon wall streaking past"],
    },
  },
  {
    name: "Glasshouse Ruin",
    hook: "The jungle won, and it took its time.",
    summary:
      "A collapsed Victorian conservatory swallowed by rainforest, broken panes hanging in a green cathedral light.",
    styleTags: ["overgrown", "melancholy", "ornate", "humid"],
    colors: ["#1E3524", "#D9C9A3"],
    family: "verdant",
    affinity: { energy: 0.45, brightness: 0.55, tempo: 0.4 },
    world: {
      subject: "the rusted iron skeleton of an enormous Victorian glasshouse, most of its panes gone, the rest hanging cracked",
      action: "stands half-swallowed by rainforest, fig roots pouring through its frame and prising it apart",
      setting: "deep tropical rainforest that has entirely reclaimed a botanical garden",
      timeOfDay: "humid mid-morning",
      lighting:
        "green filtered daylight falls through the canopy and the broken roof in soft dusty columns",
      lens: "wide cinematic shot on a long lens, shallow depth of field",
      cameraMove: "slow push-in gliding through the empty window frames",
      palette: "deep jungle green and wet black iron warmed by pale bone light",
      texture: "hanging humidity, drifting pollen, moss and lichen on every surface",
      renderCue: "photoreal, 35mm film look",
      motifs: ["a hanging cracked pane", "a fig root through iron", "drifting pollen"],
    },
  },
  {
    name: "Thermal Field",
    hook: "Ground that breathes.",
    summary:
      "A geothermal basin of impossibly coloured pools and steam vents, mineral crusts in acid orange and cyan.",
    styleTags: ["alien", "chemical", "steaming", "surreal"],
    colors: ["#12333A", "#E9A13B"],
    family: "geothermal",
    affinity: { energy: 0.5, brightness: 0.6, tempo: 0.45 },
    world: {
      subject: "a wide geothermal basin of steaming mineral pools ringed in acid orange, sulphur yellow and impossible cyan",
      action: "exhales steady columns of white steam that drift low across the crust",
      setting: "a volcanic hot-spring field of brittle mineral terraces",
      timeOfDay: "cold clear early morning",
      lighting:
        "low side light catches the steam and turns each column into a solid bright shape against the dark ground",
      lens: "wide cinematic aerial shot on a long lens",
      cameraMove: "slow high drift gliding over the pools",
      palette: "acid orange and sulphur yellow against deep mineral teal",
      texture: "thick rolling steam, crusted mineral ridges, faint chemical shimmer",
      renderCue: "photoreal, aerial documentary look",
      motifs: ["a steam column bending", "a rimmed cyan pool", "cracked mineral crust"],
    },
  },
  {
    name: "Storm Coast",
    hook: "Weather as a wall.",
    summary:
      "Black cliffs taking an Atlantic storm head-on, waves detonating upward into a sky full of spray and gulls.",
    styleTags: ["violent", "grey-green", "monumental", "cold"],
    colors: ["#1F2A2E", "#8FB2A6"],
    family: "coastal",
    affinity: { energy: 0.95, brightness: 0.4, tempo: 0.7 },
    world: {
      subject: "a wall of black basalt sea cliffs taking the full force of an Atlantic storm swell",
      action: "is struck by enormous waves that detonate upward in slow towers of white water",
      setting: "an exposed north Atlantic coastline in a winter gale",
      timeOfDay: "storm-darkened afternoon",
      lighting:
        "cold flat storm light with one weak break in the cloud lighting the spray from behind",
      lens: "wide cinematic shot on a very long lens, compressed perspective",
      cameraMove: "heavy slow tracking move along the cliff face",
      palette: "slate grey, sea green and cold white foam",
      texture: "airborne spray, driving rain, foam streaking the black rock",
      renderCue: "photoreal, telephoto storm-chase cinematography",
      motifs: ["gulls holding still in the wind", "a wave tower collapsing", "foam streaks"],
    },
  },
  {
    name: "Ember Savanna",
    hook: "Golden hour, one day after the fire.",
    summary:
      "Burnt savanna still smoking at sunset, elephants moving through low smoke and backlit ash.",
    styleTags: ["golden", "smoky", "elegiac", "wide"],
    colors: ["#3B2410", "#E8B04B"],
    family: "savanna",
    affinity: { energy: 0.6, brightness: 0.75, tempo: 0.6 },
    world: {
      subject: "a herd of elephants moving in single file, dust and ash grey on their backs, tusks catching the light",
      action: "walks slowly through burnt savanna grass that is still smoking in patches",
      setting: "an East African plain the day after a grass fire, acacia trees standing black",
      timeOfDay: "deep golden hour, sun almost on the horizon",
      lighting:
        "warm low sunlight rakes horizontally through the smoke and backlights every animal in a bright rim",
      lens: "wide cinematic establishing shot on a very long lens, shallow depth of field",
      cameraMove: "slow tracking dolly moving parallel with the herd",
      palette: "rich gold and amber against burnt black ground",
      texture: "low drifting smoke, floating ash, fine airborne dust in the light",
      renderCue: "photoreal, nature-documentary look",
      motifs: ["a calf falling behind", "a burnt acacia silhouette", "ash lifting on the wind"],
    },
  },
];

/**
 * Pick five directions matched to the track and spread across families, so the
 * board never shows five variations of the same idea.
 */
export function selectArchetypes(features: {
  meanEnergy: number;
  meanBrightness: number;
  bpm: number;
}): Archetype[] {
  const tempoNorm = Math.min(1, Math.max(0, (features.bpm - 60) / 120));

  const scored = ARCHETYPES.map((a) => {
    const distance =
      Math.abs(a.affinity.energy - features.meanEnergy) * 1.2 +
      Math.abs(a.affinity.brightness - features.meanBrightness) +
      Math.abs(a.affinity.tempo - tempoNorm);
    return { archetype: a, distance };
  }).sort((x, y) => x.distance - y.distance);

  const picked: Archetype[] = [];
  const families = new Set<string>();

  for (const { archetype } of scored) {
    if (picked.length >= 5) break;
    if (families.has(archetype.family)) continue;
    picked.push(archetype);
    families.add(archetype.family);
  }
  for (const { archetype } of scored) {
    if (picked.length >= 5) break;
    if (!picked.includes(archetype)) picked.push(archetype);
  }

  return picked;
}
