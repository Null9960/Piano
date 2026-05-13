import React from 'react';

interface HUDProps {
  activeNotes: Set<string>;
  cameraActive: boolean;
  handsDetected: number;
  fingertipKey: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  activeNotes,
  cameraActive,
  handsDetected,
  fingertipKey,
}) => {
  const noteList = [...activeNotes].join(' + ') || '—';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '10px 20px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Active note display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={microLabel}>Playing</span>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 22,
            fontStyle: 'italic',
            color: activeNotes.size > 0 ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            minWidth: 80,
            transition: 'color 0.1s',
            letterSpacing: '0.05em',
          }}
        >
          {noteList}
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />

      {/* Camera / hand status */}
      {cameraActive && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={microLabel}>Hands</span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                color: handsDetected > 0 ? '#10b981' : 'rgba(255,255,255,0.3)',
              }}
            >
              {handsDetected > 0 ? `${handsDetected} detected` : 'none'}
            </span>
          </div>

          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={microLabel}>Fingertip on</span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                color: fingertipKey ? '#a78bfa' : 'rgba(255,255,255,0.3)',
              }}
            >
              {fingertipKey ?? '—'}
            </span>
          </div>
        </>
      )}

      {/* Keyboard shortcut hint */}
      <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        <span style={microLabel}>Keyboard</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          Z–M · Q–I
        </span>
      </div>
    </div>
  );
};

const microLabel: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.3)',
};
