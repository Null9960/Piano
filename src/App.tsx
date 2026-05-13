import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Piano } from './components/Piano';
import { CameraPreview } from './components/CameraPreview';
import { SettingsPanel, DEFAULT_SETTINGS } from './components/SettingsPanel';
import { HUD } from './components/HUD';
import { usePianoAudio } from './hooks/usePianoAudio';
import { useKeyboardPiano } from './hooks/useKeyboardPiano';
import { useHandTracking } from './hooks/useHandTracking';
import {
  getIndexTip,
  landmarkToScreen,
  findKeyAtPoint,
  createKeyDebouncer,
  detectPressGesture,
  detectReleaseGesture,
} from './utils/gestureDetection';
import type { HandData } from './utils/gestureDetection';
import type { Settings } from './components/SettingsPanel';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [highlightedNotes, setHighlightedNotes] = useState<Set<string>>(new Set());
  const [fingertipKey, setFingertipKey] = useState<string | null>(null);
  const [handsDetected, setHandsDetected] = useState(0);

  const keyElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFingertipY = useRef<number | null>(null);
  const pressingKey = useRef<string | null>(null);
  const debouncerRef = useRef(createKeyDebouncer(150));

  const { playNote, stopNote, setVolume, setSustain } = usePianoAudio({
    volume: settings.volume,
  });

  useEffect(() => { setVolume(settings.volume); }, [settings.volume, setVolume]);
  useEffect(() => { setSustain(settings.sustain); }, [settings.sustain, setSustain]);

  const handleNoteOn = useCallback((noteId: string) => {
    playNote(noteId);
    setActiveNotes((prev) => new Set([...prev, noteId]));
  }, [playNote]);

  const handleNoteOff = useCallback((noteId: string) => {
    stopNote(noteId);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  }, [stopNote]);

  useKeyboardPiano({ onNoteOn: handleNoteOn, onNoteOff: handleNoteOff });

  const handleKeyRectsReady = useCallback((rects: Map<string, HTMLDivElement>) => {
    keyElementsRef.current = rects;
  }, []);

  const handleHandsDetected = useCallback((hands: HandData[]) => {
    setHandsDetected(hands.length);

    if (hands.length === 0) {
      if (pressingKey.current) {
        handleNoteOff(pressingKey.current);
        pressingKey.current = null;
      }
      setFingertipKey(null);
      setHighlightedNotes(new Set());
      prevFingertipY.current = null;
      return;
    }

    const hand = hands[0];
    const tip = getIndexTip(hand);

    const bodyW = document.body.clientWidth;
    const bodyH = document.body.clientHeight;
    const screen = landmarkToScreen(tip, bodyW, bodyH, settings.mirrored);

    const keyRects = new Map<string, DOMRect>();
    keyElementsRef.current.forEach((el, id) => {
      keyRects.set(id, el.getBoundingClientRect());
    });

    const hitKey = findKeyAtPoint(screen.x, screen.y, keyRects);
    setFingertipKey(hitKey);
    setHighlightedNotes(hitKey ? new Set([hitKey]) : new Set());

    const prevY = prevFingertipY.current;

    if (prevY !== null) {
      const isPress = detectPressGesture(tip.y, prevY, settings.pressThreshold);
      const isRelease = detectReleaseGesture(tip.y, prevY, settings.pressThreshold * 0.5);

      if (isPress && hitKey && debouncerRef.current(hitKey)) {
        if (pressingKey.current && pressingKey.current !== hitKey) {
          handleNoteOff(pressingKey.current);
        }
        pressingKey.current = hitKey;
        handleNoteOn(hitKey);
      }

      if (isRelease && pressingKey.current) {
        handleNoteOff(pressingKey.current);
        pressingKey.current = null;
      }
    }

    if (pressingKey.current && hitKey && hitKey !== pressingKey.current) {
      handleNoteOff(pressingKey.current);
      pressingKey.current = null;
    }

    prevFingertipY.current = tip.y;
  }, [settings.mirrored, settings.pressThreshold, handleNoteOn, handleNoteOff]);

  const { cameraStatus, startCamera, stopCamera, error } = useHandTracking({
    enabled: settings.cameraEnabled,
    videoRef,
    canvasRef,
    onHandsDetected: handleHandsDetected,
    mirrored: settings.mirrored,
    drawSkeleton: settings.showSkeleton,
  });

  const handleSettingsChange = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const isCameraActive = cameraStatus === 'active';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0a0f1a 60%, #020617 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      gap: 20,
      boxSizing: 'border-box',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          margin: 0,
          fontFamily: "'Playfair Display', serif",
          fontSize: 'clamp(24px, 5vw, 42px)',
          fontWeight: 700,
          fontStyle: 'italic',
          color: '#f8fafc',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}>
          Hand Piano
        </h1>
        <p style={{
          margin: '6px 0 0',
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.2em',
          color: 'rgba(251, 191, 36, 0.6)',
          textTransform: 'uppercase',
        }}>
          Play with your hands · keyboard · or mouse
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 900 }}>
        <HUD
          activeNotes={activeNotes}
          cameraActive={isCameraActive}
          handsDetected={handsDetected}
          fingertipKey={fingertipKey}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: 16,
        width: '100%',
        maxWidth: 1200,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {settings.cameraEnabled && (
          <CameraPreview
            videoRef={videoRef}
            canvasRef={canvasRef}
            status={cameraStatus}
            onRequestCamera={startCamera}
            onStopCamera={stopCamera}
            error={error}
            visible
          />
        )}

        <div style={{ flex: 1, minWidth: 320, maxWidth: 820 }}>
          <Piano
            activeNotes={activeNotes}
            highlightedNotes={highlightedNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            onKeyRectsReady={handleKeyRectsReady}
          />
        </div>

        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onReset={handleReset}
        />
      </div>

      <KeyboardLegend />

      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: '0.08em',
        margin: 0,
      }}>
        HAND PIANO · React + Tone.js + MediaPipe
      </p>
    </div>
  );
}

function KeyboardLegend() {
  const rows = [
    { keys: 'Z X C V B N M', notes: 'C D E F G A B  (octave 3)' },
    { keys: 'Q W E R T Y U I', notes: 'C D E F G A B C (octave 4-5)' },
    { keys: 'S D  G H J', notes: 'C# D#  F# G# A# (sharps oct 3)' },
    { keys: '2 3  5 6 7', notes: 'C# D#  F# G# A# (sharps oct 4)' },
  ];
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.7)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '12px 20px',
      maxWidth: 560,
      width: '100%',
    }}>
      <p style={{
        margin: '0 0 8px',
        fontFamily: "'DM Mono', monospace",
        fontSize: 9,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.3)',
      }}>
        Keyboard shortcuts
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(({ keys, notes }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: 'rgba(251, 191, 36, 0.7)',
              minWidth: 140,
            }}>{keys}</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
            }}>→ {notes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
