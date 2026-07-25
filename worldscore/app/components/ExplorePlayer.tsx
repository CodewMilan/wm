"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LingbotWorld2MainVideoView,
  useLingbotWorld2,
  useLingbotWorld2State,
  useLingbotWorld2CommandError,
  useLingbotWorld2ImageAccepted,
  useLingbotWorld2ConditionsReady,
} from "@reactor-models/lingbot-world-2";
import type { LingbotWorld2StateMessage } from "@reactor-models/lingbot-world-2";
import { formatTime } from "../lib/format";
import { useWorldscore } from "../lib/store";
import {
  CAMERA_STILL,
  describeCamera,
  type CameraState,
  type ExploreStep,
} from "../lib/world/explore";
import { describeWeather } from "../lib/world/climate";
import { confirmCommand, waitForState } from "../lib/world/handshake";
import { Transport } from "./Transport";

/**
 * Fire a step slightly early so the change lands on the beat we aimed at. The
 * model applies a command at the next chunk boundary, so anything sent exactly
 * on time is already one chunk late.
 */
const LEAD_MS = 1_200;
/** How long after the last keypress the score takes the camera back. */
const YIELD_BACK_MS = 2_500;
/**
 * A fresh world spends its first seconds materialising and silently drops any
 * input sent during that window. Holding the track back until it has settled is
 * what stops the opening cues being thrown away.
 */
const SETTLE_MS = 4_000;
/**
 * Absolute ceiling on a session, so a walked-away browser can't burn credits.
 * The platform terminates at 20 minutes regardless; this is the app's own,
 * tighter limit.
 */
const MAX_SESSION_MS = 6 * 60 * 1000;
/**
 * How long to wait for the model to confirm one arming command. Generous: it
 * covers a GPU still warming up, and the cost of waiting too long is a slower
 * start, while the cost of not waiting is a session that never begins.
 */
const HANDSHAKE_MS = 20_000;

const MOVE_KEYS: Record<string, Partial<CameraState>> = {
  KeyW: { moveLongitudinal: "forward" },
  KeyS: { moveLongitudinal: "back" },
  KeyA: { moveLateral: "strafe_left" },
  KeyD: { moveLateral: "strafe_right" },
  ArrowLeft: { lookHorizontal: "left" },
  ArrowRight: { lookHorizontal: "right" },
  ArrowUp: { lookVertical: "up" },
  ArrowDown: { lookVertical: "down" },
};

/** Collapse the currently-held keys into one camera state. */
function cameraFromKeys(held: Set<string>): CameraState {
  const camera: CameraState = { ...CAMERA_STILL, rotationSpeedDeg: 8 };
  for (const code of held) Object.assign(camera, MOVE_KEYS[code] ?? {});
  return camera;
}

function sameCamera(a: CameraState, b: CameraState): boolean {
  return (
    a.moveLongitudinal === b.moveLongitudinal &&
    a.moveLateral === b.moveLateral &&
    a.lookHorizontal === b.lookHorizontal &&
    a.lookVertical === b.lookVertical &&
    a.rotationSpeedDeg === b.rotationSpeedDeg
  );
}

