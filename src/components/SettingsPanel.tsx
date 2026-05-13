import React from 'react';

export interface Settings {
  cameraEnabled: boolean;
  showSkeleton: boolean;
  volume: number;
  sustain: boolean;
  pressThreshold: number;
  mirrored: boolean;
}

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

export const DEFAULT_SETTINGS: Settings = {
  cameraEnabled: true,
  showSkeleton: true,
  volume: -8,
  sustain: false,
  pressThreshold: 0.015,
  mirrored: true,
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onReset }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 20px',
        width: 240,
        flexShrink: 0,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Playfair Display', serif",
            fontSize: 14,
            color: 'rgba(251, 191, 36, 0.9)',
            letterSpacing: '0.05em',
          }}
        >
          Settings
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Camera toggle */}
        <Toggle
          label="Camera"
          value={settings.cameraEnabled}
          onChange={(v) => onChange({ cameraEnabled: v })}
        />

        {/* Skeleton toggle */}
        <Toggle
          label="Hand Skeleton"
          value={settings.showSkeleton}
          onChange={(v) => onChange({ showSkeleton: v })}
          disabled={!settings.cameraEnabled}
        />

        {/* Sustain toggle */}
        <Toggle
          label="Sustain"
          value={settings.sustain}
          onChange={(v) => onChange({ sustain: v })}
        />

        {/* Mirror toggle */}
        <Toggle
          label="Mirror Camera"
          value={settings.mirrored}
          onChange={(v) => onChange({ mirrored: v })}
          disabled={!settings.cameraEnabled}
        />

        <Separator />

        {/* Volume */}
        <SliderRow
          label="Volume"
          value={settings.volume}
          min={-40}
          max={0}
          step={1}
          format={(v) => `${v} dB`}
          onChange={(v) => onChange({ volume: v })}
        />

        {/* Press threshold */}
        <SliderRow
          label="Press Sensitivity"
          value={settings.pressThreshold}
          min={0.005}
          max={0.05}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          onChange={(v) => onChange({ pressThreshold: v })}
          disabled={!settings.cameraEnabled}
        />

        <Separator />

        {/* Reset */}
        <button
          onClick={onReset}
          style={{
            padding: '7px 0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            letterSpacing: '0.08em',
            transition: 'all 0.15s',
          }}
        >
          Reset Defaults
        </button>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={labelStyle}>{label}</span>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? '#f59e0b' : 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 19 : 3,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ opacity: disabled ? 0.4 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={labelStyle}>{label}</span>
        <span style={{ ...labelStyle, color: 'rgba(251, 191, 36, 0.7)' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#f59e0b', cursor: disabled ? 'default' : 'pointer' }}
      />
    </div>
  );
}

function Separator() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  color: 'rgba(255,255,255,0.55)',
  letterSpacing: '0.05em',
};
