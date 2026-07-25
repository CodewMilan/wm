# Worldscore Product Spec

## Overview

Worldscore is a real-time visual concepting and immersive media product built on Reactor's world model infrastructure. It starts as a music-first product: a musician uploads a rough track, the system proposes five cinematic world directions, and the user chooses one to steer live while the music plays.[cite:10][cite:12][cite:20]

The same core architecture later expands into two adjacent modes: an affect-responsive viewer mode, where the generated world adapts to the listener's facial expressions and engagement, and a dream-relive mode, where a user describes a dream and explores a navigable simulation of it.[cite:20][cite:31][cite:11]

The unifying thesis is simple: turn human signals into living worlds. Audio structure, facial affect, and memory-like text prompts all become control signals for a real-time world model session instead of being treated as one-off generation prompts.[cite:20][cite:31]

## Product Vision

The product should feel like a creative instrument, not a static AI generator. Reactor is positioned as infrastructure for real-time generative media and interactive world-model applications, which makes it suitable for an experience where users continuously guide a running session rather than submit a prompt and wait for a final clip.[cite:10][cite:14][cite:31]

The first and most important use case is for musicians, labels, visual artists, and music-video directors who want fast visual ideation from unfinished audio. Instead of spending days on moodboards and manual concept treatment drafts, they should be able to get several strong world directions in minutes and then shape the chosen one live.[cite:10][cite:12][cite:33]

## Product Modules

### 1. Track-to-World Studio

This is the primary product and should be the first thing built. A user uploads a rough track, stem mix, beat, or snippet. The system analyzes the audio and generates five distinct cinematic world concepts such as industrial neon rain, desert ritual, floating brutalist city, underwater cathedral, or memory dreamscape. The user then selects one direction and launches a live Reactor-powered world session that evolves while the track plays.[cite:12][cite:20][cite:31]

This module is the clearest commercial wedge because it solves a concrete problem for creators: previsualization. Reactor provides one API for multiple world/video models and emphasizes real-time streaming plus interactive control, so Worldscore can act as a rapid visual concepting surface instead of a generic text-to-video wrapper.[cite:10][cite:12][cite:14]

#### Core user flow

1. User uploads audio.
2. The backend extracts BPM, energy curve, structure segments, and rough mood tags.
3. A concept generator produces five visual world directions based on the music.
4. The UI presents the five directions as cards with names, style blurbs, and sample still references.
5. The user chooses one direction.
6. A Reactor session starts with an initial prompt and optional seed image.
7. During playback, the system continuously steers the world using music-derived control signals.
8. The user can manually intervene with controls like "more surreal," "more movement," "darker," "bigger scale," or "switch direction."

#### Why this fits Reactor

Reactor documents describe an application pattern where a developer connects to a model, receives live video, and sends commands while the model is running.[cite:31] Reactor also presents multiple world models behind one platform and positions them for real-time interactive media experiences rather than fixed batch renders.[cite:10][cite:12] That matches this product extremely well because the output should not be a static music video but a steerable world session that reacts to ongoing audio analysis.[cite:20][cite:31]

#### Audio-to-world mapping

The mapping layer is where the product becomes special. This should be explicit in the build:

- Initial global mood drives the session's starting prompt and palette.
- BPM influences camera energy and world motion intensity.
- Kick or percussion peaks can trigger environmental events or camera emphasis.
- Chorus sections can trigger prompt escalations or scene widening.
- Bridge sections can shift environment style, weather, or architecture.
- Volume and spectral density can influence scene complexity or particle density.
- Optional lyric embeddings can bias symbolism and scene motifs.

The first version does not need perfect music intelligence; it needs believable creative mapping. The goal is to feel musically coherent rather than scientifically exact.

### 2. Affect-Responsive Mode

This is the second feature and should be built after the core music flow works. The product uses webcam-based facial expression and engagement analysis to infer rough viewer state signals such as low engagement, surprise, calm, focus, or excitement, then adjusts the world accordingly while playback continues.[cite:20][cite:31]

This should be framed carefully as adaptive immersion, not emotion detection with strong claims. The purpose is not to diagnose internal state but to make the world feel more responsive and alive. If the viewer appears disengaged, the system should increase visual novelty or scene dynamism; if the viewer seems calm and absorbed, the system can maintain continuity and deepen atmosphere instead of introducing abrupt changes.[cite:20][cite:31]

#### Target behaviors

- Low engagement: increase movement, add contrast, escalate environmental events, or switch sub-scene.
- Surprise or excitement: sustain energy, expand scale, amplify spectacle.
- Calm attention: slow the camera, stabilize scene transitions, deepen ambience.
- Repeated boredom signals: rotate to one of the alternative concept directions.

#### Important product rules

- The user must opt into webcam analysis.
- The UI must visibly indicate when adaptation is active.
- The adaptation should be smooth and policy-driven, not random.
- The system should store as little sensitive biometric data as possible.
- In-browser inference is preferable for privacy and latency.

### 3. Dream Relive