export function ExplorePlayer() {
  const {
    status,
    connect,
    disconnect,
    uploadFile,
    setImage,
    setPrompt,
    setKvCacheReset,
    setMoveLongitudinal,
    setMoveLateral,
    setLookHorizontal,
    setLookVertical,
    setRotationSpeedDeg,
    start,
  } = useLingbotWorld2();
  const { trackName, audioUrl, seed, exploreScore, analysis, reset } = useWorldscore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const connectedRef = useRef(false);
  const armedRef = useRef(false);
  const audioStartedRef = useRef(false);
  const sessionStartRef = useRef(0);
  // The camera last actually sent to the model. Every axis is persistent state
  // on the model's side, so re-sending an unchanged value is pure noise.
  const sentCameraRef = useRef<CameraState>(CAMERA_STILL);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const lastKeyMsRef = useRef(0);
  const firingRef = useRef(false);

  const [snapshot, setSnapshot] = useState<LingbotWorld2StateMessage | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [arming, setArming] = useState("Opening a session");
  const [finished, setFinished] = useState(false);
  const [settled, setSettled] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The arming handshake polls for confirmation, and a captured state variable
  // would hand it the snapshot from before the command was ever sent.
  const snapshotRef = useRef<LingbotWorld2StateMessage | null>(null);
  const conditionsRef = useRef({ hasImage: false, hasPrompt: false });

  useLingbotWorld2State((msg) => {
    snapshotRef.current = msg;
    setSnapshot(msg);
  });
  // First error wins. A rejected `set_prompt` makes the following `start` fail
  // too, and overwriting would leave only the second, less useful message.
  useLingbotWorld2CommandError((msg) => {
    const text = `${msg.command}: ${msg.reason}`;
    console.warn("[lingbot] command_error", text);
    setCommandError((existing) => existing ?? text);
  });
  useLingbotWorld2ImageAccepted((msg) => setImageInfo({ width: msg.width, height: msg.height }));
  // `conditions_ready` exists precisely to say whether `start` will be accepted,
  // so it is the primary signal; the periodic state snapshot is a fallback in
  // case the event is missed while the session is still coming up.
  useLingbotWorld2ConditionsReady((msg) => {
    conditionsRef.current = { hasImage: msg.has_image, hasPrompt: msg.has_prompt };
  });

  const conditions = useCallback(
    () => ({
      hasImage: conditionsRef.current.hasImage || Boolean(snapshotRef.current?.has_image),
      hasPrompt: conditionsRef.current.hasPrompt || Boolean(snapshotRef.current?.has_prompt),
    }),
    [],
  );

  /** Push only the axes that actually changed. */
  const applyCamera = useCallback(
    async (next: CameraState) => {
      const sent = sentCameraRef.current;
      if (sameCamera(sent, next)) return;
      sentCameraRef.current = next;

      const jobs: Promise<unknown>[] = [];
      if (next.moveLongitudinal !== sent.moveLongitudinal)
        jobs.push(setMoveLongitudinal({ move_longitudinal: next.moveLongitudinal }));
      if (next.moveLateral !== sent.moveLateral)
        jobs.push(setMoveLateral({ move_lateral: next.moveLateral }));
      if (next.lookHorizontal !== sent.lookHorizontal)
        jobs.push(setLookHorizontal({ look_horizontal: next.lookHorizontal }));
      if (next.lookVertical !== sent.lookVertical)
        jobs.push(setLookVertical({ look_vertical: next.lookVertical }));
      if (next.rotationSpeedDeg !== sent.rotationSpeedDeg)
        jobs.push(setRotationSpeedDeg({ rotation_speed_deg: next.rotationSpeedDeg }));

      await Promise.all(jobs).catch(() => undefined);
    },
    [setMoveLongitudinal, setMoveLateral, setLookHorizontal, setLookVertical, setRotationSpeedDeg],
  );

  /**
   * Apply a camera the score asked for, then let the world settle again.
   * Holding a move open until the next cue would smear the image, so each one
   * runs for its own bounded window and releases. Manual driving is exempt —
   * the user's keyup is their release.
   */
  const applyScoreCamera = useCallback(
    async (camera: CameraState) => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      await applyCamera(camera);
      if (camera.holdMs <= 0) return;

      holdTimerRef.current = setTimeout(() => {
        if (useWorldscore.getState().manualCamera) return;
        void applyCamera(CAMERA_STILL);
      }, camera.holdMs);
    },
    [applyCamera],
  );

  useEffect(() => () => void (holdTimerRef.current && clearTimeout(holdTimerRef.current)), []);

  // Connect once. The ref guard matters because a double-invoked effect would
  // otherwise open two GPU sessions against a limited session quota.
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

  // Arm the session. Unlike Watch mode this model will not start without a
  // reference image, so the seed has to be fetched, uploaded and accepted
  // before `start` is worth calling at all.
  useEffect(() => {
    if (status !== "ready" || armedRef.current || !exploreScore || !seed) return;
    const opener = exploreScore.steps[0];
    if (!opener) return;

    armedRef.current = true;
    void (async () => {
      try {
        setArming("Uploading the seed image");
        const res = await fetch(seed.image);
        if (!res.ok) throw new Error(`could not load ${seed.image}`);
        const blob = await res.blob();
        const ref = await uploadFile(blob, { name: `${seed.id}.jpg` });

        // `start` is rejected unless the model already holds both an image and
        // a prompt, and neither command reports back in line — so each one is
        // confirmed against the model's own state before moving on.
        setArming("Anchoring the world");
        await confirmCommand(
          () => setImage({ image: ref }),
          conditions,
          (c) => c.hasImage,
          { what: "the seed image", timeoutMs: HANDSHAKE_MS },
        );

        setArming("Handing over the prompt");
        await confirmCommand(
          () => setPrompt({ prompt: opener.prompt }),
          conditions,
          (c) => c.hasPrompt,
          { what: "the opening prompt", timeoutMs: HANDSHAKE_MS },
        );

        // Long sessions drift as the model's context accumulates; letting it
        // refresh back to the seed image on a timer is what keeps a five-minute
        // walk looking like the world it started in.
        await setKvCacheReset({ mode: "auto" });

        setArming("Waking the world up");
        await start();
        await waitForState(
          () => snapshotRef.current,
          (s) => s.started,
          { what: "generation starting", timeoutMs: HANDSHAKE_MS },
        );
        // The camera is deliberately not sent here — input during the
        // materialising window is dropped, so the opening move is applied once
        // the world has settled instead.
        useWorldscore.getState().markStepFired(opener);
      } catch (error) {
        // A rejection reported by the model explains more than our own timeout
        // waiting on it, so it keeps precedence.
        setCommandError((existing) => existing ?? (error as Error).message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, exploreScore, seed]);

  // Only drop the needle once frames are being generated *and* the world has
  // had its settling window, so the track and a stable world begin together
  // rather than the audio racing an unfinished scene.
  useEffect(() => {
    if (!snapshot?.started || audioStartedRef.current) return;
    audioStartedRef.current = true;

    const timer = setTimeout(() => {
      sessionStartRef.current = performance.now();
      setSettled(true);
      void audioRef.current?.play().catch(() => undefined);

      const opener = exploreScore?.steps[0];
      if (opener) void applyScoreCamera(opener.camera);
    }, SETTLE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.started]);

  // Keyboard drive. The model holds each axis until told otherwise, so both
  // press and release have to be sent — a missed keyup walks forever.
  useEffect(() => {
    if (!settled) return;

    const onDown = (e: KeyboardEvent) => {
      if (!MOVE_KEYS[e.code] || e.repeat) return;
      e.preventDefault();
      heldKeysRef.current.add(e.code);
      lastKeyMsRef.current = performance.now();
      useWorldscore.getState().setManualCamera(true);
      // Manual driving cancels any pending settle-back; the keyup is the release.
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      void applyCamera(cameraFromKeys(heldKeysRef.current));
    };

    const onUp = (e: KeyboardEvent) => {
      if (!MOVE_KEYS[e.code]) return;
      heldKeysRef.current.delete(e.code);
      lastKeyMsRef.current = performance.now();
      void applyCamera(cameraFromKeys(heldKeysRef.current));
    };

    // A window that loses focus mid-press never delivers the keyup, which would
    // leave the camera driving into the distance on its own.
    const onBlur = () => {
      heldKeysRef.current.clear();
      void applyCamera(CAMERA_STILL);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [settled, applyCamera]);

  // The steering loop. The audio element is the master clock — the model's
  // chunk counter is never used for timing, so steps land on the beat even when
  // generation runs behind real time.
  useEffect(() => {
    if (!settled || status !== "ready" || !exploreScore) return;

    let raf = 0;

    const fire = async (step: ExploreStep) => {
      firingRef.current = true;
      try {
        await setPrompt({ prompt: step.prompt });
        // The score only gets the camera back once the user has stopped
        // driving; taking it mid-press would fight them for control.
        const { manualCamera } = useWorldscore.getState();
        if (!manualCamera) await applyScoreCamera(step.camera);
        useWorldscore.getState().markStepFired(step);
      } finally {
        firingRef.current = false;
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

      // Hand the camera back a beat after the last key, so a walk that pauses
      // for breath doesn't immediately get overridden.
      const { manualCamera, activeStep } = useWorldscore.getState();
      if (
        manualCamera &&
        heldKeysRef.current.size === 0 &&
        performance.now() - lastKeyMsRef.current > YIELD_BACK_MS
      ) {
        useWorldscore.getState().setManualCamera(false);
        if (activeStep) void applyScoreCamera(activeStep.camera);
      }

      if (firingRef.current) return;

      const { firedStepIds } = useWorldscore.getState();
      const next = exploreScore.steps.find(
        (s) => !firedStepIds.includes(s.id) && s.atMs <= nowMs + LEAD_MS,
      );
      if (next) void fire(next);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, status, exploreScore]);

  if (!seed || !exploreScore) return null;

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
          <h1 className="text-lg font-light tracking-tight text-zinc-100">{seed.name}</h1>
          <span className="font-mono text-[11px] text-zinc-600">{trackName}</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <span className="text-brand">explore</span>
          <span className={status === "ready" ? "text-active" : "text-amber-400"}>{status}</span>
          {imageInfo && (
            <span>
              seed {imageInfo.width}×{imageInfo.height}
            </span>
          )}
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
        <LingbotWorld2MainVideoView className="h-full w-full" videoObjectFit="cover" />
        {!settled && (
          <EnteringOverlay
            label={snapshot?.started ? "Letting the world settle" : arming}
            seedImage={seed.image}
          />
        )}
        <NowExploring />
        <DriveHint />
      </div>

      <ExploreStrip positionMs={positionMs} />

      <div className="flex items-center px-6 pb-6">
        <Transport
          mediaRef={audioRef}
          positionMs={positionMs}
          durationMs={analysis?.durationMs ?? 0}
        />
      </div>

      {commandError && (
        <p className="px-6 pb-6 font-mono text-[10px] text-red-400">{commandError}</p>
      )}

      {finished && <FinishedOverlay onExit={reset} />}
    </div>
  );
}

/** The transparency requirement: always say what changed and why. */
function NowExploring() {
  const { activeStep, manualCamera } = useWorldscore();
  if (!activeStep) return null;

  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-5">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className="text-brand">{activeStep.climate.season}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{describeWeather(activeStep.climate)}</span>
        <span className="text-zinc-600">·</span>
        <span className={manualCamera ? "text-active" : "text-zinc-500"}>
          {manualCamera ? "you have the camera" : describeCamera(activeStep.camera)}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-zinc-300">{activeStep.reason}</p>
    </div>
  );
}

function DriveHint() {
  const manualCamera = useWorldscore((s) => s.manualCamera);

  return (
    <div
      className={`pointer-events-none absolute right-5 top-5 rounded-lg border px-3 py-2 font-mono text-[10px] leading-relaxed transition-opacity ${
        manualCamera
          ? "border-brand/40 bg-brand/10 text-brand opacity-100"
          : "border-zinc-700/60 bg-black/50 text-zinc-500 opacity-70"
      }`}
    >
      <div>W A S D — walk</div>
      <div>arrows — look</div>
    </div>
  );
}

/** Steps laid against the track, so you can see the weather coming. */
function ExploreStrip({ positionMs }: { positionMs: number }) {
  const { analysis, exploreScore, firedStepIds } = useWorldscore();
  if (!analysis || !exploreScore) return null;

  const duration = Math.max(1, analysis.durationMs);
  const pct = (ms: number) => Math.min(100, Math.max(0, (ms / duration) * 100));

  return (
    <div className="px-6 py-4">
      <div className="relative h-16 w-full overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
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

        {exploreScore.steps.map((step) => {
          const fired = firedStepIds.includes(step.id);
          return (
            <div
              key={step.id}
              title={`${step.climate.season} — ${step.reason}`}
              className="absolute top-0 h-full"
              style={{ left: `${pct(step.atMs)}%` }}
            >
              <div
                className={`h-full w-[2px] bg-brand transition-opacity ${fired ? "opacity-100" : "opacity-25"}`}
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
        <span>{exploreScore.steps.length} climate and camera changes</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function EnteringOverlay({ label, seedImage }: { label: string; seedImage: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={seedImage}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-25 blur-sm"
      />
      <div className="relative flex flex-col items-center">
        <div className="h-px w-40 animate-pulse bg-brand/60" />
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-300">
          {label}
        </p>
        <p className="mt-3 text-sm text-zinc-500">This model needs a still to grow the world from.</p>
      </div>
    </div>
  );
}

function FinishedOverlay({ onExit }: { onExit: () => void }) {
  const { exploreScore, firedStepIds } = useWorldscore();

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/90 p-6 backdrop-blur">
      <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-xl font-light text-zinc-100">You walked it to the end</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {firedStepIds.length} of {exploreScore?.steps.length ?? 0} changes fired. The GPU session
          has been released.
        </p>
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

