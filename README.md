# 🎹 Hand Piano

A browser-based interactive piano playable via **webcam hand-tracking**, **keyboard**, **mouse**, or **touch**.

Built with React + Vite + TypeScript · Tone.js · MediaPipe Hands.

---

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

### Build for Production
```bash
npm run build   # output in dist/
npm run preview # preview locally
```

Deploy `dist/` to Vercel, Netlify, or GitHub Pages as-is.

---

## How to Play

### Keyboard Map
| Keys | Notes |
|---|---|
| Z X C V B N M | C3 D3 E3 F3 G3 A3 B3 |
| S D  G H J | C#3 D#3  F#3 G#3 A#3 |
| Q W E R T Y U I | C4–C5 |
| 2 3  5 6 7 | C#4 D#4  F#4 G#4 A#4 |

### Hand Tracking
1. Click **Enable Camera** → grant permission
2. Hold hand in front of webcam, index finger extended
3. Move fingertip over a key, then **press down** quickly to trigger

---

## Project Structure

```
src/
  components/  Piano, PianoKey, CameraPreview, SettingsPanel, HUD
  hooks/       usePianoAudio, useHandTracking, useKeyboardPiano
  utils/       notes.ts, gestureDetection.ts
  App.tsx
```

## Extend to 88 Keys

```tsx
<Piano midiStart={21} midiEnd={108} ... />
```

---

## Known Limitations

1. **MediaPipe loads from CDN** on first use — needs internet
2. **Press is delta-based** (Y movement), not physical contact
3. **Single hand** tracked currently
4. **Synthesized audio** (triangle PolySynth + reverb), not real samples
5. Camera requires **HTTPS** (localhost is always allowed)

---

## Suggested Next Steps

- Sampled piano audio via Tone.Sampler + free sample pack
- Two-hand polyphonic control
- Velocity from fingertip downward speed
- Sustain palm gesture
- Recording + playback via Tone.Transport
- MIDI output via Web MIDI API
- Offline MediaPipe (bundle WASM locally)

---

*React 19 · Tone.js 15 · MediaPipe Hands 0.4*
