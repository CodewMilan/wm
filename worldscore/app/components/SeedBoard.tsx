"use client";

import { useMemo } from "react";
import { useWorldscore } from "../lib/store";
import { SEED_IMAGES, type SeedImage } from "../lib/world/seeds";
import { climateForSection, describeWeather } from "../lib/world/climate";
import type { AudioAnalysis } from "../lib/audio/types";

/**
 * Explore mode can't start without a reference image, so this replaces the
 * generated concept board: the world is chosen by picking the still it grows
 * from. Ranking is a hint, not a filter — every seed stays pickable.
 */
export function SeedBoard() {
  const { analysis, chooseSeed } = useWorldscore();

  const ranked = useMemo(() => {
    if (!analysis) return SEED_IMAGES.map((seed) => ({ seed, fit: 0 }));
    return SEED_IMAGES.map((seed) => ({ seed, fit: fitScore(seed, analysis) })).sort(
      (a, b) => b.fit - a.fit,
    );
  }, [analysis]);

  if (!analysis) return null;

  const opening = analysis.sections[0]
    ? climateForSection(analysis, analysis.sections[0])
    : null;

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-zinc-500">
        <span>
          {analysis.key.tonicName} {analysis.key.mode}
        </span>
        {opening && (
          <span>
            opens in {opening.season} under {describeWeather(opening)}
          </span>
        )}
        <span className="text-zinc-600">
          the music drives the weather and season from here
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ranked.map(({ seed, fit }, i) => (
          <SeedCard
            key={seed.id}
            seed={seed}
            suggested={i < 3 && fit > 0}
            onSelect={() => chooseSeed(seed)}
          />
        ))}
      </div>
    </>
  );
}

/**
 * A rough "does this picture suit this track" score. Deliberately simple and
 * legible rather than clever: dark tracks want dark images, busy tracks want
 * busy ones, and anything the mood tags literally name counts double.
 */
function fitScore(seed: SeedImage, analysis: AudioAnalysis): number {
  const haystack = `${seed.keywords.join(" ")} ${seed.mood} ${seed.palette}`.toLowerCase();
  let score = 0;

  for (const tag of analysis.moodTags) {
    if (haystack.includes(tag.toLowerCase())) score += 2;
  }

  const dark = /dark|black|shadow|night|deep|muted|silhouette/.test(haystack);
  const bright = /bright|vibrant|glow|luminous|neon|rainbow|dazzling/.test(haystack);
  if (analysis.meanBrightness < 0.4 && dark) score += 1;
  if (analysis.meanBrightness > 0.6 && bright) score += 1;

  const busy = /complex|fragmented|layered|swirl|vortex|kaleidoscope|explosion/.test(haystack);
  if (analysis.meanEnergy > 0.55 && busy) score += 1;
  if (analysis.meanEnergy < 0.35 && !busy) score += 1;

  if (analysis.key.mode === "minor" && dark) score += 1;

  return score;
}

function SeedCard({
  seed,
  suggested,
  onSelect,
}: {
  seed: SeedImage;
  suggested: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left transition-all duration-300 hover:-translate-y-1 hover:border-zinc-600"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* Static local assets already sized to the model's frame — next/image
            would add a resize pass for no benefit. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={seed.image}
          alt={seed.name}
          width={seed.width}
          height={seed.height}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
        {suggested && (
          <span className="absolute left-3 top-3 rounded-full border border-brand/50 bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-brand">
            suits this track
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-[15px] font-light leading-snug tracking-tight text-zinc-50">
          {seed.name}
        </h2>
        <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-zinc-400">{seed.hook}</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {seed.keywords.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <span className="mt-auto pt-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-brand">
          Walk into it →
        </span>
      </div>
    </button>
  );
}
