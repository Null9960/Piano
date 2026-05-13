// ─── Note definitions ───────────────────────────────────────────────────────

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface PianoNote {
  /** e.g. "C4" */
  id: string;
  /** e.g. "C" */
  name: NoteName;
  /** octave number */
  octave: number;
  /** true if black key */
  isBlack: boolean;
  /** index within the full chromatic sequence starting from A0 */
  midiNumber: number;
  /** Tone.js note string e.g. "C4" */
  toneNote: string;
  /** position index among white keys only (for layout) */
  whiteIndex: number;
}

const CHROMATIC_NAMES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const BLACK_NOTES: Set<NoteName> = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);

/**
 * Generate piano notes for a given range.
 * Default: C3–C6 (37 keys, good for MVP).
 * Can extend to A0–C8 (full 88-key) by passing midiStart=21, midiEnd=108.
 *
 * MIDI numbers: C0=12, A0=21, C4=60, A4=69, C8=108
 */
export function generateNotes(midiStart = 48, midiEnd = 84): PianoNote[] {
  const notes: PianoNote[] = [];
  let whiteIndex = 0;

  for (let midi = midiStart; midi <= midiEnd; midi++) {
    const octave = Math.floor((midi - 12) / 12);
    const nameIdx = (midi - 12) % 12;
    const name = CHROMATIC_NAMES[nameIdx];
    const isBlack = BLACK_NOTES.has(name);
    const id = `${name}${octave}`;

    notes.push({
      id,
      name,
      octave,
      isBlack,
      midiNumber: midi,
      toneNote: id,
      whiteIndex: isBlack ? whiteIndex - 1 : whiteIndex, // black keys share previous white
    });

    if (!isBlack) whiteIndex++;
  }

  return notes;
}

/** Count white keys in an array of PianoNote */
export function countWhiteKeys(notes: PianoNote[]): number {
  return notes.filter((n) => !n.isBlack).length;
}

/**
 * Black key offset within an octave group (as fraction of white key width).
 * Maps a black-key name to its visual offset from the left edge of the
 * preceding white key.
 */
export const BLACK_KEY_OFFSETS: Record<NoteName, number> = {
  'C#': 0.65,
  'D#': 0.65,
  'F#': 0.65,
  'G#': 0.65,
  'A#': 0.65,
  C: 0,
  D: 0,
  E: 0,
  F: 0,
  G: 0,
  A: 0,
  B: 0,
};

/** Keyboard key → note id mapping (computer keyboard) */
export const KEYBOARD_MAP: Record<string, string> = {
  // Bottom row: C3 to B3
  z: 'C3', s: 'C#3', x: 'D3', d: 'D#3', c: 'E3', v: 'F3',
  g: 'F#3', b: 'G3', h: 'G#3', n: 'A3', j: 'A#3', m: 'B3',
  // Top row: C4 to C5
  q: 'C4', '2': 'C#4', w: 'D4', '3': 'D#4', e: 'E4', r: 'F4',
  '5': 'F#4', t: 'G4', '6': 'G#4', y: 'A4', '7': 'A#4', u: 'B4',
  i: 'C5',
};
