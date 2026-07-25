# Worldscore

**Turns a rough track into a living cinematic world.** Drop an unfinished mix,
get five distinct world directions, then watch one generate live — cutting and
moving with the music as it plays.

Built on [Reactor](https://reactor.inc) and the **LongLive-2.0** real-time world
model.

---

## The idea

Most "AI video" tools take a prompt and hand back a clip. Worldscore treats a
song as a **control signal for a running world model**: the track's structure is
compiled into a shot/cut score, and that score drives a live session in real time.

The key realisation is that LongLive-2.0's grammar already *is* music-video
grammar:

| LongLive-2.0 | Musically |
| --- | --- |
| `set_shot` — soft transition, keeps scene memory | a new beat inside the same section |
| `scene_cut` — hard break, purges memory | a drop, a chorus, a change of place |
| 29-frame chunks (~1.2s) | the quantisation grid |
| 48-chunk per-scene budget (~58s) | you must cut at least once a minute |

So Worldscore doesn't fake musical mapping with a timer. It compiles the track
into cuts and shots, and fires them on the beat.

## How it works

```
audio file
  → decode + STFT in the browser         (never uploaded)
  → tempo, beat grid, energy, structure
  → five WorldSpecs                       (LLM, or offline library)
  → compiled Score: cues at song times
  → live session: cues fire off the audio clock
```

**1. Analysis runs entirely client-side.** Decode via Web Audio, then an STFT in
a worker produces an onset envelope (tempo by autocorrelation), an energy curve,
spectral centroid, and section boundaries from a novelty curve over a multi-band
texture. About 400ms for a 2-minute track. Only the derived features leave the
browser — the audio never does, which matters when the input is an unreleased mix.

**2. Directions are structured, not prose.** The generator returns `WorldSpec`
objects — subject, action, setting, lighting, lens, camera move, palette, texture,
render cue — and a local composer renders them into the dense cinematic paragraph
the model needs. This is what makes the live controls instant: "Darker" is a
field transform, not another round-trip to a language model. It also means every
soft shot can re-establish subject and setting in full, which LongLive-2.0
requires for continuity.

**3. The audio clock is the master.** Generation isn't guaranteed to run at
real time, so the model's chunk counter is *not* used for timing. Cues fire from
`audio.currentTime` with a one-chunk predictive lead, quantised to the nearest
downbeat. The chunk counter is used for exactly one thing: enforcing the 48-chunk
scene budget, past which a scene silently stops generating.

**4. Every cue explains itself.** Cues carry a reason string (`"drop — hard cut
on the impact"`), surfaced in the player and on the score strip. Surprise is
good; randomness isn't.

## Running it

```bash
pnpm install
cp .env.example .env.local     # add REACTOR_API_KEY
pnpm dev
```

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `REACTOR_API_KEY` | yes | From the [Reactor dashboard](https://reactor.inc/dashboard). Never reaches the browser. |
| `LLM_API_KEY` | no | Any OpenAI-compatible provider. |
| `LLM_BASE_URL` | no | Defaults to `https://integrate.api.nvidia.com/v1`. |
| `LLM_MODEL` | no | Defaults to `nvidia/llama-3.3-nemotron-super-49b-v1.5`. |

Without an LLM key the app falls back to a curated offline concept library
matched to the track's tempo, energy and brightness. The demo works either way —
that fallback also catches a slow or failing provider mid-session.

Free OpenAI-compatible providers that work as-is: **NVIDIA NIM** (Nemotron, the
default), **Groq** (fastest), **Cerebras**, **OpenRouter** `:free` models.

### Verifying the analyser without a browser

```bash
node scripts/make-demo-track.mjs public/demo-track.wav
npx tsx scripts/check-analysis.ts public/demo-track.wav
```

Prints the detected tempo, sections and compiled score, and fails if any scene
would exceed the chunk ceiling.

## Notes on Reactor

Things worth knowing that shaped the build:

- **Sessions bill per second while `ready`**, so the player disconnects on
  `pagehide`, when the track ends, and at a hard six-minute ceiling.
- **Five concurrent sessions per account** by default.
- **There is no `unschedule`.** A scheduled beat can't be moved or cancelled —
  only `reset` clears everything. That's why Worldscore fires live rather than
  pre-scheduling the whole song.
- React strict mode is off: double-invoked effects would open a second GPU
  session on every mount.

## Project layout

```
app/
  lib/audio/      decode, STFT, tempo, segmentation  (browser + worker)
  lib/world/      WorldSpec, prompt composer, score compiler
  lib/concepts/   LLM generation + offline archetype library
  lib/store.ts    session state
  components/     upload → analysing → concept board → player
  api/            reactor token minting, concept generation
scripts/          headless analyser checks
```

## Roadmap

The signal-to-world core is deliberately source-agnostic — audio is just the
first adapter. Next: webcam affect signals via in-browser MediaPipe blendshapes
feeding the same cue queue, and a dream mode on LingBot for genuine WASD
navigability.
