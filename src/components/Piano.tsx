import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PianoKey } from './PianoKey';
import { generateNotes, countWhiteKeys } from '../utils/notes';
import type { PianoNote } from '../utils/notes';

interface PianoProps {
  activeNotes: Set<string>;
  highlightedNotes?: Set<string>;
  onNoteOn: (noteId: string) => void;
  onNoteOff: (noteId: string) => void;
  onKeyRectsReady: (rects: Map<string, HTMLDivElement>) => void;
  midiStart?: number;
  midiEnd?: number;
}

export const Piano: React.FC<PianoProps> = ({
  activeNotes,
  highlightedNotes = new Set(),
  onNoteOn,
  onNoteOff,
  onKeyRectsReady,
  midiStart = 48, // C3
  midiEnd = 84,   // C6
}) => {
  const notes = useMemo(() => generateNotes(midiStart, midiEnd), [midiStart, midiEnd]);
  const whiteNotes = useMemo(() => notes.filter((n) => !n.isBlack), [notes]);
  const containerRef = useRef<HTMLDivElement>(null);
  const keyElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [containerWidth, setContainerWidth] = useState(0);

  const whiteCount = useMemo(() => countWhiteKeys(notes), [notes]);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const whiteKeyWidth = containerWidth > 0 ? containerWidth / whiteCount : 28;
  const whiteKeyHeight = Math.min(200, whiteKeyWidth * 5.5);

  const registerRect = useCallback((id: string, el: HTMLDivElement) => {
    keyElementsRef.current.set(id, el);
    // Notify parent whenever we have all keys registered
    if (keyElementsRef.current.size === notes.length) {
      onKeyRectsReady(new Map(keyElementsRef.current));
    }
  }, [notes.length, onKeyRectsReady]);

  // Build layout: white keys in a row, black keys absolutely positioned
  const blackNotes = useMemo(() => notes.filter((n) => n.isBlack), [notes]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Piano body shadow / frame */}
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
        {/* Piano brand strip */}
        <div
          style={{
            textAlign: 'center',
            padding: '4px 0 10px',
            fontFamily: "'Playfair Display', serif",
            fontSize: 13,
            letterSpacing: '0.3em',
            color: 'rgba(251, 191, 36, 0.5)',
            textTransform: 'uppercase',
          }}
        >
          Hand Piano
        </div>

        {/* Keys container */}
        <div
          style={{
            position: 'relative',
            height: whiteKeyHeight,
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            borderRadius: '4px 4px 0 0',
          }}
        >
          {/* White keys */}
          {whiteNotes.map((note) => (
            <PianoKey
              key={note.id}
              note={note}
              isActive={activeNotes.has(note.id)}
              isHighlighted={highlightedNotes.has(note.id)}
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
              onRegisterRect={registerRect}
              whiteKeyWidth={whiteKeyWidth}
              whiteKeyHeight={whiteKeyHeight}
            />
          ))}

          {/* Black keys – absolutely positioned */}
          {blackNotes.map((note) => (
            <PianoKey
              key={note.id}
              note={note}
              isActive={activeNotes.has(note.id)}
              isHighlighted={highlightedNotes.has(note.id)}
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
              onRegisterRect={registerRect}
              whiteKeyWidth={whiteKeyWidth}
              whiteKeyHeight={whiteKeyHeight}
            />
          ))}
        </div>

        {/* Bottom ledge */}
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
