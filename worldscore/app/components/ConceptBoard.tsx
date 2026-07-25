"use client";

import { useMemo } from "react";
import { useWorldscore, type SessionMode } from "../lib/store";
import { compileScore } from "../lib/world/score";
import type { ConceptDirection } from "../lib/world/spec";
import { SeedBoard } from "./SeedBoard";

export function ConceptBoard() {
  const { trackName, analysis, directions, conceptSource, mode, chooseDirection, reset } =
    useWorldscore();

  if (!analysis) return null;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            {mode === "watch" ? "Five directions" : "Pick a world to enter"}
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-zinc-50">
            {trackName || "Untitled"}
          </h1>
        </div>

        <div className="flex items-center gap-6 font-mono text-[11px] text-zinc-500">
          <span>{Math.round(analysis.bpm)} BPM</span>
          <span>{analysis.sections.length} sections</span>
          <span>{Math.round(analysis.durationMs / 1000)}s</span>
          <span className="max-w-[240px] truncate">{analysis.moodTags.join(" · ")}</span>
          <button
            onClick={reset}
            className="rounded border border-zinc-700 px-2.5 py-1 uppercase tracking-widest text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            New track
          </button>
        </div>
      </header>

      <ModeSwitch />
      <StructureStrip />

      {mode === "watch" ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {directions.map((direction, i) => (
              <ConceptCard
                key={direction.id}
                direction={direction}
                index={i}
                onSelect={() => chooseDirection(direction)}
              />
            ))}
          </div>

          {conceptSource === "fallback" && (
            <p className="mt-6 font-mono text-[11px] text-zinc-600">
              Directions composed from the offline library — no language model configured.
            </p>
          )}
        </>
      ) : (
        <SeedBoard />
      )}
    </div>
  );
}

const MODES: { id: SessionMode; label: string; blurb: string }[] = [
  { id: "watch", label: "Watch", blurb: "a cut-to-the-beat film you sit back and watch" },
  { id: "explore", label: "Explore", blurb: "walk around inside it while the music moves the sky" },
];

/** The one fork in the flow: same track and same climate, two different models. */
function ModeSwitch() {
  const { mode, setMode } = useWorldscore();

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-md px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              mode === m.id
                ? "bg-brand text-brand-fg"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-zinc-500">{MODES.find((m) => m.id === mode)?.blurb}</p>
    </div>
  );
}

/** The track's detected structure, so the mapping is legible before you commit. */
function StructureStrip() {
  const analysis = useWorldscore((s) => s.analysis);
  if (!analysis) return null;

  return (
    <div className="mt-8">
      <div className="flex h-12 w-full gap-[2px] overflow-hidden rounded-md">
        {analysis.sections.map((section) => {
          const width = ((section.endMs - section.startMs) / analysis.durationMs) * 100;
          return (
            <div
              key={section.startMs}
              style={{
                width: `${width}%`,
                background: `rgba(226,196,122,${0.12 + section.energy * 0.55})`,
              }}
              className="group relative flex items-center justify-center"
              title={`${section.role} · ${(section.startMs / 1000).toFixed(0)}s`}
            >
              <span className="truncate px-1 font-mono text-[9px] uppercase tracking-widest text-zinc-900/80">
                {section.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConceptCard({
  direction,
  index,
  onSelect,
}: {
  direction: ConceptDirection;
  index: number;
  onSelect: () => void;
}) {
  const analysis = useWorldscore((s) => s.analysis);

  // Compiling here is cheap and shows the shot/cut shape on the card, which is
  // what actually distinguishes one direction's treatment from another.
  const shape = useMemo(() => {
    if (!analysis) return null;
    const score = compileScore(analysis, direction);
    return {
      cuts: score.cues.filter((c) => c.kind === "cut").length,
      shots: score.cues.filter((c) => c.kind === "shot").length,
    };
  }, [analysis, direction]);

  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 text-left transition-all duration-300 hover:-translate-y-1 hover:border-zinc-600"
    >
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{
          background: `linear-gradient(150deg, ${direction.colors[0]} 0%, ${direction.colors[1]} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-40 mix-blend-overlay [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.14)_0px,transparent_2px,transparent_5px)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        <span className="absolute left-3 top-3 font-mono text-[10px] tracking-widest text-white/70">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-lg font-light tracking-tight text-zinc-50">{direction.name}</h2>
        <p className="mt-1 text-[13px] italic leading-snug text-brand/90">{direction.hook}</p>
        <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-zinc-400">
          {direction.summary}
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {direction.styleTags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {direction.rationale && (
          <p className="mt-3 border-l border-zinc-800 pl-2.5 text-[11px] leading-relaxed text-zinc-500">
            {direction.rationale}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          {shape && (
            <span className="font-mono text-[10px] text-zinc-600">
              {shape.cuts} cuts · {shape.shots} shots
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors group-hover:text-brand">
            Enter →
          </span>
        </div>
      </div>
    </button>
  );
}
