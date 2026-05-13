import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { PIANO_SAMPLE_BASE_URL, PIANO_SAMPLE_URLS } from '../utils/audioSamples';

export type AudioStatus = 'locked' | 'starting' | 'loading-samples' | 'ready' | 'error';
export type SampleStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AudioOptions { volume?: number; sustain?: boolean; }
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

export function usePianoAudio(options?: AudioOptions): UsePianoAudioReturn {
  const samplerRef = useRef<Tone.Sampler | null>(null);
  const fallbackSynthRef = useRef<Tone.PolySynth | null>(null);
  const sustainRef = useRef(options?.sustain ?? false);
  const activeNotesRef = useRef<Set<string>>(new Set());
  const sustainedNotesRef = useRef<Set<string>>(new Set());
  const unlockedRef = useRef(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('locked');
  const [sampleStatus, setSampleStatus] = useState<SampleStatus>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);

  const setVolume = useCallback((db: number) => {
    if (samplerRef.current) samplerRef.current.volume.value = db;
    if (fallbackSynthRef.current) fallbackSynthRef.current.volume.value = db;
  }, []);

  const allNotesOff = useCallback(() => {
    const now = Tone.now();
    const notes = new Set([...activeNotesRef.current, ...sustainedNotesRef.current]);
    notes.forEach((note) => {
      try { samplerRef.current?.triggerRelease(note, now); } catch { /* noop */ }
      try { fallbackSynthRef.current?.triggerRelease(note, now); } catch { /* noop */ }
    });
    activeNotesRef.current.clear();
    sustainedNotesRef.current.clear();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSampleStatus('loading');

    const limiter = new Tone.Limiter(-1).toDestination();
    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.12 }).connect(limiter);

    const fallbackSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.9, sustain: 0.2, release: 1.2 },
      volume: options?.volume ?? -8,
    }).connect(reverb);

    const sampler = new Tone.Sampler({
      urls: PIANO_SAMPLE_URLS,
      baseUrl: PIANO_SAMPLE_BASE_URL,
      release: 1.4,
      volume: options?.volume ?? -8,
      onload: () => {
        if (cancelled) return;
        setSampleStatus('loaded');
        if (unlockedRef.current) setAudioStatus('ready');
      },
    }).connect(reverb);

    samplerRef.current = sampler;
    fallbackSynthRef.current = fallbackSynth;

    Tone.loaded().then(() => {
      if (cancelled) return;
      setSampleStatus('loaded');
      if (unlockedRef.current) setAudioStatus('ready');
    }).catch((err: unknown) => {
      if (cancelled) return;
      setSampleStatus('error');
      setAudioStatus('error');
      setAudioError(err instanceof Error ? err.message : String(err));
    });

    return () => {
      cancelled = true;
      allNotesOff();
      sampler.dispose();
      fallbackSynth.dispose();
      reverb.dispose();
      limiter.dispose();
      samplerRef.current = null;
      fallbackSynthRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setVolume(options?.volume ?? -8); }, [options?.volume, setVolume]);

  const unlockAudio = useCallback(async () => {
    setAudioError(null);
    setAudioStatus('starting');
    try {
      await Tone.start();
      unlockedRef.current = true;
      setAudioStatus(sampleStatus === 'loaded' ? 'ready' : 'loading-samples');
    } catch (err) {
      unlockedRef.current = false;
      setAudioStatus('error');
      setAudioError(err instanceof Error ? err.message : String(err));
    }
  }, [sampleStatus]);

  useEffect(() => {
    if (unlockedRef.current && sampleStatus === 'loaded') setAudioStatus('ready');
  }, [sampleStatus]);

  const triggerNote = useCallback((note: string, velocity = 0.82) => {
    if (activeNotesRef.current.has(note)) return;
    activeNotesRef.current.add(note);
    sustainedNotesRef.current.delete(note);
    try {
      if (sampleStatus === 'loaded' && samplerRef.current) {
        samplerRef.current.triggerAttack(note, Tone.now(), velocity);
      } else {
        fallbackSynthRef.current?.triggerAttack(note, Tone.now(), velocity);
      }
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : String(err));
    }
  }, [sampleStatus]);

  const playNote = useCallback((note: string, velocity = 0.82) => {
    if (!unlockedRef.current) {
      void Tone.start().then(() => {
        unlockedRef.current = true;
        setAudioStatus(sampleStatus === 'loaded' ? 'ready' : 'loading-samples');
        triggerNote(note, velocity);
      }).catch((err: unknown) => {
        setAudioStatus('error');
        setAudioError(err instanceof Error ? err.message : String(err));
      });
      return;
    }
    triggerNote(note, velocity);
  }, [sampleStatus, triggerNote]);

  const stopNote = useCallback((note: string) => {
    if (!activeNotesRef.current.has(note)) return;
    activeNotesRef.current.delete(note);
    if (sustainRef.current) {
      sustainedNotesRef.current.add(note);
      return;
    }
    try {
      samplerRef.current?.triggerRelease(note, Tone.now());
      fallbackSynthRef.current?.triggerRelease(note, Tone.now());
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const setSustain = useCallback((on: boolean) => {
    sustainRef.current = on;
    if (!on) {
      const now = Tone.now();
      sustainedNotesRef.current.forEach((note) => {
        try { samplerRef.current?.triggerRelease(note, now); } catch { /* noop */ }
        try { fallbackSynthRef.current?.triggerRelease(note, now); } catch { /* noop */ }
      });
      sustainedNotesRef.current.clear();
    }
  }, []);

  return {
    playNote,
    stopNote,
    setVolume,
    setSustain,
    unlockAudio,
    allNotesOff,
    isReady: audioStatus === 'ready' && sampleStatus === 'loaded',
    audioStatus,
    sampleStatus,
    audioError,
  };
}
