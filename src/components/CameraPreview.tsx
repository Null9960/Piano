import React from 'react';
import type { CameraStatus } from '../hooks/useHandTracking';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: CameraStatus;
  onRequestCamera: () => void;
  onStopCamera: () => void;
  error: string | null;
  visible: boolean;
  mirrored?: boolean;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  canvasRef,
  status,
  onRequestCamera,
  onStopCamera,
  error,
  visible,
  mirrored = true,
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: 280,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#0f172a',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.1em',
            color: 'rgba(251, 191, 36, 0.8)',
            textTransform: 'uppercase',
          }}
        >
          Camera
        </span>
        <StatusDot status={status} />
      </div>

      {/* Video area */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#020617' }}>
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: status === 'active' ? 'block' : 'none',
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            transform: mirrored ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Overlay when not active */}
        {status !== 'active' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 16,
            }}
          >
            {status === 'idle' && (
              <>
                <CameraIcon />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', margin: 0 }}>
                  Enable camera for hand tracking
                </p>
              </>
            )}
            {status === 'requesting' && (
              <p style={{ color: 'rgba(251, 191, 36, 0.8)', fontSize: 12, textAlign: 'center' }}>
                Requesting camera...
              </p>
            )}
            {(status === 'denied' || status === 'error') && (
              <>
                <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: 0 }}>
                  {error ?? 'Camera unavailable'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', margin: 0 }}>
                  Mouse / keyboard still work
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '8px 12px' }}>
        {status === 'idle' || status === 'denied' || status === 'error' ? (
          <button
            onClick={onRequestCamera}
            style={buttonStyle('#fbbf24', '#92400e')}
          >
            {status === 'denied' ? 'Retry Camera' : 'Enable Camera'}
          </button>
        ) : status === 'active' ? (
          <button onClick={onStopCamera} style={buttonStyle('#374151', '#9ca3af')}>
            Stop Camera
          </button>
        ) : null}
      </div>
    </div>
  );
};

function buttonStyle(bg: string, color: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '6px 12px',
    background: bg,
    color,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'DM Mono', monospace",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
  };
}

function StatusDot({ status }: { status: CameraStatus }) {
  const colors: Record<CameraStatus, string> = {
    idle: '#4b5563',
    requesting: '#f59e0b',
    active: '#10b981',
    denied: '#ef4444',
    error: '#ef4444',
  };
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colors[status],
        boxShadow: status === 'active' ? '0 0 6px #10b981' : 'none',
      }}
    />
  );
}

function CameraIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}>
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x={1} y={5} width={15} height={14} rx={2} ry={2} />
    </svg>
  );
}
