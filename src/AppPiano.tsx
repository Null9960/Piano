import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Piano } from './components/Piano';
import { CameraPreview } from './components/CameraPreview';
import { SettingsPanel } from './components/SettingsPanel';
import { HUD } from './components/HUD';
import { AudioGate } from './components/AudioGate';
import { KeyboardLegend } from './components/KeyboardLegend';
import { usePianoAudio } from './hooks/usePianoAudio';
import { useKeyboardPiano } from './hooks/useKeyboardPiano';
import { useHandTracking } from './hooks/useHandTracking';
import { useHandPressurePianoControl } from './hooks/useHandPressurePianoControl';
import { DEFAULT_SETTINGS } from './config/settings';
import type { Settings } from './config/settings';
import type { HandControlPoint } from './hooks/useHandPressurePianoControl';

export default function AppPiano() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const keyElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const keyboardViewportRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const audio = usePianoAudio({ volume: settings.volume });
  const { playNote, stopNote, setVolume, setSustain, allNotesOff } = audio;

  useEffect(() => {
    setVolume(settings.volume);
  }, [settings.volume, setVolume]);

  useEffect(() => {
    setSustain(settings.sustain);
  }, [settings.sustain, setSustain]);

  const handleNoteOn = useCallback((noteId: string, velocity = 0.82) => {
    playNote(noteId, settings.softPedal ? velocity * 0.62 : velocity);
    setActiveNotes((prev) => new Set([...prev, noteId]));
  }, [playNote, settings.softPedal]);

  const handleNoteOff = useCallback((noteId: string) => {
    stopNote(noteId);
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  }, [stopNote]);

  useKeyboardPiano({ onNoteOn: handleNoteOn, onNoteOff: handleNoteOff });

  const handControl = useHandPressurePianoControl({
    mirrored: settings.mirrored,
    mapToVisibleKeys: settings.mapCameraToVisibleKeys,
    pressVelocity: settings.pressVelocity,
    releaseVelocity: settings.releaseVelocity,
    keyTravel: settings.keyTravel,
    smoothing: settings.handSmoothing,
    keyElementsRef,
    keyboardViewportRef,
    onNoteOn: handleNoteOn,
    onNoteOff: handleNoteOff,
  });

  const camera = useHandTracking({
    enabled: settings.cameraEnabled,
    videoRef,
    canvasRef,
    onHandsDetected: handControl.handleHandsDetected,
    mirrored: settings.mirrored,
    drawSkeleton: settings.showSkeleton,
    targetFps: settings.targetFps,
  });

  const handleReset = useCallback(() => {
    handControl.releaseAll();
    allNotesOff();
    setActiveNotes(new Set());
    setSettings(DEFAULT_SETTINGS);
  }, [handControl, allNotesOff]);

  return (
    <div style={styles.page}>
      <header style={{ textAlign: 'center' }}>
        <h1 style={styles.title}>Hand Piano</h1>
        <p style={styles.subtitle}>88-key sampled piano with downward finger strikes and multi-finger camera play</p>
      </header>

      <AudioGate
        audioStatus={audio.audioStatus}
        sampleStatus={audio.sampleStatus}
        onUnlock={audio.unlockAudio}
        audioError={audio.audioError}
      />

      <div style={{ width: '100%', maxWidth: 1040 }}>
        <HUD
          activeNotes={activeNotes}
          cameraActive={camera.cameraStatus === 'active'}
          cameraStatus={camera.cameraStatus}
          handsDetected={handControl.handsDetected}
          fingertipKey={handControl.primaryNote}
          audioStatus={audio.audioStatus}
          sampleStatus={audio.sampleStatus}
          audioError={audio.audioError}
          sustain={settings.sustain}
          pressure={handControl.pressureValue}
          activeFingers={handControl.activeFingerCount}
        />
      </div>

      <main style={styles.main}>
        {settings.cameraEnabled && (
          <CameraPreview
            videoRef={videoRef}
            canvasRef={canvasRef}
            status={camera.cameraStatus}
            onRequestCamera={camera.startCamera}
            onStopCamera={() => {
              handControl.releaseAll();
              camera.stopCamera();
            }}
            error={camera.error}
            mirrored={settings.mirrored}
            visible
          />
        )}

        <section style={styles.pianoArea}>
          <Piano
            activeNotes={activeNotes}
            highlightedNotes={handControl.highlightedNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            onKeyRectsReady={(rects) => {
              keyElementsRef.current = rects;
            }}
            onViewportReady={(el) => {
              keyboardViewportRef.current = el;
            }}
          />
          <HandDots controls={handControl.controls} />
        </section>

        <SettingsPanel
          settings={settings}
          onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
          onReset={handleReset}
        />
      </main>

      <KeyboardLegend />
      <p style={styles.footer}>HAND PIANO - React, Tone.js, MediaPipe Hands, Web Audio</p>
    </div>
  );
}

