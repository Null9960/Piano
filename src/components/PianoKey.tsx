import React, { useEffect, useRef } from 'react';
import type { PianoNote } from '../utils/notes';

interface PianoKeyProps {
  note: PianoNote;
  isActive: boolean;
  isHighlighted?: boolean; // camera fingertip hovering
  onNoteOn: (noteId: string) => void;
  onNoteOff: (noteId: string) => void;
  onRegisterRect: (id: string, el: HTMLDivElement) => void;
  whiteKeyWidth: number;
  whiteKeyHeight: number;
}

export const PianoKey: React.FC<PianoKeyProps> = ({
  note,
  isActive,
  isHighlighted = false,
  onNoteOn,
  onNoteOff,
  onRegisterRect,
  whiteKeyWidth,
  whiteKeyHeight,
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const pointerDown = useRef(false);

  useEffect(() => {
    if (divRef.current) {
      onRegisterRect(note.id, divRef.current);
    }
  }, [note.id, onRegisterRect]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pointerDown.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onNoteOn(note.id);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    onNoteOff(note.id);
  };

  const handlePointerLeave = () => {
    if (pointerDown.current) {
      pointerDown.current = false;
      onNoteOff(note.id);
    }
  };

  if (note.isBlack) {
    const bw = whiteKeyWidth * 0.6;
    const bh = whiteKeyHeight * 0.62;

    return (
      <div
        ref={divRef}
        data-note={note.id}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          width: bw,
          height: bh,
          // Left offset: placed at whiteIndex * whiteKeyWidth + offset
          left: note.whiteIndex * whiteKeyWidth + whiteKeyWidth * BLACK_KEY_OFFSETS_VISUAL[note.name as 'C#' | 'D#' | 'F#' | 'G#' | 'A#'],
          top: 0,
          zIndex: 2,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          borderRadius: '0 0 6px 6px',
          background: isActive
            ? 'linear-gradient(to bottom, #f59e0b, #d97706)'
            : isHighlighted
            ? 'linear-gradient(to bottom, #374151, #4b5563)'
            : 'linear-gradient(to bottom, #1f2937, #111827)',
          boxShadow: isActive
            ? '0 2px 8px rgba(245, 158, 11, 0.6), inset 0 -2px 4px rgba(0,0,0,0.3)'
            : '2px 4px 8px rgba(0,0,0,0.7), inset 0 -2px 4px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.05)',
          transition: 'background 0.06s ease, box-shadow 0.06s ease',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 6,
        }}
      >
        {isActive && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 0 6px rgba(251, 191, 36, 0.8)',
            }}
          />
        )}
      </div>
    );
  }

  // White key
  const showLabel = note.name === 'C';
  return (
    <div
      ref={divRef}
      data-note={note.id}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        position: 'relative',
        width: whiteKeyWidth - 2,
        height: whiteKeyHeight,
        margin: '0 1px',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        flexShrink: 0,
        borderRadius: '0 0 8px 8px',
        background: isActive
          ? 'linear-gradient(to bottom, #fef3c7, #fbbf24)'
          : isHighlighted
          ? 'linear-gradient(to bottom, #e5e7eb, #d1d5db)'
          : 'linear-gradient(to bottom, #f9fafb, #e5e7eb)',
        boxShadow: isActive
          ? '0 4px 12px rgba(245, 158, 11, 0.5), inset 0 -3px 6px rgba(0,0,0,0.15)'
          : '1px 4px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.15)',
        transition: 'background 0.06s ease, box-shadow 0.06s ease',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 10,
        zIndex: 1,
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: Math.max(10, whiteKeyWidth * 0.35),
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            color: isActive ? '#92400e' : '#6b7280',
            letterSpacing: '-0.02em',
            pointerEvents: 'none',
          }}
        >
          {note.id}
        </span>
      )}
    </div>
  );
};

// Visual offsets for black keys (as fraction of white key width from the left of the preceding white key)
const BLACK_KEY_OFFSETS_VISUAL: Record<'C#' | 'D#' | 'F#' | 'G#' | 'A#', number> = {
  'C#': 0.64,
  'D#': 0.64,
  'F#': 0.64,
  'G#': 0.64,
  'A#': 0.64,
};