This is the least-priority product mode but should still be specified now so the architecture supports it later. A user describes a dream, uploads optional anchor images, picks a tone, and launches a navigable world session that recreates or reinterprets the dream's atmosphere.[cite:11][cite:20][cite:31]

The most important design principle is that this should be interactive. The user should not receive one pre-rendered dream clip. Instead, they should be able to move through the dream, intensify it, stabilize it, or reintroduce motifs like a hallway, water, a face, a house, or a recurring symbol. Reactor's live session model and LingBot's navigable world behavior make this a credible extension of the same orchestration layer.[cite:11][cite:20][cite:31]

#### Dream flow

1. User types a dream memory.
2. The system extracts entities, emotions, locations, symbols, and surreal transitions.
3. It generates three to five dream interpretations.
4. The user picks one interpretation.
5. A Reactor session starts with a dream anchor prompt and optional reference image.
6. The user explores and modifies dream logic live.

## Core Product Thesis

Worldscore is not three separate AI features. It is one orchestration engine that maps input signals into Reactor world-model commands.[cite:20][cite:31]

The inputs:
- Audio features
- Viewer affect signals
- Memory and dream descriptions
- User control inputs

The outputs:
- Session initialization prompt
- Scene or style changes
- Camera and motion steering
- Event density and spectacle level
- Branch switches between world directions

This framing matters because it keeps the architecture clean and makes the product feel like a platform for signal-to-world experiences.

## MVP Scope

The MVP should focus almost entirely on the Track-to-World Studio.

### Must-have MVP features

- Audio upload.
- Audio analysis pipeline for BPM, section detection, and mood tags.
- Concept generation pipeline that returns five world directions.
- A polished UI that shows these five directions clearly.
- Reactor session launch for the selected direction.
- Live steering based on music timeline.
- Manual creative controls during playback.
- Session save/export for later iteration.

### Nice-to-have in MVP

- Reference image generation for each concept direction.
- Side-by-side concept comparison.
- Preset styles such as cinematic, surreal, anime, brutalist, dreamcore, sacred, cyberpunk.
- Basic collaboration link for clients or band members.

### Post-MVP

- Affect-responsive mode.
- Dream Relive mode.
- Multi-user live sessions.
- Director timeline editing.
- Export to treatment deck or shot-board.

## User Personas

### Musician / producer

Needs fast visual inspiration while the track is still rough. Values immediacy, surprising but relevant concepts, and the ability to iterate without needing a director yet.

### Music-video director

Needs a fast concepting tool to explore world styles and pitch visual directions to clients. Values coherence, art-direction control, and good references.

### Creative label / visual team

Needs collaborative ideation for campaigns and live visuals. Values speed, shareability, and multiple distinct directions from one track.

### Experimental listener

Wants an immersive world that reacts to the song and possibly to them. Values delight, immersion, and novelty.

## UX Principles

- The product should feel like a studio instrument, not a dashboard.
- World directions should be distinct and cinematic, not tiny variants of the same prompt.
- Steering should be visible so the user understands why the world changed.
- The interface should privilege playback and immersion over controls.
- The live session is the hero, while controls stay secondary but accessible.
- Surprise is good, but randomness is bad.

## Example Main User Journey

### Music concept journey

1. Open app.
2. Upload rough track.
3. Wait for analysis and concept generation.
4. View five direction cards with names, descriptions, and still previews.
5. Choose one card.
6. Enter live playback mode.
7. Watch world evolve with the track.
8. Tweak controls such as intensity, surrealness, movement, darkness, and scene scale.
9. Save the session as a concept.
10. Optionally branch into another direction.

## Suggested Screens

### 1. Landing / onboarding
A visually rich overview of what the app does, with one clear CTA: upload a track.

### 2. Track upload and analysis state
Audio upload, waveform preview, metadata extraction, loading state.

### 3. Five-direction concept board
Five large concept cards with names, descriptions, optional still previews, tags, and a select button.

### 4. Live world player
The main experience. Large world viewport, audio player, timeline, subtle controls, live state indicators, and optional branch switching.

### 5. Saved sessions
A gallery of prior sessions, concepts, and alternate directions.

### 6. Experimental modes
A separate section for affect-responsive mode and Dream Relive, marked clearly as beta or experimental until stable.

## Technical Architecture

### Frontend

- Next.js for app shell and product UI.
- React for session controls and live state management.
- Tailwind or clean CSS system for rapid iteration.
- Web Audio API for playback syncing and lightweight browser-side analysis.
- Webcam analysis running client-side where possible.

### Backend

- API routes or lightweight server for upload handling and orchestration.
- Audio analysis service for BPM, segmentation, and embeddings.
- LLM concept generation service for the five directions.
- Reactor integration layer for session creation and command streaming.[cite:20][cite:31]
- Persistence layer for saved sessions, prompts, branches, and user projects.

### Reactor orchestration layer

This is the key backend module. It should:

- Start a world-model session for a chosen concept.
- Maintain live session state.
- Convert timeline events into world-model commands.
- Allow prompt swaps during a running session if supported by the model.[cite:20][cite:31]
- Manage branch or scene transitions.
- Expose telemetry to the frontend such as current mode, current policy, and last command sent.

