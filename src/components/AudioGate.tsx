import React from 'react';
import type { AudioStatus, SampleStatus } from '../hooks/usePianoAudio';

interface AudioGateProps {
  audioStatus: AudioStatus;
  sampleStatus: SampleStatus;
  onUnlock: () => void;
}

export const AudioGate: React.FC<AudioGateProps> = ({ audioStatus, sampleStatus, onUnlock }) => {
  if (audioStatus === 'ready') return null;

  return (
    <button
      onClick={onUnlock}
      style={{
        padding: '10px 18px',
        borderRadius: 12,
        border: 'none',
        background: '#fbbf24',
        color: '#451a03',
        fontFamily: "'DM Mono', monospace",
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(251, 191, 36, 0.18)',
      }}
    >
      Enable Audio / Load Piano ({audioStatus}, {sampleStatus})
    </button>
  );
};
