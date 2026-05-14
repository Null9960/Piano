import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { findKeyAtPoint, LANDMARK_INDEX } from '../utils/gestureDetection';
import type { HandData, Landmark } from '../utils/gestureDetection';

export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export interface HandControlPoint {
  id: string;
  handedness: 'Left' | 'Right';
  finger: FingerName;
  note: string | null;
  xRatio: number;
  yRatio: number;
  velocity: number;
  pressure: number;
  isPressed: boolean;
  isPlaying: boolean;
}

interface Options {
  mirrored: boolean;
  mapToVisibleKeys: boolean;
  pressVelocity: number;
  releaseVelocity: number;
  keyTravel: number;
  smoothing: number;
  keyElementsRef: RefObject<Map<string, HTMLDivElement>>;
  keyboardViewportRef: RefObject<HTMLDivElement | null>;
  onNoteOn: (noteId: string, velocity?: number) => void;
  onNoteOff: (noteId: string) => void;
}

interface FingerState {
  activeNote: string | null;
  isPressed: boolean;
  restY: number;
  pressStartY: number;
  smoothedX: number;
  smoothedY: number;
  lastSeenAt: number;
  lastNoteTime: number;
}

interface KeyboardBounds {
  left: number;
  right: number;
  hitY: number;
}

const FINGERS: Array<{ name: FingerName; tip: number }> = [
  { name: 'thumb', tip: LANDMARK_INDEX.THUMB_TIP },
  { name: 'index', tip: LANDMARK_INDEX.INDEX_FINGER_TIP },
  { name: 'middle', tip: LANDMARK_INDEX.MIDDLE_FINGER_TIP },
  { name: 'ring', tip: LANDMARK_INDEX.RING_FINGER_TIP },
  { name: 'pinky', tip: LANDMARK_INDEX.PINKY_TIP },
];

const NOTE_CHANGE_DEBOUNCE_MS = 70;
const REST_RECOVERY_ALPHA = 0.06;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v: number) {
  return clamp(v, 0, 1);
}

function buildKeyRects(keyElements: Map<string, HTMLDivElement>): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  keyElements.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
  return rects;
}

function getKeyboardBounds(
  keyRects: Map<string, DOMRect>,
  viewport: HTMLDivElement | null,
  mapToVisibleKeys: boolean,
): KeyboardBounds | null {
  const rects = [...keyRects.values()];
  if (!rects.length) return null;

  const whiteRects = [...keyRects.entries()]
    .filter(([id]) => !id.includes('#'))
    .map(([, rect]) => rect);
  const blackRects = [...keyRects.entries()]
    .filter(([id]) => id.includes('#'))
    .map(([, rect]) => rect);

  const whiteTop = Math.min(...whiteRects.map((rect) => rect.top));
  const whiteHeight = whiteRects[0]?.height ?? rects[0].height;
  const blackHeight = blackRects[0]?.height ?? whiteHeight * 0.62;
  const hitY = whiteTop + Math.min(blackHeight * 0.52, whiteHeight * 0.42);

  if (mapToVisibleKeys && viewport) {
    const viewportRect = viewport.getBoundingClientRect();
    return {
      left: viewportRect.left,
      right: viewportRect.right,
      hitY,
    };
  }

  return {
    left: Math.min(...rects.map((rect) => rect.left)),
    right: Math.max(...rects.map((rect) => rect.right)),
    hitY,
  };
}

function getFingerId(hand: HandData, finger: FingerName) {
  return `${hand.handedness}:${finger}`;
}

function getTip(hand: HandData, index: number): Landmark | null {
  return hand.landmarks[index] ?? null;
}

function noteHeldByAnotherFinger(states: Map<string, FingerState>, note: string, fingerId: string) {
  for (const [id, state] of states) {
    if (id !== fingerId && state.activeNote === note) return true;
  }
  return false;
}

function velocityToMidiVelocity(velocity: number, pressure: number) {
  return clamp(0.28 + Math.abs(velocity) * 0.42 + pressure * 0.24, 0.2, 1);
}