### Signal-to-command policy engine

This module turns raw inputs into meaningful world actions.

Inputs:
- BPM
- section changes
- intensity curve
- lyric or mood tags
- webcam engagement signals
- manual UI controls

Outputs:
- update world prompt
- adjust camera motion profile
- trigger spectacle event
- increase or reduce visual complexity
- switch to alternate concept branch

This policy engine should be deterministic enough to debug but flexible enough to feel expressive.

## Data Model Ideas

### Project
- id
- user_id
- title
- created_at
- updated_at

### Track
- id
- project_id
- file_url
- bpm
- key
- duration
- mood_tags
- energy_curve
- segment_map

### ConceptDirection
- id
- project_id
- name
- summary
- style_tags
- base_prompt
- seed_image_url
- rank

### LiveSession
- id
- project_id
- concept_direction_id
- reactor_model
- reactor_session_id
- started_at
- ended_at
- session_state

### SessionEvent
- id
- live_session_id
- timestamp_ms
- source_type
- source_payload
- command_sent

### DreamProject
- id
- user_id
- dream_text
- emotion_tags
- symbol_tags
- chosen_interpretation

## Detailed Build Plan

### Phase 1: foundation

- Set up app shell and auth.
- Implement track upload and storage.
- Build audio analysis pipeline.
- Build concept generation prompt and output schema.
- Design the five-direction selection interface.

### Phase 2: live world playback

- Integrate Reactor session lifecycle.[cite:20][cite:31]
- Launch selected concept into a live session.
- Sync music timeline with session control loop.
- Add manual steering controls.
- Save session metadata.

### Phase 3: affect-responsive mode

- Add webcam consent flow.
- Add lightweight engagement-state inference.
- Build adaptation policies.
- Surface active policy in the UI.
- Tune adaptation smoothness.

### Phase 4: dream mode

- Build dream intake form.
- Build dream interpretation generator.
- Connect dream prompt synthesis to Reactor session launch.[cite:20][cite:31]
- Add live dream controls.

### Phase 5: polish

- Branching sessions.
- Collaboration and share links.
- Better still previews.
- Saved concept board.
- Export flows.

## Risks and Mitigations

### Risk: output feels random rather than musically meaningful
Mitigation: make the mapping engine transparent and use interpretable rules first before adding more model intelligence.

### Risk: concept cards are too similar
Mitigation: explicitly force concept diversity in the generation prompt and rank concepts by distinctiveness.

### Risk: affect mode feels creepy
Mitigation: use opt-in, local inference, visible indicators, and soft adaptation language.

### Risk: dream mode distracts from the stronger initial product
Mitigation: keep it in a beta tab and position it as an expansion of the same engine.

### Risk: live control gets messy
Mitigation: define a strict policy layer between raw signals and Reactor commands.[cite:20][cite:31]

## Suggested Cursor Build Priorities

Cursor should implement this in the following order:

1. App shell and design system.
2. Track upload flow.
3. Audio analysis and concept generation.
4. Five-direction concept board UI.
5. Live world session integration with Reactor.
6. Manual steering controls.
7. Saved sessions.
8. Affect-responsive mode behind a feature flag.
9. Dream Relive behind a separate experimental tab.

## Design Direction

The product should feel cinematic, immersive, and premium. It should not look like a generic AI SaaS dashboard. The main visual language should emphasize a large viewport, dark luxurious surfaces, elegant typography, smooth transitions, and a sense of world exploration. The core moment is choosing a world and entering it.

The five direction cards should feel like selecting film treatments, not choosing settings. The player should feel like a live performance interface, halfway between a creative studio and a ritual control room.

## Example Prompting Logic For Concept Generation

Given an uploaded track, the concept generator should return five highly distinct visual directions. Each direction should include:

- name
- one-sentence hook
- a concise but vivid summary
- 3 to 5 style tags
- a base world prompt
- optional reference-image prompt
- reason this direction fits the track

The five directions should be:
- visually distinct from each other
- cinematic and commercially interesting
- suitable for real-time world steering
- expressive enough to inspire a musician or director immediately

## Launch Positioning

A strong initial positioning line:

**Worldscore turns music into living cinematic worlds.** A rough track becomes five visual directions, and each direction can be explored and steered live in real time.[cite:10][cite:12][cite:31]

A broader positioning line for the long-term product:

**Worldscore is a signal-to-world engine for music, emotion, and memory.** It transforms audio, attention, and dream descriptions into immersive real-time world-model experiences.[cite:20][cite:31]

## Final Recommendation

Build this as one coherent product with a music-first wedge. Do not split focus too early into three standalone apps. The first milestone should be a polished Track-to-World Studio that proves the core magic clearly. Affect-responsive adaptation should be the second-layer wow feature. Dream Relive should remain a roadmap product until the signal-to-world orchestration engine is stable.[cite:10][cite:12][cite:20][cite:31]
