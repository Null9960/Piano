import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

export interface AudioOptions { volume?: number; sustain?: boolean; }
export interface UsePianoAudioReturn {
  playNote: (note: string) => void;
  stopNote: (note: string) => void;
  setVolume: (db: number) => void;
  setSustain: (on: boolean) => void;
  isReady: boolean;
}

export function usePianoAudio(options?: AudioOptions): UsePianoAudioReturn {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const sustainRef = useRef(options?.sustain ?? false);
  const activeNotes = useRef<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0.15, release: 1.8 },
      volume: options?.volume ?? -8,
    });
    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.18 });
    reverb.toDestination();
    synth.connect(reverb);
    synthRef.current = synth;
    setIsReady(true);
    return () => { synth.dispose(); reverb.dispose(); synthRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playNote = useCallback(async (note: string) => {
    const synth = synthRef.current;
    if (!synth) return;
    await Tone.start();
    if (activeNotes.current.has(note)) return;
    activeNotes.current.add(note);
    try { synth.triggerAttack(note, Tone.now()); } catch { /* ignore */ }
  }, []);

  const stopNote = useCallback((note: string) => {
    const synth = synthRef.current;
    if (!synth || !activeNotes.current.has(note)) return;
    activeNotes.current.delete(note);
    if (sustainRef.current) return;
    try { synth.triggerRelease(note, Tone.now()); } catch { /* ignore */ }
  }, []);

  const setVolume = useCallback((db: number) => {
    if (synthRef.current) synthRef.current.volume.value = db;
  }, []);

  const setSustain = useCallback((on: boolean) => {
    sustainRef.current = on;
    if (!on && synthRef.current) {
      activeNotes.current.forEach((note) => {
        try { synthRef.current!.triggerRelease(note, Tone.now()); } catch { /* ignore */ }
      });
      activeNotes.current.clear();
    }
  }, []);

  return { playNote, stopNote, setVolume, setSustain, isReady };
}
