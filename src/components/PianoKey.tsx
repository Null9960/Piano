import React, { useEffect, useRef } from 'react';
import type { PianoNote } from '../utils/notes';

interface PianoKeyProps {
  note: PianoNote;
  isActive: boolean;
  isHighlighted?: boolean;
  onNoteOn: (noteId: string, velocity?: number) => void;
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

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    pointerDown.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    onNoteOn(note.id, 0.82);
  };

  const handlePointerUp = () => {
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
    const blackWidth = whiteKeyWidth * 0.62;
    const blackHeight = whiteKeyHeight * 0.62;
    const left = (note.whiteIndex + 1) * whiteKeyWidth - blackWidth / 2;

    return (
      <div
        ref={divRef}
        data-note={note.id}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          width: blackWidth,
          height: blackHeight,
          left,
          top: 0,
          zIndex: 2,
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          borderRadius: '0 0 5px 5px',
          background: isActive
            ? 'linear-gradient(to bottom, #f59e0b, #d97706)'
            : isHighlighted
              ? 'linear-gradient(to bottom, #374151, #4b5563)'
              : 'linear-gradient(to bottom, #1f2937, #050816)',
          boxShadow: isActive
            ? '0 2px 9px rgba(245, 158, 11, 0.62), inset 0 -2px 4px rgba(0,0,0,0.3)'
            : '2px 4px 9px rgba(0,0,0,0.75), inset 0 -2px 4px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'background 0.05s ease, box-shadow 0.05s ease, transform 0.05s ease',
          transform: isActive ? 'translateY(2px)' : 'translateY(0)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 6,
        }}
      >
        {isActive && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 0 6px rgba(251, 191, 36, 0.9)',
            }}
          />
        )}
      </div>
    );
  }

  const showLabel = note.name === 'C' || note.id === 'A0';

  return (
    <div
      ref={divRef}
      data-note={note.id}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        position: 'relative',
        width: whiteKeyWidth,
        height: whiteKeyHeight,
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        flexShrink: 0,
        borderRadius: '0 0 7px 7px',
        background: isActive
          ? 'linear-gradient(to bottom, #fef3c7, #fbbf24)'
          : isHighlighted
            ? 'linear-gradient(to bottom, #e5e7eb, #d1d5db)'
            : 'linear-gradient(to bottom, #ffffff, #e5e7eb)',
        boxShadow: isActive
          ? '0 4px 12px rgba(245, 158, 11, 0.5), inset 0 -6px 7px rgba(0,0,0,0.17)'
          : '1px 4px 8px rgba(0,0,0,0.42), inset 0 -3px 4px rgba(0,0,0,0.11)',
        border: '1px solid rgba(0,0,0,0.16)',
        borderTop: 'none',
        transition: 'background 0.05s ease, box-shadow 0.05s ease, transform 0.05s ease',
        transform: isActive ? 'translateY(3px)' : 'translateY(0)',
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
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            color: isActive ? '#92400e' : '#6b7280',
            letterSpacing: 0,
            pointerEvents: 'none',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {note.id}
        </span>
      )}
    </div>
  );
};
