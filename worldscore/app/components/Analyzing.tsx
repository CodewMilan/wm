"use client";

import { useEffect, useState } from "react";
import { useWorldscore } from "../lib/store";

// The two stages have very different shapes: decoding and the STFT finish in
// about a second, then the concept call can take much longer. Showing the real
// analysis results as soon as they land keeps the wait feeling productive.
const STAGES = [
  "Decoding audio",
  "Tracking tempo and beat grid",
  "Mapping energy and structure",
  "Composing world directions",
];

export function Analyzing() {
  const trackName = useWorldscore((s) => s.trackName);
  const analysis = useWorldscore((s) => s.analysis);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (analysis) {
      setStage(3);
      return;
    }
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [analysis]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-500">
        {trackName || "Untitled"}
      </p>

      <div className="mt-10 flex h-24 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 48 }).map((_, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-brand/70"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%`,
              animation: `ws-pulse 1.1s ease-in-out ${i * 0.035}s infinite alternate`,
            }}
          />
        ))}
      </div>

      <ul className="mt-12 w-full max-w-sm space-y-2.5">
        {STAGES.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-3 font-mono text-xs transition-colors ${
              i < stage ? "text-zinc-500" : i === stage ? "text-zinc-100" : "text-zinc-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                i < stage ? "bg-zinc-600" : i === stage ? "animate-pulse bg-brand" : "bg-zinc-800"
              }`}
            />
            {label}
          </li>
        ))}
      </ul>

      {analysis && (
        <div className="mt-10 flex gap-8 font-mono text-[11px] text-zinc-500">
          <Stat label="tempo" value={`${Math.round(analysis.bpm)} BPM`} />
          <Stat label="sections" value={`${analysis.sections.length}`} />
          <Stat label="length" value={`${Math.round(analysis.durationMs / 1000)}s`} />
          <Stat label="mood" value={analysis.moodTags.slice(0, 2).join(" · ")} />
        </div>
      )}

      <style>{`@keyframes ws-pulse { from { transform: scaleY(0.35); opacity: 0.35 } to { transform: scaleY(1); opacity: 1 } }`}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-zinc-300">{value}</p>
      <p className="mt-1 uppercase tracking-[0.2em] text-zinc-600">{label}</p>
    </div>
  );
}
