import { Midi } from "@tonejs/midi";

/**
 * A MIDI file is a score, not a recording: it carries exact notes but no sound.
 * We parse it into a flat note list that both the synthesiser and the harmony
 * reader can walk, rather than keeping @tonejs/midi's track/channel structure
 * around — nothing downstream cares which track a note came from.
 */
export interface MidiNote {
  timeMs: number;
  durationMs: number;
  /** 0..127, where 60 is middle C. */
  midi: number;
  /** 0..1. */
  velocity: number;
  /** General MIDI program number, which decides the synth voice. */
  program: number;
  /** Channel 10 in MIDI terms: pitch means drum, not note. */
  isDrum: boolean;
}

export interface MidiScore {
  notes: MidiNote[];
  durationMs: number;
  bpm: number;
  /** True when the file declares tempo changes, so `bpm` is only an average. */
  tempoVaries: boolean;
  /** Instrument names present, deduped — useful hints for the concept prompt. */
  instruments: string[];
  /** How many notes we dropped to keep synthesis tractable. */
  dropped: number;
}

/** Beyond this the OfflineAudioContext graph gets too big to render quickly. */
const MAX_NOTES = 24_000;
/** Longer than this and the rendered WAV stops fitting comfortably in memory. */
const MAX_DURATION_MS = 15 * 60 * 1000;
const DEFAULT_BPM = 120;

/**
 * Extension and MIME both lie often enough to be worth treating as a hint only;
 * `parseMidi` re-checks the actual header bytes before trusting anything.
 */
export function isMidiFile(file: File): boolean {
  return (
    /\.(mid|midi|smf)$/i.test(file.name) ||
    /^audio\/(x-)?midi$/i.test(file.type) ||
    file.type === "audio/sp-midi"
  );
}

/** Every Standard MIDI File opens with the ASCII chunk type "MThd". */
function hasMidiHeader(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) return false;
  const head = new Uint8Array(bytes, 0, 4);
  return head[0] === 0x4d && head[1] === 0x54 && head[2] === 0x68 && head[3] === 0x64;
}

/**
 * One tempo is the common case, but films and game scores modulate. We weight
 * each tempo by how long it is in force so a four-bar ritardando can't drag the
 * whole beat grid with it.
 */
function averageBpm(
  tempos: { bpm: number; time?: number }[],
  durationSec: number,
): { bpm: number; varies: boolean } {
  const usable = tempos.filter((t) => Number.isFinite(t.bpm) && t.bpm > 0);
  if (usable.length === 0) return { bpm: DEFAULT_BPM, varies: false };
  if (usable.length === 1) return { bpm: usable[0].bpm, varies: false };

  let weighted = 0;
  let total = 0;
  for (let i = 0; i < usable.length; i++) {
    const start = usable[i].time ?? 0;
    const end = usable[i + 1]?.time ?? durationSec;
    const span = Math.max(0, end - start);
    weighted += usable[i].bpm * span;
    total += span;
  }

  const bpm = total > 0 ? weighted / total : usable[0].bpm;
  return { bpm, varies: true };
}

/**
 * Dense orchestral files can carry six figures of notes, which would build an
 * audio graph large enough to stall the tab. Dropping the quietest and shortest
 * notes keeps the full timeline intact — truncating in time would instead leave
 * the back half of the track silent, which is far more obviously broken.
 */
function capNotes(notes: MidiNote[]): { notes: MidiNote[]; dropped: number } {
  if (notes.length <= MAX_NOTES) return { notes, dropped: 0 };

  const byProminence = [...notes].sort(
    (a, b) => b.velocity * Math.min(b.durationMs, 2000) - a.velocity * Math.min(a.durationMs, 2000),
  );
  const kept = byProminence.slice(0, MAX_NOTES).sort((a, b) => a.timeMs - b.timeMs);
  return { notes: kept, dropped: notes.length - MAX_NOTES };
}

export function parseMidi(bytes: ArrayBuffer): MidiScore {
  if (!hasMidiHeader(bytes)) {
    throw new Error("That file has a MIDI name but not a MIDI header");
  }

  let midi: Midi;
  try {
    midi = new Midi(bytes);
  } catch (error) {
    throw new Error(`Could not read that MIDI file: ${(error as Error).message}`);
  }

  const notes: MidiNote[] = [];
  const instruments = new Set<string>();

  for (const track of midi.tracks) {
    if (track.notes.length === 0) continue;
    const isDrum = track.instrument.percussion || track.channel === 9;
    instruments.add(isDrum ? "drum kit" : track.instrument.name);

    for (const note of track.notes) {
      // A zero-length note still needs to be audible, and a note that runs to
      // the end of a fermata shouldn't ring for a full minute.
      const durationMs = Math.min(Math.max(note.duration * 1000, 60), 8000);
      notes.push({
        timeMs: note.time * 1000,
        durationMs,
        midi: note.midi,
        velocity: note.velocity,
        program: track.instrument.number,
        isDrum,
      });
    }
  }

  if (notes.length === 0) {
    throw new Error("That MIDI file has no notes in it");
  }

  notes.sort((a, b) => a.timeMs - b.timeMs);
  const capped = capNotes(notes);

  // Trust the notes over the header: some exporters pad `duration` with a long
  // tail of empty bars, which would give us a track that ends in silence.
  const lastNoteEnd = capped.notes.reduce((max, n) => Math.max(max, n.timeMs + n.durationMs), 0);
  const durationMs = Math.min(lastNoteEnd + 1500, MAX_DURATION_MS);

  const { bpm, varies } = averageBpm(midi.header.tempos, durationMs / 1000);

  return {
    notes: capped.notes.filter((n) => n.timeMs < durationMs),
    durationMs,
    bpm: Math.round(bpm * 10) / 10,
    tempoVaries: varies,
    instruments: [...instruments].filter(Boolean),
    dropped: capped.dropped,
  };
}
