"use client";

import { useWorldscore } from "../lib/store";

/**
 * The score laid out against the track: energy underneath, cue markers on top,
 * playhead running through. This is the piece that makes the mapping legible —
 * you can see the cut coming before it lands.
 */
export function ScoreStrip({ positionMs }: { positionMs: number }) {
  const { analysis, score, firedCueIds } = useWorldscore();
  if (!analysis || !score) return null;

  const duration = Math.max(1, analysis.durationMs);
  const pct = (ms: number) => Math.min(100, Math.max(0, (ms / duration) * 100));

  return (
    <div className="px-6 py-4">
      <div className="relative h-16 w-full overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
        <EnergyCurve />

        {analysis.sections.map((section) => (
          <div
            key={`s-${section.startMs}`}
            className="absolute bottom-0 top-0 border-l border-zinc-800/60"
            style={{ left: `${pct(section.startMs)}%` }}
          >
            <span className="absolute bottom-1 left-1.5 whitespace-nowrap font-mono text-[9px] uppercase tracking-widest text-zinc-600">
              {section.role}
            </span>
          </div>
        ))}

        {score.cues.map((cue) => {
          const fired = firedCueIds.includes(cue.id);
          return (
            <div
              key={cue.id}
              title={`${cue.kind} — ${cue.reason}`}
              className="absolute top-0 h-full"
              style={{ left: `${pct(cue.atMs)}%` }}
            >
              <div
                className={`h-full w-[2px] transition-opacity ${
                  cue.kind === "cut" ? "bg-brand" : "bg-zinc-500"
                } ${fired ? "opacity-100" : "opacity-30"}`}
              />
              <div
                className={`absolute -left-[3px] top-1 h-2 w-2 rotate-45 ${
                  cue.kind === "cut" ? "bg-brand" : "bg-zinc-500"
                } ${fired ? "opacity-100" : "opacity-40"}`}
              />
            </div>
          );
        })}

        <div
          className="absolute top-0 h-full w-px bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.55)]"
          style={{ left: `${pct(positionMs)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-600">
        <span>{formatTime(positionMs)}</span>
        <span className="flex items-center gap-4">
          <Legend colorClass="bg-brand" label="hard cut" />
          <Legend colorClass="bg-zinc-500" label="soft shot" />
        </span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function EnergyCurve() {
  const analysis = useWorldscore((s) => s.analysis);
  if (!analysis?.energyCurve.length) return null;

  const points = analysis.energyCurve
    .map((v, i) => {
      const x = (i / (analysis.energyCurve.length - 1)) * 100;
      return `${x.toFixed(2)},${(100 - v * 88).toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <polygon points={`0,100 ${points} 100,100`} fill="rgba(226,196,122,0.10)" />
      <polyline points={points} fill="none" stroke="rgba(226,196,122,0.45)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-[2px] ${colorClass}`} />
      {label}
    </span>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
