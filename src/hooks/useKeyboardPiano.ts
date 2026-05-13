import { useEffect, useRef } from 'react';
import { KEYBOARD_MAP } from '../utils/notes';

interface UseKeyboardPianoOptions {
  onNoteOn: (noteId: string) => void;
  onNoteOff: (noteId: string) => void;
  enabled?: boolean;
}

export function useKeyboardPiano({
  onNoteOn,
  onNoteOff,
  enabled = true,
}: UseKeyboardPianoOptions) {
  const pressedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.repeat) return; // no key repeat triggering

      const key = e.key.toLowerCase();
      const noteId = KEYBOARD_MAP[key];
      if (!noteId) return;

      if (pressedKeys.current.has(key)) return;
      pressedKeys.current.add(key);
      onNoteOn(noteId);
    }

    function handleKeyUp(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const noteId = KEYBOARD_MAP[key];
      if (!noteId) return;

      pressedKeys.current.delete(key);
      onNoteOff(noteId);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onNoteOn, onNoteOff]);
}
