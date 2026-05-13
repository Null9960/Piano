import React from 'react';
import type { AudioStatus, SampleStatus } from '../hooks/usePianoAudio';
import type { CameraStatus } from '../hooks/useHandTracking';

interface HUDProps {
  activeNotes: Set<string>;
  cameraActive: boolean;
  handsDetected: number;
  fingertipKey: string | null;
  cameraStatus?: CameraStatus;
  audioStatus?: AudioStatus;
  sampleStatus?: SampleStatus;
  audioError?: string | null;
  sustain?: boolean;
  pressDelta?: number;
}

export const HUD: React.FC<HUDProps> = ({
  activeNotes,
  cameraActive,
  handsDetected,
  fingertipKey,
  cameraStatus = cameraActive ? 'active' : 'idle',
  audioStatus = 'locked',
  sampleStatus = 'idle',
  audioError = null,
  sustain = false,
  pressDelta = 0,
}) => {
  const noteList = [...activeNotes].join(' + ') || '—';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      padding: '10px 16px',
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      flexWrap: 'wrap',
    }}>
      <Metric label="Playing" value={noteList} accent={activeNotes.size > 0} large />
      <Divider />
      <Metric label="Audio" value={audioStatus} accent={audioStatus === 'ready'} />
      <Metric label="Samples" value={sampleStatus} accent={sampleStatus === 'loaded'} />
      <Metric label="Camera" value={cameraStatus} accent={cameraStatus === 'active'} />
      <Metric label="Hands" value={handsDetected > 0 ? `${handsDetected}` : 'none'} accent={handsDetected > 0} />
      <Metric label="Fingertip" value={fingertipKey ?? '—'} accent={Boolean(fingertipKey)} />
      <Metric label="Sustain" value={sustain ? 'on' : 'off'} accent={sustain} />
      <Metric label="Press Δ" value={pressDelta.toFixed(3)} accent={Math.abs(pressDelta) > 0.01} />
      {audioError && <Metric label="Audio error" value={audioError.slice(0, 48)} accent={false} />}
      <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        <span style={microLabel}>Keyboard</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Z–M · Q–I</span>
      </div>
    </div>
  );
};

function Metric({ label, value, accent, large = false }: { label: string; value: string; accent?: boolean; large?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: large ? 86 : 58 }}>
      <span style={microLabel}>{label}</span>
      <span style={{
        fontFamily: large ? "'Playfair Display', serif" : "'DM Mono', monospace",
        fontSize: large ? 22 : 13,
        fontStyle: large ? 'italic' : 'normal',
        color: accent ? '#fbbf24' : 'rgba(255,255,255,0.35)',
        letterSpacing: large ? '0.05em' : 0,
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />;
}

const microLabel: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
};