export function useHandPressurePianoControl({
  mirrored,
  mapToVisibleKeys,
  pressVelocity,
  releaseVelocity,
  keyTravel,
  smoothing,
  keyElementsRef,
  keyboardViewportRef,
  onNoteOn,
  onNoteOff,
}: Options) {
  const stateRef = useRef<Map<string, FingerState>>(new Map());
  const [controls, setControls] = useState<HandControlPoint[]>([]);
  const [highlightedNotes, setHighlightedNotes] = useState<Set<string>>(new Set());
  const [handsDetected, setHandsDetected] = useState(0);
  const [primaryNote, setPrimaryNote] = useState<string | null>(null);
  const [pressureValue, setPressureValue] = useState(0);
  const [activeFingerCount, setActiveFingerCount] = useState(0);

  const releaseFinger = useCallback((fingerId: string, state: FingerState) => {
    if (state.activeNote && !noteHeldByAnotherFinger(stateRef.current, state.activeNote, fingerId)) {
      onNoteOff(state.activeNote);
    }
    state.activeNote = null;
    state.isPressed = false;
  }, [onNoteOff]);

  const releaseAll = useCallback(() => {
    stateRef.current.forEach((state, id) => releaseFinger(id, state));
    stateRef.current.clear();
    setControls([]);
    setHighlightedNotes(new Set());
    setHandsDetected(0);
    setPrimaryNote(null);
    setPressureValue(0);
    setActiveFingerCount(0);
  }, [releaseFinger]);

  const handleHandsDetected = useCallback((hands: HandData[]) => {
    setHandsDetected(hands.length);

    const keyRects = buildKeyRects(keyElementsRef.current ?? new Map());
    const bounds = getKeyboardBounds(keyRects, keyboardViewportRef.current, mapToVisibleKeys);

    if (!hands.length) {
      releaseAll();
      return;
    }

    if (!bounds || bounds.right <= bounds.left || keyRects.size === 0) return;

    const now = performance.now();
    const nextControls: HandControlPoint[] = [];
    const nextHighlighted = new Set<string>();
    const seenIds = new Set<string>();
    const smoothKeep = clamp(smoothing, 0, 0.92);

    for (const hand of hands) {
      for (const finger of FINGERS) {
        const tip = getTip(hand, finger.tip);
        if (!tip) continue;

        const id = getFingerId(hand, finger.name);
        seenIds.add(id);

        const rawX = clamp01(mirrored ? 1 - tip.x : tip.x);
        const rawY = clamp01(tip.y);
        const prev = stateRef.current.get(id);
        const smoothedX = prev ? smoothKeep * prev.smoothedX + (1 - smoothKeep) * rawX : rawX;
        const smoothedY = prev ? smoothKeep * prev.smoothedY + (1 - smoothKeep) * rawY : rawY;
        const dtSeconds = prev ? clamp((now - prev.lastSeenAt) / 1000, 1 / 120, 0.2) : 1 / 30;
        const yVelocity = prev ? (smoothedY - prev.smoothedY) / dtSeconds : 0;

        const mappedX = bounds.left + smoothedX * (bounds.right - bounds.left);
        const hoveredNote = findKeyAtPoint(mappedX, bounds.hitY, keyRects);
        const restY = prev
          ? prev.isPressed
            ? prev.restY
            : prev.restY * (1 - REST_RECOVERY_ALPHA) + smoothedY * REST_RECOVERY_ALPHA
          : smoothedY;
        const pressure = clamp01((smoothedY - restY) / Math.max(0.015, keyTravel));

        let nextState: FingerState = prev ?? {
          activeNote: null,
          isPressed: false,
          restY,
          pressStartY: smoothedY,
          smoothedX,
          smoothedY,
          lastSeenAt: now,
          lastNoteTime: 0,
        };

        const downStrike = yVelocity >= pressVelocity && pressure >= 0.18;
        const deepPress = pressure >= 1;
        const shouldPress = Boolean(hoveredNote && !nextState.isPressed && (downStrike || deepPress));
        const shouldRelease = nextState.isPressed && (
          yVelocity <= -releaseVelocity ||
          smoothedY < nextState.pressStartY - Math.max(0.018, keyTravel * 0.55) ||
          !hoveredNote
        );
        const canChangeNote = hoveredNote && nextState.isPressed && hoveredNote !== nextState.activeNote &&
          now - nextState.lastNoteTime > NOTE_CHANGE_DEBOUNCE_MS;

        if (shouldPress && hoveredNote) {
          if (nextState.activeNote && !noteHeldByAnotherFinger(stateRef.current, nextState.activeNote, id)) {
            onNoteOff(nextState.activeNote);
          }
          nextState.activeNote = hoveredNote;
          nextState.isPressed = true;
          nextState.pressStartY = smoothedY;
          nextState.lastNoteTime = now;
          if (!noteHeldByAnotherFinger(stateRef.current, hoveredNote, id)) {
            onNoteOn(hoveredNote, velocityToMidiVelocity(yVelocity, pressure));
          }
        } else if (shouldRelease) {
          releaseFinger(id, nextState);
          nextState.restY = smoothedY;
        } else if (canChangeNote && hoveredNote) {
          if (nextState.activeNote && !noteHeldByAnotherFinger(stateRef.current, nextState.activeNote, id)) {
            onNoteOff(nextState.activeNote);
          }
          nextState.activeNote = hoveredNote;
          nextState.pressStartY = smoothedY;
          nextState.lastNoteTime = now;
          if (!noteHeldByAnotherFinger(stateRef.current, hoveredNote, id)) {
            onNoteOn(hoveredNote, velocityToMidiVelocity(yVelocity, pressure));
          }
        }

        nextState = {
          ...nextState,
          restY,
          smoothedX,
          smoothedY,
          lastSeenAt: now,
        };
        stateRef.current.set(id, nextState);

        if (hoveredNote) nextHighlighted.add(hoveredNote);
        if (nextState.activeNote) nextHighlighted.add(nextState.activeNote);

        nextControls.push({
          id,
          handedness: hand.handedness,
          finger: finger.name,
          note: hoveredNote,
          xRatio: smoothedX,
          yRatio: smoothedY,
          velocity: yVelocity,
          pressure,
          isPressed: nextState.isPressed,
          isPlaying: Boolean(nextState.activeNote),
        });
      }
    }

    stateRef.current.forEach((state, id) => {
      if (!seenIds.has(id)) {
        releaseFinger(id, state);
        stateRef.current.delete(id);
      }
    });

    const playing = nextControls.filter((control) => control.isPlaying).length;
    setControls(nextControls);
    setHighlightedNotes(nextHighlighted);
    setPrimaryNote(nextControls.find((control) => control.note)?.note ?? null);
    setPressureValue(nextControls.reduce((max, control) => Math.max(max, control.pressure), 0));
    setActiveFingerCount(playing);
  }, [
    keyElementsRef,
    keyboardViewportRef,
    mapToVisibleKeys,
    mirrored,
    onNoteOff,
    onNoteOn,
    pressVelocity,
    releaseAll,
    releaseFinger,
    releaseVelocity,
    keyTravel,
    smoothing,
  ]);

  return {
    controls,
    highlightedNotes,
    handsDetected,
    primaryNote,
    pressureValue,
    activeFingerCount,
    handleHandsDetected,
    releaseAll,
  };
}
