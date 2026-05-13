import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Piano } from './components/Piano';
import { CameraPreview } from './components/CameraPreview';
import { SettingsPanel, DEFAULT_SETTINGS } from './components/SettingsPanel';
import { HUD } from './components/HUD';
import { AudioGate } from './components/AudioGate';
import { KeyboardLegend } from './components/KeyboardLegend';
import { usePianoAudio } from './hooks/usePianoAudio';
import { useKeyboardPiano } from './hooks/useKeyboardPiano';
import { useHandTracking } from './hooks/useHandTracking';
import { usePinchPianoControl } from './hooks/usePinchPianoControl';
import type { Settings } from './components/SettingsPanel';
import type { HandControlPoint } from './hooks/usePinchPianoControl';

export default function AppPinch() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const keyElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const pianoAreaRef   = useRef<HTMLDivElement>(null);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);

  const audio = usePianoAudio({ volume: settings.volume });

  // Fix: depend on specific stable callbacks, not the whole `audio` object
  const { setVolume, setSustain, allNotesOff } = audio;
  useEffect(() => { setVolume(settings.volume); },  [settings.volume,  setVolume]);
  useEffect(() => { setSustain(settings.sustain); }, [settings.sustain, setSustain]);

  const handleNoteOn = useCallback((noteId: string) => {
    audio.playNote(noteId);
    setActiveNotes((prev) => new Set([...prev, noteId]));
  }, [audio]);

  const handleNoteOff = useCallback((noteId: string) => {
    audio.stopNote(noteId);
    setActiveNotes((prev) => { const n = new Set(prev); n.delete(noteId); return n; });
  }, [audio]);

  useKeyboardPiano({ onNoteOn: handleNoteOn, onNoteOff: handleNoteOff });

  const pinch = usePinchPianoControl({
    mirrored: settings.mirrored,
    pinchOnThreshold:  settings.pinchOnThreshold,
    pinchOffThreshold: settings.pinchOffThreshold,
    keyElementsRef,
    pianoAreaRef,
    onNoteOn:  handleNoteOn,
    onNoteOff: handleNoteOff,
  });

  const camera = useHandTracking({
    enabled:      settings.cameraEnabled,
    videoRef,
    canvasRef,
    onHandsDetected: pinch.handleHandsDetected,
    mirrored:     settings.mirrored,
    drawSkeleton: settings.showSkeleton,
  });

  const handleReset = useCallback(() => {
    pinch.releaseAll();
    allNotesOff();
    setActiveNotes(new Set());
    setSettings(DEFAULT_SETTINGS);
  }, [pinch, allNotesOff]);

  return (
    <div style={styles.page}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={styles.title}>Hand Piano</h1>
        <p style={styles.subtitle}>Pinch thumb + index finger to play · Both hands supported</p>
      </header>

      <AudioGate
        audioStatus={audio.audioStatus}
        sampleStatus={audio.sampleStatus}
        onUnlock={audio.unlockAudio}
        audioError={audio.audioError}
      />

      <div style={{ width: '100%', maxWidth: 980 }}>
        <HUD
          activeNotes={activeNotes}
          cameraActive={camera.cameraStatus === 'active'}
          cameraStatus={camera.cameraStatus}
          handsDetected={pinch.handsDetected}
          fingertipKey={pinch.primaryNote}
          audioStatus={audio.audioStatus}
          sampleStatus={audio.sampleStatus}
          audioError={audio.audioError}
          sustain={settings.sustain}
          pressDelta={pinch.pinchValue}
        />
      </div>

      <main style={styles.main}>
        {settings.cameraEnabled && (
          <CameraPreview
            videoRef={videoRef}
            canvasRef={canvasRef}
            status={camera.cameraStatus}
            onRequestCamera={camera.startCamera}
            onStopCamera={() => { pinch.releaseAll(); camera.stopCamera(); }}
            error={camera.error}
            visible
          />
        )}

        <section ref={pianoAreaRef} style={styles.pianoArea}>
          <Piano
            activeNotes={activeNotes}
            highlightedNotes={pinch.highlightedNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            onKeyRectsReady={(rects) => { keyElementsRef.current = rects; }}
          />
          <HandDots controls={pinch.controls} />
        </section>

        <SettingsPanel
          settings={settings}
          onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
          onReset={handleReset}
        />
      </main>

      <KeyboardLegend />
      <p style={styles.footer}>HAND PIANO · React + Tone.js + MediaPipe · Salamander Grand Piano</p>
    </div>
  );
}

// ─── Hand position indicators above the piano ────────────────────────────────
function HandDots({ controls }: { controls: HandControlPoint[] }) {
  if (!controls.length) return null;
  return (
    <div style={styles.handLayer}>
      {controls.map((c) => (
        <div
          key={c.id}
          style={{
            ...styles.handDot,
            left: `${c.xRatio * 100}%`,
            background: c.isPinching
              ? 'rgba(251, 191, 36, 0.9)'
              : 'rgba(15, 23, 42, 0.92)',
            color: c.isPinching ? '#451a03' : '#fbbf24',
            border: `1px solid ${c.isPinching ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.4)'}`,
            transform: `translateX(-50%) scale(${c.isPinching ? 1.1 : 1})`,
            boxShadow: c.isPinching ? '0 0 12px rgba(251,191,36,0.5)' : 'none',
          }}
        >
          <span style={{ opacity: 0.6, fontSize: 9 }}>{c.handedness === 'Left' ? 'L' : 'R'}</span>
          {c.note && <span style={{ fontWeight: 700 }}> {c.note}</span>}
          {c.isPinching && <span style={{ fontSize: 9 }}> ●</span>}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0a0f1a 60%, #020617 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 16px', gap: 20, boxSizing: 'border-box',
  },
  title: {
    margin: 0, fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 700,
    fontStyle: 'italic', color: '#f8fafc',
    letterSpacing: '-0.02em', lineHeight: 1.1,
  },
  subtitle: {
    margin: '6px 0 0', fontFamily: "'DM Mono', monospace",
    fontSize: 11, letterSpacing: '0.14em',
    color: 'rgba(251, 191, 36, 0.65)', textTransform: 'uppercase',
  },
  main: {
    display: 'flex', gap: 16, width: '100%', maxWidth: 1200,
    alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center',
  },
  pianoArea: {
    flex: 1, minWidth: 320, maxWidth: 820, position: 'relative',
  },
  handLayer: {
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20,
  },
  handDot: {
    position: 'absolute', top: 4,
    padding: '3px 8px', borderRadius: 999,
    fontFamily: "'DM Mono', monospace", fontSize: 11,
    whiteSpace: 'nowrap', transition: 'all 0.08s ease',
  },
  footer: {
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em', margin: 0,
  },
};
