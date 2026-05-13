// ─── Gesture detection utilities ─────────────────────────────────────────────

export interface Landmark {
  x: number; // 0–1 normalized
  y: number; // 0–1 normalized
  z: number;
}

export interface HandData {
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
}

// MediaPipe hand landmark indices
export const LANDMARK_INDEX = {
  WRIST: 0,
  INDEX_FINGER_TIP: 8,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_MCP: 5,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_TIP: 16,
  PINKY_TIP: 20,
  THUMB_TIP: 4,
} as const;

/**
 * Get the index fingertip position in normalized [0,1] coordinates.
 */
export function getIndexTip(hand: HandData): Landmark {
  return hand.landmarks[LANDMARK_INDEX.INDEX_FINGER_TIP];
}

/**
 * Convert normalized landmark coordinates to pixel coordinates on screen.
 * Accounts for mirroring (camera is typically mirrored).
 */
export function landmarkToScreen(
  landmark: Landmark,
  containerWidth: number,
  containerHeight: number,
  mirrored = true,
): { x: number; y: number } {
  const x = mirrored ? (1 - landmark.x) * containerWidth : landmark.x * containerWidth;
  const y = landmark.y * containerHeight;
  return { x, y };
}

/**
 * Detect a downward press gesture.
 * Returns true if the index fingertip has moved downward past the threshold
 * relative to its previous position.
 *
 * @param currentY  current fingertip Y (normalized)
 * @param previousY previous fingertip Y (normalized)
 * @param threshold minimum downward delta to count as a press
 */
export function detectPressGesture(
  currentY: number,
  previousY: number,
  threshold = 0.015,
): boolean {
  return currentY - previousY > threshold;
}

/**
 * Detect a release (finger moving upward).
 */
export function detectReleaseGesture(
  currentY: number,
  previousY: number,
  threshold = 0.008,
): boolean {
  return previousY - currentY > threshold;
}

/**
 * Simple Y-threshold press: finger is considered "pressing" when its
 * normalized Y is above (lower on screen) the given absolute threshold.
 * Useful as a simpler alternative to delta-based detection.
 */
export function isFingerBelowThreshold(
  fingertipY: number,
  threshold: number,
): boolean {
  return fingertipY > threshold;
}

/**
 * Given an array of bounding rects (from piano keys), find which one
 * contains the given pixel coordinate.
 */
export function findKeyAtPoint(
  x: number,
  y: number,
  keyRects: Map<string, DOMRect>,
): string | null {
  // Check black keys first (they're on top visually)
  const blackEntries = [...keyRects.entries()].filter(([id]) => id.includes('#'));
  for (const [id, rect] of blackEntries) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return id;
    }
  }
  // Then white keys
  const whiteEntries = [...keyRects.entries()].filter(([id]) => !id.includes('#'));
  for (const [id, rect] of whiteEntries) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return id;
    }
  }
  return null;
}

/**
 * Debounce helper – returns a function that won't call the original
 * more than once per `delay` ms for the same key.
 */
export function createKeyDebouncer(delay = 200) {
  const lastTrigger = new Map<string, number>();
  return function canTrigger(keyId: string): boolean {
    const now = Date.now();
    const last = lastTrigger.get(keyId) ?? 0;
    if (now - last > delay) {
      lastTrigger.set(keyId, now);
      return true;
    }
    return false;
  };
}
