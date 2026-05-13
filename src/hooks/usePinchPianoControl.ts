import { useCallback, useRef, useState } from 'react';
import { findKeyAtPoint, getIndexTip, LANDMARK_INDEX } from '../utils/gestureDetection';
import type { HandData, Landmark } from '../utils/gestureDetection';

export interface HandControlPoint {
  id: string;
  handedness: 'Left' | 'Right';
  note: string | null;
  xRatio: number;
  yRatio: number;
  pinchDistance: number;
  isPinching: boolean;
  isPlaying: boolean;
}

interface Options {
  mirrored: boolean;
  keyElementsRef: React.RefObject<Map<string, HTMLDivElement>>;
  pianoAreaRef: React.RefObject<HTMLDivElement | null>;
  onNoteOn: (noteId: string) => void;
  onNoteOff: (noteId: string) => void;
}

interface HandState {
  isPinching: boolean;
  activeNote: string | null;
}

const PINCH_ON = 0.06;
const PINCH_OFF = 0.085;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function distance(a: Landmark, b: Landmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getThumbTip(hand: HandData) {
  return hand.landmarks[LANDMARK_INDEX.THUMB_TIP];
}

function buildKeyRects(keyElements: Map<string, HTMLDivElement>) {
  const rects = new Map<string, DOMRect>();
  keyElements.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
  return rects;
}

function getSampleY(keyRects: Map<string, DOMRect>) {
  const firstWhite = [...keyRects.entries()].find(([id]) => !id.includes('#'))?.[1];
  return firstWhite ? firstWhite.top + firstWhite.height * 0.62 : null;
}

export function usePinchPianoControl({ mirrored, keyElementsRef, pianoAreaRef, onNoteOn, onNoteOff }: Options) {
  const stateRef = useRef<Map<string, HandState>>(new Map());
  const [controls, setControls] = useState<HandControlPoint[]>([]);
  const [highlightedNotes, setHighlightedNotes] = useState<Set<string>>(new Set());
  const [handsDetected, setHandsDetected] = useState(0);
  const [primaryNote, setPrimaryNote] = useState<string | null>(null);
  const [pinchValue, setPinchValue] = useState(0);

  const releaseAll = useCallback(() => {
    stateRef.current.forEach((state) => {
      if (state.activeNote) onNoteOff(state.activeNote);
    });
    stateRef.current.clear();
    setControls([]);
    setHighlightedNotes(new Set());
    setHandsDetected(0);
    setPrimaryNote(null);
    setPinchValue(0);
  }, [onNoteOff]);

  const handleHandsDetected = useCallback((hands: HandData[]) => {
    setHandsDetected(hands.length);
    const pianoRect = pianoAreaRef.current?.getBoundingClientRect();
    const keyRects = buildKeyRects(keyElementsRef.current ?? new Map());
    const sampleY = getSampleY(keyRects);

    if (!hands.length || !pianoRect || !sampleY || keyRects.size === 0) {
      releaseAll();
      return;
    }

    const seen = new Set<string>();
    const nextControls: HandControlPoint[] = [];
    const nextHighlighted = new Set<string>();

    hands.forEach((hand, index) => {
      const id = `${hand.handedness}-${index}`;
      seen.add(id);
      const indexTip = getIndexTip(hand);
      const thumbTip = getThumbTip(hand);
      const xRatio = clamp01(mirrored ? 1 - indexTip.x : indexTip.x);
      const yRatio = clamp01(indexTip.y);
      const mappedX = pianoRect.left + xRatio * pianoRect.width;
      const note = findKeyAtPoint(mappedX, sampleY, keyRects);
      const pinchDistance = distance(indexTip, thumbTip);
      const prev = stateRef.current.get(id) ?? { isPinching: false, activeNote: null };
      const isPinching = prev.isPinching ? pinchDistance < PINCH_OFF : pinchDistance < PINCH_ON;
      let activeNote = prev.activeNote;

      if (isPinching && note && !prev.isPinching) {
        activeNote = note;
        onNoteOn(note);
      } else if (isPinching && note && prev.isPinching && prev.activeNote && prev.activeNote !== note) {
        onNoteOff(prev.activeNote);
        activeNote = note;
        onNoteOn(note);
      } else if (!isPinching && prev.isPinching && prev.activeNote) {
        onNoteOff(prev.activeNote);
        activeNote = null;
      }

      stateRef.current.set(id, { isPinching, activeNote });
      if (note) nextHighlighted.add(note);
      if (activeNote) nextHighlighted.add(activeNote);
      nextControls.push({ id, handedness: hand.handedness, note, xRatio, yRatio, pinchDistance, isPinching, isPlaying: Boolean(activeNote) });
    });

    stateRef.current.forEach((state, id) => {
      if (!seen.has(id)) {
        if (state.activeNote) onNoteOff(state.activeNote);
        stateRef.current.delete(id);
      }
    });

    setControls(nextControls);
    setHighlightedNotes(nextHighlighted);
    setPrimaryNote(nextControls.find((control) => control.note)?.note ?? null);
    setPinchValue(nextControls[0]?.pinchDistance ?? 0);
  }, [keyElementsRef, mirrored, onNoteOff, onNoteOn, pianoAreaRef, releaseAll]);

  return { controls, highlightedNotes, handsDetected, primaryNote, pinchValue, handleHandsDetected, releaseAll };
}
