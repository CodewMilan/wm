import type { MidiNote, MidiScore } from "./parse";

/**
 * A MIDI file has no sound of its own, so we render one. This is a synthesiser,
 * not a sampler: there is no instrument library to download, which keeps the
 * whole thing in-browser at the cost of sounding synthetic. The goal is only to
 * be musical enough to listen to and to analyse — pitch, harmony and dynamics
 * all survive, which is what the world engine actually reads.
 */

const SAMPLE_RATE = 44_100;
/** Reverb needs somewhere to decay into after the last note ends. */
const TAIL_SEC = 2.5;
/** Below this many notes we can afford two detuned oscillators per voice. */
const RICH_VOICE_LIMIT = 4_000;

interface Voice {
  wave: OscillatorType;
  /** Seconds to reach full level. Slow attacks are what make strings swell. */
  attack: number;
  /** Seconds to fall to `sustain`, or to silence when `sustain` is 0. */
  decay: number;
  /** 0 means plucked or struck: it rings out and ignores how long it's held. */
  sustain: number;
  release: number;
  /** Bus lowpass, in Hz. Tames the buzz on sawtooth families. */
  cutoff: number;
  gain: number;
  /** Stereo placement, -1..1, so the mix isn't a mono lump. */
  pan: number;
}

/**
 * General MIDI groups its 128 programs into 16 families of 8, and the family is
 * a good enough guide to articulation: everything in "Strings" swells, and
 * everything in "Piano" is struck. Programs within a family share a voice.
 */
const FAMILIES: Voice[] = [
  // Piano
  { wave: "triangle", attack: 0.004, decay: 2.2, sustain: 0, release: 0.25, cutoff: 5200, gain: 0.62, pan: 0 },
  // Chromatic percussion
  { wave: "sine", attack: 0.002, decay: 1.1, sustain: 0, release: 0.2, cutoff: 6500, gain: 0.55, pan: -0.2 },
  // Organ
  { wave: "square", attack: 0.02, decay: 0.1, sustain: 0.85, release: 0.14, cutoff: 3400, gain: 0.3, pan: 0.15 },
  // Guitar
  { wave: "sawtooth", attack: 0.005, decay: 1.6, sustain: 0, release: 0.2, cutoff: 3200, gain: 0.4, pan: -0.25 },
  // Bass
  { wave: "triangle", attack: 0.006, decay: 1.4, sustain: 0.25, release: 0.16, cutoff: 1100, gain: 0.85, pan: 0 },
  // Strings
  { wave: "sawtooth", attack: 0.12, decay: 0.3, sustain: 0.75, release: 0.45, cutoff: 2800, gain: 0.34, pan: 0.25 },
  // Ensemble
  { wave: "sawtooth", attack: 0.1, decay: 0.3, sustain: 0.72, release: 0.4, cutoff: 2600, gain: 0.32, pan: -0.15 },
  // Brass
  { wave: "sawtooth", attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.2, cutoff: 3600, gain: 0.38, pan: 0.2 },
  // Reed
  { wave: "square", attack: 0.045, decay: 0.2, sustain: 0.78, release: 0.2, cutoff: 3000, gain: 0.3, pan: -0.3 },
  // Pipe
  { wave: "sine", attack: 0.06, decay: 0.2, sustain: 0.82, release: 0.24, cutoff: 4200, gain: 0.36, pan: 0.3 },
  // Synth lead
  { wave: "sawtooth", attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.2, cutoff: 4000, gain: 0.34, pan: 0.1 },
  // Synth pad
  { wave: "triangle", attack: 0.35, decay: 0.5, sustain: 0.8, release: 0.9, cutoff: 2400, gain: 0.34, pan: -0.1 },
  // Synth effects
  { wave: "triangle", attack: 0.2, decay: 0.6, sustain: 0.55, release: 0.7, cutoff: 3000, gain: 0.28, pan: 0.35 },
  // Ethnic
  { wave: "triangle", attack: 0.008, decay: 1.4, sustain: 0.1, release: 0.2, cutoff: 3800, gain: 0.42, pan: -0.35 },
  // Percussive
  { wave: "sine", attack: 0.002, decay: 0.7, sustain: 0, release: 0.15, cutoff: 5000, gain: 0.5, pan: 0.1 },
  // Sound effects
  { wave: "sine", attack: 0.05, decay: 0.8, sustain: 0.3, release: 0.4, cutoff: 3000, gain: 0.22, pan: 0 },
];

