// Turns seedimages/ into something the app can actually use.
//
//   node scripts/build-seed-catalog.mjs
//
// Two jobs. First, LingBot World 2 runs at 1664x960 and wants a 16:9 landscape
// seed — the source images are all portrait, so each one gets centre-cropped to
// the model's ratio and written out as a JPEG. Second, each image's .md sidecar
// is very nearly a WorldSpec already, so it gets parsed into a typed catalog
// rather than retyped by hand.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, basename, extname } from "node:path";

const SOURCE_DIR = "seedimages";
const OUT_IMAGES = "public/seeds";
const OUT_CATALOG = "app/lib/world/seeds.ts";

/** The model's frame ratio. Anything else arrives as artifacts, not an error. */
const TARGET_RATIO = 1664 / 960;
/**
 * Cap on output width. The conditioning resolution the model rescales to is
 * smaller than its output frame, so upscaling past this buys nothing but bytes.
 */
const MAX_WIDTH = 1280;
/** Beyond this the source has been stretched too far to hold up; warn on it. */
const UPSCALE_WARN_AT = 2.0;

function sipsValue(file, key) {
  const out = execFileSync("sips", ["-g", key, file], { encoding: "utf8" });
  return Number(out.trim().split(/\s+/).pop());
}

/** Pull the five bold-labelled fields out of a sidecar. */
function parseSidecar(markdown) {
  const field = (label) => {
    const match = markdown.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return match ? match[1].trim() : "";
  };
  const title = markdown.match(/^#\s*(.+)$/m);
  return {
    title: title ? title[1].trim() : "",
    oneLiner: field("One-liner"),
    subject: field("Subject"),
    visual: field("Visual details"),
    keywords: field("Keywords")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  };
}

/**
 * The sidecar writes everything about the look as one "Visual details" blob.
 * The prompt composer wants it split, so pull palette and texture sentences out
 * by keyword and leave the rest as the render cue.
 */
function splitVisual(visual) {
  const sentences = visual
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
    // The sidecars open by stating the source aspect. Every image gets
    // centre-cropped to landscape here, so that line is now actively wrong.
    .filter((s) => !/^(portrait|landscape|square)\s+orientation$/i.test(s));

  const colourWords =
    /\b(palette|colou?rs?|tones?|hues?|saturat|monochrom|blues?|reds?|greens?|golds?|ambers?|violets?|purples?|oranges?|yellows?|pinks?|teals?|cyans?|magentas?|blacks?|whites?|greys?|grays?|rainbow|neon|pastel)\b/i;
  const textureWords =
    /\b(brushstrokes?|textur|grain|render|painting|painted|illustration|line work|linework|halftone|grit|impasto|airbrush|photoreal)\b/i;

  // Colour wins ties: a sentence describing painted blues is more useful in the
  // palette slot than the texture one, and the composer reads palette first.
  const palette = sentences.filter((s) => colourWords.test(s));
  const texture = sentences.filter((s) => textureWords.test(s) && !palette.includes(s));
  const rest = sentences.filter((s) => !palette.includes(s) && !texture.includes(s));

  const lower = (list, fallback) =>
    list.length
      ? list
          .join(", ")
          .replace(/\s+/g, " ")
          .replace(/^([A-Z])/, (c) => c.toLowerCase())
      : fallback;

  return {
    palette: lower(palette, "saturated high-contrast palette"),
    texture: lower(texture, "richly textured painterly surface"),
    mood: rest.join(". "),
  };
}

rmSync(OUT_IMAGES, { recursive: true, force: true });
mkdirSync(OUT_IMAGES, { recursive: true });

const sidecars = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".md"));
const entries = [];
const warnings = [];

for (const sidecarName of sidecars.sort()) {
  const slug = basename(sidecarName, ".md");
  const image = readdirSync(SOURCE_DIR).find(
    (f) => basename(f, extname(f)) === slug && /\.(png|jpe?g)$/i.test(f),
  );
  if (!image) {
    warnings.push(`${slug}: sidecar has no matching image, skipped`);
    continue;
  }

  const sourcePath = join(SOURCE_DIR, image);
  const width = sipsValue(sourcePath, "pixelWidth");
  const height = sipsValue(sourcePath, "pixelHeight");

  // Centre-crop to the model's ratio, then scale. Cropping first means the
  // scale step never has to distort.
  const cropHeight = Math.min(height, Math.round(width / TARGET_RATIO));
  const cropWidth = Math.min(width, Math.round(cropHeight * TARGET_RATIO));
  const outWidth = Math.min(MAX_WIDTH, Math.round(cropWidth * UPSCALE_WARN_AT));
  const outHeight = Math.round(outWidth / TARGET_RATIO);

  const outPath = join(OUT_IMAGES, `${slug}.jpg`);
  execFileSync("sips", [
    "-c", String(cropHeight), String(cropWidth),
    "-z", String(outHeight), String(outWidth),
    "-s", "format", "jpeg",
    "-s", "formatOptions", "82",
    sourcePath,
    "--out", outPath,
  ]);

  const scale = outWidth / cropWidth;
  if (scale > UPSCALE_WARN_AT - 0.01 && cropWidth < 640) {
    warnings.push(
      `${slug}: source crop is only ${cropWidth}x${cropHeight}, upscaled ${scale.toFixed(1)}x — will look soft`,
    );
  }

  const parsed = parseSidecar(readFileSync(join(SOURCE_DIR, sidecarName), "utf8"));
  const { palette, texture, mood } = splitVisual(parsed.visual);

  entries.push({
    id: slug,
    name: parsed.title,
    hook: parsed.oneLiner,
    image: `/seeds/${slug}.jpg`,
    width: outWidth,
    height: outHeight,
    subject: parsed.subject,
    palette,
    texture,
    mood,
    keywords: parsed.keywords,
  });
}

const banner = `// GENERATED by scripts/build-seed-catalog.mjs — do not edit by hand.
//
// One entry per image in seedimages/. Explore mode needs a reference image
// before the model will start generating at all, so this catalog is the set of
// worlds that mode can offer, and each entry carries enough description to seed
// a WorldSpec that agrees with the picture.
`;

const body = `
export interface SeedImage {
  id: string;
  name: string;
  hook: string;
  /** Path under public/, already cropped to the model's 16:9 frame. */
  image: string;
  width: number;
  height: number;
  subject: string;
  palette: string;
  texture: string;
  mood: string;
  keywords: string[];
}

export const SEED_IMAGES: SeedImage[] = ${JSON.stringify(entries, null, 2)};

export function seedById(id: string): SeedImage | undefined {
  return SEED_IMAGES.find((s) => s.id === id);
}
`;

writeFileSync(OUT_CATALOG, banner + body);

console.log(`wrote ${entries.length} seeds -> ${OUT_CATALOG}`);
console.log(`wrote ${entries.length} images -> ${OUT_IMAGES}/`);
if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const w of warnings) console.log(`  ${w}`);
}
