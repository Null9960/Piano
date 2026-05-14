import React from 'react';
import type { Settings } from '../config/settings';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onReset }) => (
  <div style={panel}>
    <h3 style={heading}>Performance</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toggle label="Camera" value={settings.cameraEnabled} onChange={(value) => onChange({ cameraEnabled: value })} />
      <Toggle
        label="Hand Skeleton"
        value={settings.showSkeleton}
        onChange={(value) => onChange({ showSkeleton: value })}
        disabled={!settings.cameraEnabled}
      />
      <Toggle
        label="Mirror Camera"
        value={settings.mirrored}
        onChange={(value) => onChange({ mirrored: value })}
        disabled={!settings.cameraEnabled}
      />
      <Toggle
        label="Visible Range"
        value={settings.mapCameraToVisibleKeys}
        onChange={(value) => onChange({ mapCameraToVisibleKeys: value })}
        disabled={!settings.cameraEnabled}
      />

      <Sep />

      <Toggle label="Sustain" value={settings.sustain} onChange={(value) => onChange({ sustain: value })} />
      <Toggle label="Soft Pedal" value={settings.softPedal} onChange={(value) => onChange({ softPedal: value })} />

      <Slider
        label="Volume"
        value={settings.volume}
        min={-40}
        max={0}
        step={1}
        fmt={(value) => `${value} dB`}
        onChange={(value) => onChange({ volume: value })}
      />

      <Sep />

      <Slider
        label="Press Speed"
        value={settings.pressVelocity}
        min={0.25}
        max={1.4}
        step={0.05}
        fmt={(value) => value.toFixed(2)}
        onChange={(value) => onChange({ pressVelocity: value })}
        disabled={!settings.cameraEnabled}
        hint="Downward strike threshold"
      />
      <Slider
        label="Release Speed"
        value={settings.releaseVelocity}
        min={0.15}
        max={1.0}
        step={0.05}
        fmt={(value) => value.toFixed(2)}
        onChange={(value) => onChange({ releaseVelocity: value })}
        disabled={!settings.cameraEnabled}
        hint="Upward lift threshold"
      />
      <Slider
        label="Key Travel"
        value={settings.keyTravel}
        min={0.02}
        max={0.09}
        step={0.005}
        fmt={(value) => `${(value * 100).toFixed(1)}%`}
        onChange={(value) => onChange({ keyTravel: value })}
        disabled={!settings.cameraEnabled}
        hint="Depth needed for a press"
      />
      <Slider
        label="Smoothing"
        value={settings.handSmoothing}
        min={0.15}
        max={0.9}
        step={0.05}
        fmt={(value) => value.toFixed(2)}
        onChange={(value) => onChange({ handSmoothing: value })}
        disabled={!settings.cameraEnabled}
        hint="Higher is steadier"
      />

      <Sep />

      <button onClick={onReset} style={resetBtn}>Reset Defaults</button>
    </div>
  </div>
);

function Toggle({ label, value, onChange, disabled = false }: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: disabled ? 0.4 : 1 }}>
      <span style={lbl}>{label}</span>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        aria-label={label}
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

function Slider({ label, value, min, max, step, fmt, onChange, disabled = false, hint }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div style={{ opacity: disabled ? 0.4 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={lbl}>{label}</span>
        <span style={{ ...lbl, color: 'rgba(251,191,36,0.7)' }}>{fmt(value)}</span>
      </div>
      {hint && <div style={{ ...lbl, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>{hint}</div>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: '#f59e0b', cursor: disabled ? 'default' : 'pointer' }}
      />
    </div>
  );
}

function Sep() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />;
}

const panel: React.CSSProperties = {
  background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '16px 20px',
  width: 250,
  flexShrink: 0,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const heading: React.CSSProperties = {
  margin: '0 0 16px',
  fontFamily: "'Playfair Display', serif",
  fontSize: 14,
  color: 'rgba(251,191,36,0.9)',
  letterSpacing: '0.05em',
};

const resetBtn: React.CSSProperties = {
  padding: '7px 0',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  letterSpacing: '0.08em',
  width: '100%',
};

const lbl: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  color: 'rgba(255,255,255,0.55)',
  letterSpacing: '0.05em',
};
