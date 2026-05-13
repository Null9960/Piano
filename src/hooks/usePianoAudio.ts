import { useCallback, useRef, useState } from 'react';
import * as Tone from 'tone';
import { SALAMANDER_SAMPLE_URLS, PIANO_SAMPLE_BASE_URL_FALLBACK } from '../utils/audioSamples';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AudioStatus = 'locked' | 'starting' | 'loading-samples' | 'ready' | 'error';
export type SampleStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface UsePianoAudioReturn {
  playNote: (note: string, velocity?: number) => void;
  stopNote: (note: string) => void;
  setVolume: (db: number) => void;
  setSustain: (on: boolean) => void;
  unlockAudio: () => Promise<void>;
  allNotesOff: () => void;
  isReady: boolean;
  audioStatus: AudioStatus;
  sampleStatus: SampleStatus;
  audioError: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePianoAudio({ volume = -8 }: { volume?: number } = {}): UsePianoAudioReturn {
  // All audio objects live in refs — never stale inside callbacks
  const samplerRef    = useRef<Tone.Sampler | null>(null);
  const fallbackRef   = useRef<Tone.PolySynth | null>(null);
  const reverbRef     = useRef<Tone.Reverb | null>(null);
  const limiterRef    = useRef<Tone.Limiter | null>(null);

  // Track which instrument triggered each note (sampler vs fallback)
  // so we know which one to release
  const noteInstrumentRef = useRef<Map<string, 'sampler' | 'fallback'>>(new Map());

  // Sustain state
  const sustainRef        = useRef(false);
  const activeNotesRef    = useRef<Set<string>>(new Set());
  const sustainedNotesRef = useRef<Set<string>>(new Set());

  // Ref mirror of sampleStatus — never stale inside playNote
  const sampleLoadedRef = useRef(false);

  const [audioStatus,  setAudioStatus]  = useState<AudioStatus>('locked');
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('idle');
  const [audioError,   setAudioError]   = useState<string | null>(null);

  // ─── Volume ─────────────────────────────────────────────────────────────────
  const setVolume = useCallback((db: number) => {
    if (samplerRef.current)  samplerRef.current.volume.value  = db;
    if (fallbackRef.current) fallbackRef.current.volume.value = db;
  }, []);

  // ─── All notes off (emergency / reset) ──────────────────────────────────────
  const allNotesOff = useCallback(() => {
    const now  = Tone.now();
    const all  = new Set([...activeNotesRef.current, ...sustainedNotesRef.current]);
    all.forEach((note) => {
      const instr = noteInstrumentRef.current.get(note);
      try {
        if (instr === 'sampler')  samplerRef.current?.triggerRelease(note, now);
        else                      fallbackRef.current?.triggerRelease(note, now);
      } catch { /* ignore */ }
    });
    activeNotesRef.current.clear();
    sustainedNotesRef.current.clear();
    noteInstrumentRef.current.clear();
  }, []);

  // ─── Unlock audio (MUST be called from a user gesture) ──────────────────────
  // This is the only place where Tone.start() and Tone.Sampler are created.
  // Creating Tone.Sampler before Tone.start() causes silent decode failure
  // because the AudioContext doesn't exist yet.
  const unlockAudio = useCallback(async () => {
    if (audioStatus === 'ready' || audioStatus === 'loading-samples' || audioStatus === 'starting') return;
    setAudioError(null);
    setAudioStatus('starting');

    try {
      // Step 1: Resume/create the AudioContext (requires user gesture)
      await Tone.start();

      // Step 2: Build audio graph — AFTER AudioContext exists
      const limiter = new Tone.Limiter(-1).toDestination();
      const reverb  = new Tone.Reverb({ decay: 2.0, wet: 0.14 }).connect(limiter);
      limiterRef.current = limiter;
      reverbRef.current  = reverb;

      // Step 3: Fallback synth — ready immediately while samples load
      const fallback = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 0.9, sustain: 0.2, release: 1.2 },
        volume,
      }).connect(reverb);
      fallbackRef.current = fallback;

      setAudioStatus('loading-samples');
      setSampleStatus('loading');

      // Step 4: Load Salamander Grand Piano samples — NOW that AudioContext exists
      const sampler = new Tone.Sampler({
        urls: SALAMANDER_SAMPLE_URLS,
        baseUrl: PIANO_SAMPLE_BASE_URL_FALLBACK,
        release: 1.5,
        volume,
        onload: () => {
          // Samples decoded and ready
          sampleLoadedRef.current = true;
          samplerRef.current = sampler;
          sampler.connect(reverb);
          setSampleStatus('loaded');
          setAudioStatus('ready');
          // Disconnect fallback — real samples take over
          fallback.disconnect();
          fallbackRef.current = null;
        },
      });

      // Timeout: if samples don't load in 15s, keep fallback and show warning
      setTimeout(() => {
        if (!sampleLoadedRef.current) {
          console.warn('[Audio] Sample timeout — using fallback synth');
          setAudioError('Samples took too long to load. Using synth fallback. Check your internet connection.');
          // Re-connect fallback so it's usable
          if (fallbackRef.current && reverbRef.current) {
            try { fallbackRef.current.connect(reverbRef.current); } catch { /* ignore */ }
          }
          setSampleStatus('error');
          setAudioStatus('ready'); // still usable via fallback
        }
      }, 15_000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Audio] unlock failed:', msg);
      setAudioError(msg);
      setAudioStatus('error');
    }
  }, [audioStatus, volume]);

  // ─── Play note ───────────────────────────────────────────────────────────────
  const playNote = useCallback((note: string, velocity = 0.82) => {
    if (activeNotesRef.current.has(note)) return; // prevent retrigger

    // Auto-unlock on first note from keyboard/mouse (best-effort)
    const sampler  = samplerRef.current;
    const fallback = fallbackRef.current;

    if (!sampler && !fallback) return; // audio not started yet

    activeNotesRef.current.add(note);
    sustainedNotesRef.current.delete(note);

    // Use real piano if loaded, fallback synth otherwise
    const useSampler = sampleLoadedRef.current && sampler !== null;
    noteInstrumentRef.current.set(note, useSampler ? 'sampler' : 'fallback');

    try {
      if (useSampler) {
        sampler!.triggerAttack(note, Tone.now(), velocity);
      } else {
        fallback?.triggerAttack(note, Tone.now(), velocity);
      }
    } catch (err) {
      console.warn('[Audio] triggerAttack failed:', note, err);
      activeNotesRef.current.delete(note);
    }
  }, []); // no deps — only reads refs

  // ─── Stop note ───────────────────────────────────────────────────────────────
  const stopNote = useCallback((note: string) => {
    if (!activeNotesRef.current.has(note)) return;
    activeNotesRef.current.delete(note);

    if (sustainRef.current) {
      sustainedNotesRef.current.add(note); // pedal holds it
      return;
    }

    const instr = noteInstrumentRef.current.get(note);
    noteInstrumentRef.current.delete(note);
    try {
      if (instr === 'sampler') samplerRef.current?.triggerRelease(note, Tone.now());
      else                      fallbackRef.current?.triggerRelease(note, Tone.now());
    } catch { /* ignore */ }
  }, []); // no deps — only reads refs

  // ─── Sustain pedal ───────────────────────────────────────────────────────────
  const setSustain = useCallback((on: boolean) => {
    sustainRef.current = on;
    if (!on) {
      // Pedal lifted — release all sustained notes
      const now = Tone.now();
      sustainedNotesRef.current.forEach((note) => {
        const instr = noteInstrumentRef.current.get(note);
        noteInstrumentRef.current.delete(note);
        try {
          if (instr === 'sampler') samplerRef.current?.triggerRelease(note, now);
          else                      fallbackRef.current?.triggerRelease(note, now);
        } catch { /* ignore */ }
      });
      sustainedNotesRef.current.clear();
    }
  }, []); // no deps

  return {
    playNote,
    stopNote,
    setVolume,
    setSustain,
    unlockAudio,
    allNotesOff,
    isReady: audioStatus === 'ready',
    audioStatus,
    sampleStatus,
    audioError,
  };
}
