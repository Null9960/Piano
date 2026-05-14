import React, { useCallback, useMemo, useRef } from 'react';
import { PianoKey } from './PianoKey';
import { generateNotes, countWhiteKeys } from '../utils/notes';

interface PianoProps {
  activeNotes: Set<string>;
  highlightedNotes?: Set<string>;
  onNoteOn: (noteId: string, velocity?: number) => void;
  onNoteOff: (noteId: string) => void;
  onKeyRectsReady: (rects: Map<string, HTMLDivElement>) => void;
  onViewportReady?: (el: HTMLDivElement | null) => void;
  midiStart?: number;
  midiEnd?: number;
}

const WHITE_KEY_WIDTH = 28;
const WHITE_KEY_HEIGHT = 188;

export const Piano: React.FC<PianoProps> = ({
  activeNotes,
  highlightedNotes = new Set(),
  onNoteOn,
  onNoteOff,
  onKeyRectsReady,
  onViewportReady,
  midiStart = 21,
  midiEnd = 108,
}) => {
  const notes = useMemo(() => generateNotes(midiStart, midiEnd), [midiStart, midiEnd]);
  const whiteNotes = useMemo(() => notes.filter((note) => !note.isBlack), [notes]);
  const blackNotes = useMemo(() => notes.filter((note) => note.isBlack), [notes]);
  const whiteCount = useMemo(() => countWhiteKeys(notes), [notes]);
  const keyElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const keyboardWidth = whiteCount * WHITE_KEY_WIDTH;

  const registerRect = useCallback((id: string, el: HTMLDivElement) => {
    keyElementsRef.current.set(id, el);
    if (keyElementsRef.current.size === notes.length) {
      onKeyRectsReady(new Map(keyElementsRef.current));
    }
  }, [notes.length, onKeyRectsReady]);

  const handleViewportRef = useCallback((el: HTMLDivElement | null) => {
    onViewportReady?.(el);
  }, [onViewportReady]);

  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
          borderRadius: '16px 16px 12px 12px',
          padding: '12px 12px 0 12px',
          boxShadow:
            '0 20px 60px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.05), 0 0 0 2px rgba(255,255,255,0.04)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '4px 2px 10px',
            color: 'rgba(251, 191, 36, 0.55)',
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 13,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
            }}
          >
            Hand Piano
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            88 KEYS - A0-C8
          </span>
        </div>

        <div
          ref={handleViewportRef}
          style={{
            position: 'relative',
            overflowX: 'auto',
            overflowY: 'hidden',
            borderRadius: '4px 4px 0 0',
            scrollbarColor: 'rgba(251,191,36,0.35) transparent',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: keyboardWidth,
              minWidth: keyboardWidth,
              height: WHITE_KEY_HEIGHT,
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            {whiteNotes.map((note) => (
              <PianoKey
                key={note.id}
                note={note}
                isActive={activeNotes.has(note.id)}
                isHighlighted={highlightedNotes.has(note.id)}
                onNoteOn={onNoteOn}
                onNoteOff={onNoteOff}
                onRegisterRect={registerRect}
                whiteKeyWidth={WHITE_KEY_WIDTH}
                whiteKeyHeight={WHITE_KEY_HEIGHT}
              />
            ))}

            {blackNotes.map((note) => (
              <PianoKey
                key={note.id}
                note={note}
                isActive={activeNotes.has(note.id)}
                isHighlighted={highlightedNotes.has(note.id)}
                onNoteOn={onNoteOn}
                onNoteOff={onNoteOff}
                onRegisterRect={registerRect}
                whiteKeyWidth={WHITE_KEY_WIDTH}
                whiteKeyHeight={WHITE_KEY_HEIGHT}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            height: 16,
            background: 'linear-gradient(to bottom, #0f172a, #0a0f1a)',
            borderRadius: '0 0 12px 12px',
          }}
        />
      </div>
    </div>
  );
};