type DrumKind = "kick" | "snare" | "hat" | "tom" | "cymbal";

/** The GM percussion map, reduced to the five things we can usefully synthesise. */
function drumKind(midi: number): DrumKind {
  if (midi <= 36) return "kick";
  if (midi === 37 || midi === 38 || midi === 39 || midi === 40) return "snare";
  if (midi === 42 || midi === 44 || midi === 46) return "hat";
  if (midi === 49 || midi === 51 || midi === 52 || midi === 53 || midi === 55 || midi >= 57)
    return "cymbal";
  if (midi >= 41 && midi <= 50) return "tom";
  return "hat";
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** White noise, generated once and shared by every drum hit that needs it. */
function noiseBuffer(ctx: OfflineAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, SAMPLE_RATE * 2, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * A synthetic impulse response: noise under an exponential decay, with the
 * channels decorrelated so it opens up in stereo. Cheaper than shipping a real
 * convolution sample and enough to stop everything sounding bone dry.
 */
function reverbImpulse(ctx: OfflineAudioContext, seconds = 1.8): AudioBuffer {
  const length = Math.floor(SAMPLE_RATE * seconds);
  const buffer = ctx.createBuffer(2, length, SAMPLE_RATE);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.5);
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return buffer;
}

/** Shape one note's amplitude over time. Returns when the voice falls silent. */
function envelope(gain: GainNode, voice: Voice, start: number, durSec: number, peak: number): number {
  const g = gain.gain;
  const floor = 0.0001;
  g.setValueAtTime(floor, start);
  const attackEnd = start + voice.attack;
  g.exponentialRampToValueAtTime(Math.max(peak, floor), attackEnd);

  if (voice.sustain <= 0) {
    // Struck and plucked sounds ring out on their own terms, but a staccato
    // note should still stop when it's released rather than blooming past it.
    const ring = Math.min(voice.decay, durSec + voice.release);
    const end = attackEnd + Math.max(ring, 0.05);
    g.exponentialRampToValueAtTime(floor, end);
    return end;
  }

  const sustainLevel = Math.max(peak * voice.sustain, floor);
  g.exponentialRampToValueAtTime(sustainLevel, attackEnd + voice.decay);
  const releaseStart = Math.max(start + durSec, attackEnd + 0.01);
  g.setValueAtTime(sustainLevel, releaseStart);
  const end = releaseStart + voice.release;
  g.exponentialRampToValueAtTime(floor, end);
  return end;
}

function renderPitched(
  ctx: OfflineAudioContext,
  note: MidiNote,
  bus: AudioNode,
  voice: Voice,
  rich: boolean,
): void {
  const start = note.timeMs / 1000;
  const durSec = note.durationMs / 1000;
  // Velocity is perceptually closer to loudness when curved, and quiet notes
  // that stay quiet are most of what separates a performance from a sequence.
  const detunes = rich ? [-5, 5] : [0];
  // Two oscillators sum to roughly twice the amplitude, so split the level
  // between them or every rich voice comes out 6dB hotter than a plain one.
  const peak = (Math.pow(note.velocity, 1.6) * voice.gain) / detunes.length;
  if (peak < 0.0005) return;

  const gain = ctx.createGain();
  gain.connect(bus);
  const end = envelope(gain, voice, start, durSec, peak);

  const hz = midiToHz(note.midi);
  for (const cents of detunes) {
    const osc = ctx.createOscillator();
    osc.type = voice.wave;
    osc.frequency.setValueAtTime(hz, start);
    if (cents !== 0) osc.detune.setValueAtTime(cents, start);
    osc.connect(gain);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

function renderDrum(
  ctx: OfflineAudioContext,
  note: MidiNote,
  buses: Record<DrumKind, AudioNode>,
  noise: AudioBuffer,
): void {
  const start = note.timeMs / 1000;
  const kind = drumKind(note.midi);
  const peak = Math.pow(note.velocity, 1.4);
  if (peak < 0.0005) return;

  const gain = ctx.createGain();
  gain.connect(buses[kind]);
  const g = gain.gain;
  const floor = 0.0001;

  if (kind === "kick" || kind === "tom") {
    // Pitched percussion is a fast downward sweep — that drop is the "thump".
    const from = kind === "kick" ? 125 : midiToHz(note.midi) * 1.6;
    const to = kind === "kick" ? 42 : midiToHz(note.midi) * 0.75;
    const length = kind === "kick" ? 0.32 : 0.42;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length * 0.55);
    osc.connect(gain);

    g.setValueAtTime(Math.max(peak * 0.95, floor), start);
    g.exponentialRampToValueAtTime(floor, start + length);
    osc.start(start);
    osc.stop(start + length + 0.02);
    return;
  }

  const length = kind === "snare" ? 0.19 : kind === "hat" ? 0.06 : 0.9;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  // Different slices of the shared noise buffer, so repeated hits aren't
  // bit-identical and don't phase against each other.
  const offset = (start * 7.31) % 1.5;
  src.connect(gain);

  g.setValueAtTime(Math.max(peak * (kind === "cymbal" ? 0.35 : 0.6), floor), start);
  g.exponentialRampToValueAtTime(floor, start + length);
  src.start(start, offset, length + 0.05);
  src.stop(start + length + 0.05);
}

/**
 * Render the score to audio. Runs in an OfflineAudioContext, so it renders as
 * fast as the machine allows rather than in real time.
 */
export async function synthesize(score: MidiScore): Promise<AudioBuffer> {
  const seconds = score.durationMs / 1000 + TAIL_SEC;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);

  // A compressor is doing real work here: a 60-voice orchestral tutti and a
  // solo piano note otherwise differ by enough gain to clip one or bury the other.
  const master = ctx.createDynamicsCompressor();
  master.threshold.setValueAtTime(-14, 0);
  master.knee.setValueAtTime(24, 0);
  master.ratio.setValueAtTime(6, 0);
  master.attack.setValueAtTime(0.005, 0);
  master.release.setValueAtTime(0.18, 0);

  const trim = ctx.createGain();
  trim.gain.setValueAtTime(0.85, 0);
  master.connect(trim);
  trim.connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = reverbImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.setValueAtTime(0.22, 0);
  reverb.connect(wet);
  wet.connect(master);

  const rich = score.notes.length < RICH_VOICE_LIMIT;

  /** Families are created on demand: most files use a handful of programs. */
  const busCache = new Map<number, AudioNode>();
  const busFor = (family: number): AudioNode => {
    const existing = busCache.get(family);
    if (existing) return existing;

    const voice = FAMILIES[family];
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(voice.cutoff, 0);
    filter.Q.setValueAtTime(0.7, 0);

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(voice.pan, 0);
    filter.connect(panner);
    panner.connect(master);

    const send = ctx.createGain();
    send.gain.setValueAtTime(0.5, 0);
    panner.connect(send);
    send.connect(reverb);

    busCache.set(family, filter);
    return filter;
  };

  const noise = noiseBuffer(ctx);
  const drumBuses = {} as Record<DrumKind, AudioNode>;
  const drumShape: Record<DrumKind, { type: BiquadFilterType; hz: number; gain: number }> = {
    kick: { type: "lowpass", hz: 220, gain: 0.9 },
    snare: { type: "bandpass", hz: 1900, gain: 0.5 },
    hat: { type: "highpass", hz: 7800, gain: 0.28 },
    tom: { type: "lowpass", hz: 900, gain: 0.6 },
    cymbal: { type: "highpass", hz: 6200, gain: 0.22 },
  };
  for (const [kind, shape] of Object.entries(drumShape) as [DrumKind, typeof drumShape.kick][]) {
    const filter = ctx.createBiquadFilter();
    filter.type = shape.type;
    filter.frequency.setValueAtTime(shape.hz, 0);
    const level = ctx.createGain();
    level.gain.setValueAtTime(shape.gain, 0);
    filter.connect(level);
    level.connect(master);
    // Drums stay drier than the pitched material or the groove smears.
    const send = ctx.createGain();
    send.gain.setValueAtTime(kind === "cymbal" ? 0.3 : 0.12, 0);
    level.connect(send);
    send.connect(reverb);
    drumBuses[kind] = filter;
  }

  for (const note of score.notes) {
    if (note.isDrum) {
      renderDrum(ctx, note, drumBuses, noise);
    } else {
      const family = Math.min(15, Math.max(0, note.program >> 3));
      renderPitched(ctx, note, busFor(family), FAMILIES[family], rich);
    }
  }

  return ctx.startRendering();
}