function HandDots({ controls }: { controls: HandControlPoint[] }) {
  if (!controls.length) return null;

  return (
    <div style={styles.handLayer}>
      {controls.map((control) => (
        <div
          key={control.id}
          style={{
            ...styles.handDot,
            left: `${control.xRatio * 100}%`,
            top: `${6 + control.yRatio * 20}%`,
            background: control.isPlaying
              ? 'rgba(251, 191, 36, 0.96)'
              : control.pressure > 0.5
                ? 'rgba(253, 186, 116, 0.9)'
                : 'rgba(15, 23, 42, 0.92)',
            color: control.isPlaying ? '#451a03' : '#fbbf24',
            border: `1px solid ${control.isPlaying ? 'rgba(251,191,36,0.95)' : 'rgba(251,191,36,0.35)'}`,
            transform: `translateX(-50%) scale(${control.isPlaying ? 1.12 : 1})`,
            boxShadow: control.isPlaying ? '0 0 13px rgba(251,191,36,0.55)' : 'none',
            opacity: control.note ? 1 : 0.58,
          }}
        >
          <span style={{ opacity: 0.72, fontSize: 9 }}>{fingerShortName(control.finger)}</span>
          {control.note && <span style={{ fontWeight: 700 }}> {control.note}</span>}
        </div>
      ))}
    </div>
  );
}

function fingerShortName(finger: HandControlPoint['finger']) {
  const labels: Record<HandControlPoint['finger'], string> = {
    thumb: 'T',
    index: 'I',
    middle: 'M',
    ring: 'R',
    pinky: 'P',
  };
  return labels[finger];
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0a0f1a 60%, #020617 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    gap: 20,
    boxSizing: 'border-box',
  },
  title: {
    margin: 0,
    fontFamily: "'Playfair Display', serif",
    fontSize: 'clamp(24px, 5vw, 42px)',
    fontWeight: 700,
    fontStyle: 'italic',
    color: '#f8fafc',
    letterSpacing: 0,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: '6px 0 0',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    letterSpacing: '0.1em',
    color: 'rgba(251, 191, 36, 0.65)',
    textTransform: 'uppercase',
  },
  main: {
    display: 'flex',
    gap: 16,
    width: '100%',
    maxWidth: 1280,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pianoArea: {
    flex: 1,
    minWidth: 320,
    maxWidth: 900,
    position: 'relative',
  },
  handLayer: {
    position: 'absolute',
    inset: '50px 12px 24px',
    pointerEvents: 'none',
    zIndex: 20,
  },
  handDot: {
    position: 'absolute',
    padding: '3px 8px',
    borderRadius: 999,
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    whiteSpace: 'nowrap',
    transition: 'transform 0.06s ease, opacity 0.08s ease',
  },
  footer: {
    fontFamily: "'DM Mono', monospace",
    fontSize: 10,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: '0.08em',
    margin: 0,
  },
};
