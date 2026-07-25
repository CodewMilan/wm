"use client";

import { useCallback, useRef, useState } from "react";
import { useWorldscore } from "../lib/store";
import { runPipeline } from "../lib/pipeline";

export function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const error = useWorldscore((s) => s.error);

  const accept = useCallback((file: File | undefined) => {
    if (!file) return;
    void runPipeline(file);
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-zinc-500">
        Worldscore
      </p>

      <h1 className="mt-6 text-balance text-5xl font-light leading-[1.05] tracking-tight text-zinc-50 sm:text-6xl">
        Turn a rough track into a<br />
        <span className="italic text-brand">living cinematic world.</span>
      </h1>

      <p className="mt-6 max-w-lg text-pretty text-[15px] leading-relaxed text-zinc-400">
        Drop an unfinished mix. Worldscore reads its tempo, energy and structure,
        proposes five world directions, then generates one live — cutting and
        moving with the music as it plays.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-10 w-full cursor-pointer rounded-xl border border-dashed px-8 py-12 transition-colors ${
          dragging
            ? "border-brand bg-brand/5"
            : "border-zinc-700 bg-white/[0.02] hover:border-zinc-500"
        }`}
      >
        <p className="text-sm text-zinc-300">
          Drop an audio file, or <span className="text-brand underline underline-offset-4">browse</span>
        </p>
        <p className="mt-2 font-mono text-[11px] text-zinc-600">
          MP3 · WAV · M4A · FLAC — analysed entirely in your browser
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="mt-4 font-mono text-xs text-red-400">{error}</p>
      )}

      <p className="mt-8 max-w-md font-mono text-[11px] leading-relaxed text-zinc-600">
        Your audio never leaves this device. Only the derived features — tempo,
        energy curve, section map — are sent anywhere.
      </p>
    </div>
  );
}
