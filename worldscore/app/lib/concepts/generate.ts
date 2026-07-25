import type { AudioAnalysis } from "../audio/types";
import type { ConceptDirection, WorldSpec } from "../world/spec";
import { ARCHETYPES, selectArchetypes, type Archetype } from "./archetypes";

// Provider-agnostic: anything exposing an OpenAI-compatible /chat/completions
// endpoint works. Defaults target NVIDIA NIM, which serves Nemotron free.
const BASE_URL = process.env.LLM_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
const MODEL = process.env.LLM_MODEL ?? "nvidia/llama-3.3-nemotron-super-49b-v1.5";
const API_KEY = process.env.LLM_API_KEY;
/** Past this the user is staring at a loading screen; fall back instead. */
const TIMEOUT_MS = 25_000;

const SYSTEM_PROMPT = `You are the concept director for Worldscore, a tool that turns a musician's rough track into cinematic world directions for a real-time video model.

The video model you are writing for is strongest at NATURAL environments: landscapes, weather, oceans, forests, deserts, ice, wildlife. It is measurably weaker at cities, crowds, interiors, text, and human faces. Built structures are allowed only when they are being reclaimed or dwarfed by landscape.

You return a JSON object describing five world directions. Each direction is a structured scene, NOT a finished prompt — the app assembles the prompt from your fields.

Rules:
- The five directions must be radically distinct from each other: different biome, palette, time of day, and energy. Never five variations of one idea.
- Every field is a dense, specific, cinematic fragment. "a tiger" is wrong; "a Bengal tiger, muscle rolling under wet striped fur" is right.
- Describe lighting by its EFFECT on the scene, never as a colour temperature.
- No camera brand names, no lens millimetre numbers, no aspect ratios, no text overlays.
- Match the directions to the track's tempo, energy and brightness described by the user.

Return ONLY valid JSON matching exactly this shape:
{"directions":[{"name":"2-3 words","hook":"one sentence under 12 words","summary":"2 sentences","styleTags":["4 lowercase tags"],"rationale":"one sentence on why this suits THIS track","colors":["#RRGGBB","#RRGGBB"],"world":{"subject":"","action":"","setting":"","timeOfDay":"","lighting":"","lens":"","cameraMove":"","palette":"","texture":"","renderCue":"","motifs":["","",""]}}]}`;

function describeTrack(analysis: AudioAnalysis): string {
  const structure = analysis.sections
    .map((s) => `${s.role} (${(s.startMs / 1000).toFixed(0)}s, energy ${s.energy.toFixed(2)})`)
    .join(", ");

  return `Track analysis:
- Tempo: ${analysis.bpm} BPM
- Duration: ${(analysis.durationMs / 1000).toFixed(0)} seconds
- Overall energy: ${analysis.meanEnergy.toFixed(2)} of 1
- Brightness: ${analysis.meanBrightness.toFixed(2)} of 1 (low means dark and murky)
- Dynamic range: ${analysis.dynamicRange.toFixed(2)} of 1
- Low-end weight: ${analysis.lowEnd.toFixed(2)} of 1
- Mood descriptors: ${analysis.moodTags.join(", ")}
- Structure: ${structure}

Give me five world directions for this track.`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type WorldTextField = Exclude<keyof WorldSpec, "motifs">;

const WORLD_FIELDS: WorldTextField[] = [
  "subject",
  "action",
  "setting",
  "timeOfDay",
  "lighting",
  "lens",
  "cameraMove",
  "palette",
  "texture",
  "renderCue",
];

/** Validate one LLM direction, borrowing from an archetype for anything missing. */
function coerceDirection(raw: unknown, index: number, filler: Archetype): ConceptDirection | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const rawWorld = (typeof r.world === "object" && r.world !== null ? r.world : {}) as Record<
    string,
    unknown
  >;

  if (!isNonEmptyString(r.name)) return null;
  if (!isNonEmptyString(rawWorld.subject) || !isNonEmptyString(rawWorld.setting)) return null;

  const world = {} as WorldSpec;
  for (const field of WORLD_FIELDS) {
    world[field] = isNonEmptyString(rawWorld[field]) ? rawWorld[field].trim() : filler.world[field];
  }
  world.motifs = Array.isArray(rawWorld.motifs)
    ? rawWorld.motifs.filter(isNonEmptyString).slice(0, 4)
    : filler.world.motifs;
  if (world.motifs.length === 0) world.motifs = filler.world.motifs;

  const colors = Array.isArray(r.colors)
    ? r.colors.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
    : [];

  return {
    id: `dir-${index}`,
    name: r.name.trim(),
    hook: isNonEmptyString(r.hook) ? r.hook.trim() : filler.hook,
    summary: isNonEmptyString(r.summary) ? r.summary.trim() : filler.summary,
    styleTags: Array.isArray(r.styleTags)
      ? r.styleTags.filter(isNonEmptyString).slice(0, 5)
      : filler.styleTags,
    rationale: isNonEmptyString(r.rationale) ? r.rationale.trim() : "",
    colors: [colors[0] ?? filler.colors[0], colors[1] ?? filler.colors[1]],
    world,
  };
}

/** Deterministic directions from the archetype library — no model call. */
export function fallbackDirections(analysis: AudioAnalysis): ConceptDirection[] {
  const picks = selectArchetypes({
    meanEnergy: analysis.meanEnergy,
    meanBrightness: analysis.meanBrightness,
    bpm: analysis.bpm,
  });

  const tempoWord = analysis.bpm < 90 ? "slow" : analysis.bpm < 130 ? "mid-tempo" : "fast";
  const energyWord = analysis.meanEnergy > 0.6 ? "dense" : "sparse";

  return picks.map((archetype, index) => ({
    id: `dir-${index}`,
    name: archetype.name,
    hook: archetype.hook,
    summary: archetype.summary,
    styleTags: archetype.styleTags,
    rationale: `Matched to a ${tempoWord}, ${energyWord} track at ${Math.round(analysis.bpm)} BPM with ${analysis.moodTags.slice(0, 2).join(" and ")} character.`,
    colors: archetype.colors,
    world: archetype.world,
  }));
}

export async function generateDirections(analysis: AudioAnalysis): Promise<{
  directions: ConceptDirection[];
  source: "llm" | "fallback";
  note?: string;
}> {
  if (!API_KEY) {
    return { directions: fallbackDirections(analysis), source: "fallback", note: "no LLM key set" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.9,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: describeTrack(analysis) },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`provider returned ${res.status}`);

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty completion");

    // Some providers wrap JSON in prose or a fenced block; take the outermost object.
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no JSON object in completion");
    const parsed = JSON.parse(content.slice(start, end + 1)) as { directions?: unknown[] };

    const fillers = selectArchetypes({
      meanEnergy: analysis.meanEnergy,
      meanBrightness: analysis.meanBrightness,
      bpm: analysis.bpm,
    });

    const directions = (parsed.directions ?? [])
      .map((raw, i) => coerceDirection(raw, i, fillers[i % fillers.length] ?? ARCHETYPES[0]))
      .filter((d): d is ConceptDirection => d !== null)
      .slice(0, 5);

    // A partial result is worse than a coherent board; top up from the library.
    if (directions.length < 5) {
      const extra = fallbackDirections(analysis).filter(
        (f) => !directions.some((d) => d.name === f.name),
      );
      directions.push(...extra.slice(0, 5 - directions.length));
    }

    return {
      directions: directions.map((d, i) => ({ ...d, id: `dir-${i}` })),
      source: "llm",
    };
  } catch (error) {
    return {
      directions: fallbackDirections(analysis),
      source: "fallback",
      note: (error as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}
