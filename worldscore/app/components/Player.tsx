"use client";

import { useEffect, useRef, useState } from "react";
import {
  LongliveV2MainVideoView,
  useLongliveV2,
  useLongliveV2State,
  useLongliveV2CommandError,
} from "@reactor-models/longlive-v2";
import type { LongliveV2StateMessage } from "@reactor-models/longlive-v2";
import { useWorldscore } from "../lib/store";
import { CHUNK_MS, SCENE_MAX_CHUNKS, type Cue } from "../lib/world/score";
import { applyModifiers, composePrompt, MODIFIERS } from "../lib/world/spec";
import { ScoreStrip } from "./ScoreStrip";

/** Fire one chunk early so the transition activates on the boundary we want. */
const LEAD_MS = CHUNK_MS;
/** Promote a soft shot to a cut this close to the scene ceiling. */
const BUDGET_PROMOTE_AT = SCENE_MAX_CHUNKS - 6;
/** Force a cut here even with no cue due, or generation stops outright. */
const BUDGET_FORCE_AT = SCENE_MAX_CHUNKS - 3;
/** Absolute ceiling on a session, so a walked-away browser can't burn credits. */
const MAX_SESSION_MS = 6 * 60 * 1000;

export function Player() {
  const { status, connect, disconnect, setShot, sceneCut, start } = useLongliveV2();
  const { trackName, audioUrl, direction, score, reset } = useWorldscore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const connectedRef = useRef(false);
  const openerSentRef = useRef(false);
  const audioStartedRef = useRef(false);
  const sessionStartRef = useRef(0);

  const [snapshot, setSnapshot] = useState<LongliveV2StateMessage | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [finished, setFinished] = useState(false);

  useLongliveV2State((msg) => setSnapshot(msg));
  useLongliveV2CommandError((msg) => setCommandError(`${msg.command}: ${msg.reason}`));

  // Connect once. The ref guard matters because a double-invoked effect would
  // otherwise open two GPU sessions against a five-session account quota.
  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    void connect();

    const teardown = () => void disconnect();
    window.addEventListener("pagehide", teardown);
    return () => {
      window.removeEventListener("pagehide", teardown);
      void disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "disconnected") setSnapshot(null);
  }, [status]);

  // Opening shot, then start. The model needs a prompt at chunk 0 before start.
  useEffect(() => {
    if (status !== "ready" || openerSentRef.current || !score) return;
    const opener = score.cues[0];
    if (!opener) return;

    openerSentRef.current = true;
    void (async () => {
      await setShot({ prompt: opener.prompt });
      await start();
      useWorldscore.getState().markFired(opener);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, score]);

  // Only drop the needle once frames are actually being generated, so the
  // track and the world begin together rather than the audio racing ahead.
  useEffect(() => {
    if (!snapshot?.started || audioStartedRef.current) return;
    audioStartedRef.current = true;
    sessionStartRef.current = performance.now();
    void audioRef.current?.play().catch(() => undefined);
  }, [snapshot?.started]);

  // The steering loop. The audio element is the master clock: we never trust
  // the model's chunk counter for timing, only for the scene budget. That way
  // cues land on the beat even when generation runs behind real time.
  useEffect(() => {
    if (!snapshot?.started || status !== "ready" || !score) return;

    let raf = 0;
    let inFlight = false;

    const fire = async (cue: Cue, forceCut: boolean) => {
      inFlight = true;
      const { modifiers, markFired } = useWorldscore.getState();
      const spec = applyModifiers(cue.spec, modifiers);
      const prompt = composePrompt(spec);
      try {
        if (cue.kind === "cut" || forceCut) await sceneCut({ prompt });
        else await setShot({ prompt });
        markFired(forceCut && cue.kind !== "cut" ? { ...cue, kind: "cut" } : cue);
      } finally {
        inFlight = false;
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const audio = audioRef.current;
      if (!audio) return;

      const nowMs = audio.currentTime * 1000;
      setPositionMs(nowMs);

      if (performance.now() - sessionStartRef.current > MAX_SESSION_MS) {
        void disconnect();
        return;
      }
      if (inFlight) return;

      const sceneChunk = snapshot.current_chunk ?? 0;
      const { firedCueIds } = useWorldscore.getState();
      const next = score.cues.find(
        (c) => !firedCueIds.includes(c.id) && c.atMs <= nowMs + LEAD_MS,
      );

      if (next) {
        // Close to the ceiling a soft shot would waste the little budget left,
        // and the scene would end mid-section. Promote it to a hard cut.
        void fire(next, sceneChunk >= BUDGET_PROMOTE_AT);
        return;
      }

      // Nothing due but the scene is about to auto-complete: cut to stay alive.
      if (sceneChunk >= BUDGET_FORCE_AT) {
        const last = useWorldscore.getState().activeCue;
        if (last) {
          void fire(
            {
              ...last,
              id: `budget-${Math.round(nowMs)}`,
              kind: "cut",
              reason: "holding the world open past the scene limit",
              source: "budget",
            },
            true,
          );
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.started, snapshot?.current_chunk, status, score]);

  if (!direction || !score) return null;

  const sceneChunk = snapshot?.current_chunk ?? 0;
  const connecting = status !== "ready" || !snapshot?.started;

  return (
    <div className="flex min-h-screen flex-col">
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onEnded={() => {
          setFinished(true);
          void disconnect();
        }}
      />

      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-lg font-light tracking-tight text-zinc-100">{direction.name}</h1>
          <span className="font-mono text-[11px] text-zinc-600">{trackName}</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <span className={status === "ready" ? "text-active" : "text-amber-400"}>{status}</span>
          <span>
            scene {sceneChunk}/{SCENE_MAX_CHUNKS}
          </span>
          <button
            onClick={() => {
              void disconnect();
              reset();
            }}
            className="rounded border border-zinc-700 px-2.5 py-1 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="relative mx-6 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <LongliveV2MainVideoView className="h-full w-full" videoObjectFit="cover" />
        {connecting && <EnteringOverlay status={status} score={score} />}
        <NowFiring />
      </div>

      <ScoreStrip positionMs={positionMs} />

      <div className="flex flex-wrap items-center gap-2 px-6 pb-6">
        {MODIFIERS.map((mod) => (
          <ModifierButton key={mod.id} id={mod.id} label={mod.label} onApply={setShot} />
        ))}
        {commandError && (
          <span className="ml-auto font-mono text-[10px] text-red-400">{commandError}</span>
        )}
      </div>

      {finished && <FinishedOverlay onExit={reset} />}
    </div>
  );
}

/** Live steering: rewrite the active scene and push it at the next boundary. */
function ModifierButton({
  id,
  label,
  onApply,
}: {
  id: (typeof MODIFIERS)[number]["id"];
  label: string;
  onApply: (args: { prompt: string }) => Promise<unknown>;
}) {
  const active = useWorldscore((s) => s.modifiers.includes(id));

  return (
    <button
      onClick={() => {
        useWorldscore.getState().toggleModifier(id);
        const { activeCue, modifiers } = useWorldscore.getState();
        if (!activeCue) return;
        void onApply({ prompt: composePrompt(applyModifiers(activeCue.spec, modifiers)) });
      }}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] transition-colors ${
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

/** The transparency requirement: always say what just changed and why. */
function NowFiring() {
  const activeCue = useWorldscore((s) => s.activeCue);
  if (!activeCue) return null;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-5">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className={activeCue.kind === "cut" ? "text-brand" : "text-zinc-400"}>
          {activeCue.kind}
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{activeCue.reason}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 max-w-3xl text-[13px] leading-snug text-zinc-300">
        {activeCue.prompt}
      </p>
    </div>
  );
}

function EnteringOverlay({
  status,
  score,
}: {
  status: string;
  score: { cues: { kind: string }[] };
}) {
  const cuts = score.cues.filter((c) => c.kind === "cut").length;
  const label =
    status === "connecting"
      ? "Opening a session"
      : status === "waiting"
        ? "Reserving a GPU"
        : "Composing the opening shot";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="h-px w-40 animate-pulse bg-brand/60" />
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-400">{label}</p>
      <p className="mt-3 text-sm text-zinc-500">
        {score.cues.length} cues across {cuts} scenes are ready to fire.
      </p>
    </div>
  );
}

function FinishedOverlay({ onExit }: { onExit: () => void }) {
  const log = useWorldscore((s) => s.log);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/90 p-6 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-xl font-light text-zinc-100">Session complete</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {log.length} cues fired. The GPU session has been released.
        </p>
        <ul className="mt-5 max-h-64 space-y-2 overflow-y-auto">
          {[...log].reverse().map((entry, i) => (
            <li key={i} className="flex gap-3 font-mono text-[11px]">
              <span className={entry.cue.kind === "cut" ? "text-brand" : "text-zinc-600"}>
                {entry.cue.kind}
              </span>
              <span className="text-zinc-500">{entry.cue.reason}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onExit}
          className="mt-6 w-full rounded-md bg-brand py-2.5 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          Score another track
        </button>
      </div>
    </div>
  );
}
