// ─── Piano Sample Configuration ───────────────────────────────────────────────
// Salamander Grand Piano (Yamaha C5 Grand) hosted by Tone.js team.
// Files: A0.mp3, C1.mp3, Ds1.mp3 (D# = Ds), Fs1.mp3 (F# = Fs), etc.
// jsDelivr mirror used for reliability.
export const PIANO_SAMPLE_BASE_URL =
  'https://cdn.jsdelivr.net/npm/@tonejs/piano@0.2.1/note-files/';

// Fallback: original tonejs.github.io Salamander
export const PIANO_SAMPLE_BASE_URL_FALLBACK =
  'https://tonejs.github.io/audio/salamander/';

// Note map: Tone.js note name → filename
// Tone.Sampler pitch-shifts between loaded samples, so we only need
// one sample every ~3 semitones for good quality.
export const PIANO_SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.[mp3|ogg]',
  C1: 'C1.[mp3|ogg]',
  'D#1': 'Ds1.[mp3|ogg]',
  'F#1': 'Fs1.[mp3|ogg]',
  A1: 'A1.[mp3|ogg]',
  C2: 'C2.[mp3|ogg]',
  'D#2': 'Ds2.[mp3|ogg]',
  'F#2': 'Fs2.[mp3|ogg]',
  A2: 'A2.[mp3|ogg]',
  C3: 'C3.[mp3|ogg]',
  'D#3': 'Ds3.[mp3|ogg]',
  'F#3': 'Fs3.[mp3|ogg]',
  A3: 'A3.[mp3|ogg]',
  C4: 'C4.[mp3|ogg]',
  'D#4': 'Ds4.[mp3|ogg]',
  'F#4': 'Fs4.[mp3|ogg]',
  A4: 'A4.[mp3|ogg]',
  C5: 'C5.[mp3|ogg]',
  'D#5': 'Ds5.[mp3|ogg]',
  'F#5': 'Fs5.[mp3|ogg]',
  A5: 'A5.[mp3|ogg]',
  C6: 'C6.[mp3|ogg]',
  'D#6': 'Ds6.[mp3|ogg]',
  'F#6': 'Fs6.[mp3|ogg]',
  A6: 'A6.[mp3|ogg]',
  C7: 'C7.[mp3|ogg]',
  'D#7': 'Ds7.[mp3|ogg]',
  'F#7': 'Fs7.[mp3|ogg]',
  A7: 'A7.[mp3|ogg]',
  C8: 'C8.[mp3|ogg]',
};

// Simpler map for the Salamander CDN (direct mp3 filenames)
export const SALAMANDER_SAMPLE_URLS: Record<string, string> = {
  A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
  A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
  A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
  A7: 'A7.mp3', C8: 'C8.mp3',
};
