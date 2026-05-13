import React from 'react';
import type { AudioStatus, SampleStatus } from '../hooks/usePianoAudio';

interface AudioGateProps {
  audioStatus: AudioStatus;
  sampleStatus: SampleStatus;
  onUnlock: () => void;
  audioError: string | null;
}

export const AudioGate: React.FC<AudioGateProps> = ({ audioStatus, sampleStatus, onUnlock, audioError }) => {
  // Already ready — hide completely
  if (audioStatus === 'ready' && sampleStatus === 'loaded') return null;

  const isLoading   = audioStatus === 'starting' || audioStatus === 'loading-samples';
  const isSampleLoad = audioStatus === 'loading-samples';

  return (
    <div style={container}>
      {audioError && (
        <div style={errorBadge}>⚠ {audioError}</div>
      )}

      <button
        onClick={onUnlock}
        disabled={isLoading}
        style={{ ...btn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'default' : 'pointer' }}
      >
        {audioStatus === 'locked'          && '🎹 Enable Audio & Load Piano'}
        {audioStatus === 'starting'        && '⏳ Starting audio engine…'}
        {isSampleLoad && sampleStatus === 'loading' && '⬇ Loading piano samples…'}
        {isSampleLoad && sampleStatus === 'loaded'  && '✓ Piano ready'}
        {audioStatus === 'error'           && '🔁 Retry Audio'}
        {audioStatus === 'ready' && sampleStatus !== 'loaded' && '⬇ Loading samples…'}
      </button>

      {isSampleLoad && (
        <p style={hint}>
          Downloading Salamander Grand Piano samples (~3 MB). First load takes a moment.
        </p>
      )}

      {audioStatus === 'ready' && sampleStatus === 'error' && (
        <p style={{ ...hint, color: 'rgba(251,113,133,0.8)' }}>
          Samples failed — synth fallback active. Notes will still play.
        </p>
      )}

      {audioStatus === 'locked' && (
        <p style={hint}>Click to enable audio (browser policy requires a user gesture)</p>
      )}
    </div>
  );
};

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
};
const btn: React.CSSProperties = {
  padding: '10px 22px', borderRadius: 12, border: 'none',
  background: '#fbbf24', color: '#451a03',
  fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 13,
  letterSpacing: '0.04em',
  boxShadow: '0 4px 20px rgba(251,191,36,0.3)',
  transition: 'opacity 0.2s',
};
const hint: React.CSSProperties = {
  margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 10,
  color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em', textAlign: 'center',
  maxWidth: 340,
};
const errorBadge: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8,
  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
  color: '#fca5a5', fontFamily: "'DM Mono', monospace", fontSize: 10,
};
