import { useCallback, useRef, useState } from 'react';
import { findKeyAtPoint, getIndexTip, LANDMARK_INDEX } from '../utils/gestureDetection';
import type { HandData, Landmark } from '../utils/gestureDetection';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HandControlPoint {
  id: string;
  handedness: 'Left' | 'Right';
  note: string | null;
  xRatio: number;       // 0–1, smoothed
  pinchDistance: number; // normalized 0–1
  isPinching: boolean;
  isPlaying: boolean;
}

interface Options {
  mirrored: boolean;
  pinchOnThreshold: number;  // normalized distance to trigger note (e.g. 0.06)
  pinchOffThreshold: number; // normalized distance to release note (e.g. 0.09)
  keyElementsRef: React.RefObject<Map<string, HTMLDivElement>>;
  pianoAreaRef: React.RefObject<HTMLDivElement | null>;
  onNoteOn: (noteId: string) => void;
  onNoteOff: (noteId: string) => void;
}

interface HandState {
  isPinching: boolean;
  activeNote: string | null;
  smoothedX: number;     // EMA-smoothed normalized X
  lastNoteTime: number;  // ms timestamp, for debounce between key changes
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EMA_ALPHA      = 0.35; // smoothing factor (higher = more responsive, lower = smoother)
const NOTE_DEBOUNCE_MS = 80; // min ms between note triggers while sliding

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function dist3d(a: Landmark, b: Landmark) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getThumbTip(hand: HandData): Landmark {
  return hand.landmarks[LANDMARK_INDEX.THUMB_TIP];
}

// Use handedness as stable key — MediaPipe guarantees at most one Left / one Right
function handId(hand: HandData): string {
  return hand.handedness; // 'Left' | 'Right'
}

function buildKeyRects(keyElements: Map<string, HTMLDivElement>): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  keyElements.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
  return rects;
}

// Sample Y at 55% of white key height — reliable hit zone for both white and black keys
function getPianoHitY(keyRects: Map<string, DOMRect>): number | null {
  const whites = [...keyRects.entries()].filter(([id]) => !id.includes('#'));
  if (!whites.length) return null;
  const rect = whites[0][1];
  return rect.top + rect.height * 0.55;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePinchPianoControl({
  mirrored,
  pinchOnThreshold,
  pinchOffThreshold,
  keyElementsRef,
  pianoAreaRef,
  onNoteOn,
  onNoteOff,
}: Options) {
  const stateRef = useRef<Map<string, HandState>>(new Map());
  const [controls, setControls]             = useState<HandControlPoint[]>([]);
  const [highlightedNotes, setHighlightedNotes] = useState<Set<string>>(new Set());
  const [handsDetected, setHandsDetected]   = useState(0);
  const [primaryNote, setPrimaryNote]       = useState<string | null>(null);
  const [pinchValue, setPinchValue]         = useState(0);

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
    const keyRects  = buildKeyRects(keyElementsRef.current ?? new Map());
    const hitY      = getPianoHitY(keyRects);

    // Release all and bail if piano not ready
    if (!pianoRect || !hitY || keyRects.size === 0) {
      if (hands.length === 0) releaseAll();
      return;
    }

    const seenIds     = new Set<string>();
    const nextControls: HandControlPoint[] = [];
    const nextHighlighted = new Set<string>();

    for (const hand of hands) {
      const id        = handId(hand);
      seenIds.add(id);

      const indexTip    = getIndexTip(hand);
      const thumbTip    = getThumbTip(hand);
      const rawX        = clamp01(mirrored ? 1 - indexTip.x : indexTip.x);
      const pinchDist   = dist3d(indexTip, thumbTip);

      // ── EMA smoothing on X to reduce jitter ──
      const prev = stateRef.current.get(id) ?? {
        isPinching: false,
        activeNote: null,
        smoothedX: rawX,
        lastNoteTime: 0,
      };
      const smoothedX = EMA_ALPHA * rawX + (1 - EMA_ALPHA) * prev.smoothedX;

      // ── Hit-test: map smoothed X to piano coordinate ──
      const mappedX   = pianoRect.left + smoothedX * pianoRect.width;
      const hoveredNote = findKeyAtPoint(mappedX, hitY, keyRects);

      // ── Pinch hysteresis (prevents rapid on/off oscillation) ──
      const isPinching = prev.isPinching
        ? pinchDist < pinchOffThreshold   // need to open past OFF threshold to release
        : pinchDist < pinchOnThreshold;   // need to close past ON threshold to trigger

      let activeNote = prev.activeNote;
      const now = Date.now();

      if (isPinching && hoveredNote) {
        if (!prev.isPinching) {
          // Pinch just closed → trigger note
          if (activeNote && activeNote !== hoveredNote) { onNoteOff(activeNote); }
          activeNote = hoveredNote;
          onNoteOn(hoveredNote);
        } else if (prev.isPinching && hoveredNote !== prev.activeNote) {
          // Sliding to a new key while pinching — debounced glissando
          if (now - prev.lastNoteTime > NOTE_DEBOUNCE_MS) {
            if (activeNote) onNoteOff(activeNote);
            activeNote = hoveredNote;
            onNoteOn(hoveredNote);
          }
        }
      } else if (!isPinching && prev.isPinching) {
        // Pinch just opened → release
        if (activeNote) { onNoteOff(activeNote); activeNote = null; }
      }

      const nextState: HandState = {
        isPinching,
        activeNote,
        smoothedX,
        lastNoteTime: isPinching && hoveredNote !== prev.activeNote ? now : prev.lastNoteTime,
      };
      stateRef.current.set(id, nextState);

      if (hoveredNote)   nextHighlighted.add(hoveredNote);
      if (activeNote)    nextHighlighted.add(activeNote);

      nextControls.push({
        id,
        handedness: hand.handedness,
        note: hoveredNote,
        xRatio: smoothedX,
        pinchDistance: pinchDist,
        isPinching,
        isPlaying: Boolean(activeNote),
      });
    }

    // Release notes from hands that disappeared
    stateRef.current.forEach((state, id) => {
      if (!seenIds.has(id)) {
        if (state.activeNote) onNoteOff(state.activeNote);
        stateRef.current.delete(id);
      }
    });

    setControls(nextControls);
    setHighlightedNotes(nextHighlighted);
    setPrimaryNote(nextControls.find((c) => c.note)?.note ?? null);
    setPinchValue(nextControls[0]?.pinchDistance ?? 0);
  }, [mirrored, pinchOnThreshold, pinchOffThreshold, keyElementsRef, pianoAreaRef, onNoteOn, onNoteOff, releaseAll]);

  return { controls, highlightedNotes, handsDetected, primaryNote, pinchValue, handleHandsDetected, releaseAll };
}
