"use client";

import { useEffect, useState, type RefObject } from "react";

import { formatTime } from "../lib/format";

/**
 * Playback control for the source track.
 *
 * The track is the master clock for the whole session, so pausing here also
 * suspends the score: no further cues fire, and the world holds its current
 * shot instead of advancing. That is deliberate — the model keeps generating
 * either way, and letting the score run on without the music would put every
 * remaining cut out of time with it.
 */
export function Transport({
  mediaRef,
  positionMs,
  durationMs,
}: {
  mediaRef: RefObject<HTMLMediaElement | null>;
  positionMs: number;
  durationMs: number;
}) {
  const [paused, setPaused] = useState(true);

  // Mirror the element rather than tracking our own flag, so the button still
  // tells the truth when playback starts on its own or the browser stalls it.
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const sync = () => setPaused(media.paused);
    sync();
    media.addEventListener("play", sync);
    media.addEventListener("pause", sync);
    return () => {
      media.removeEventListener("play", sync);
      media.removeEventListener("pause", sync);
    };
  }, [mediaRef]);

  const progress = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <button
        onClick={() => {
          const media = mediaRef.current;
          if (!media) return;
          if (media.paused) void media.play().catch(() => undefined);
          else media.pause();
        }}
        aria-label={paused ? "Play" : "Pause"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
      >
        {paused ? (
          <svg viewBox="0 0 12 12" className="ml-[1px] h-3 w-3 fill-current" aria-hidden>
            <path d="M3 1.5 10 6l-7 4.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current" aria-hidden>
            <path d="M3 2h2.2v8H3zM6.8 2H9v8H6.8z" />
          </svg>
        )}
      </button>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1000)}
        aria-valuenow={Math.round(positionMs / 1000)}
        className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
      </div>

      <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
        {formatTime(positionMs)} / {formatTime(durationMs)}
      </span>
    </div>
  );
}
