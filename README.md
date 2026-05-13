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
npm run build
npm run preview
```

Deploy `dist/` to Vercel or Netlify. For GitHub Pages, set `base: '/Piano/'` in `vite.config.ts` before building.

---

## How to Play

### Audio
The app now uses `Tone.Sampler` with piano samples loaded from the public Salamander sample set used by Tone.js examples.

Important:
- Browser audio must be unlocked by a user gesture.
- Click/tap a piano key or press a mapped keyboard key once to unlock audio.
- Samples require internet access unless they are later bundled locally.

### Keyboard Map
| Keys | Notes |
|---|---|
| Z X C V B N M | C3 D3 E3 F3 G3 A3 B3 |
| S D  G H J | C#3 D#3  F#3 G#3 A#3 |
| Q W E R T Y U I | C4–C5 |
| 2 3  5 6 7 | C#4 D#4  F#4 G#4 A#4 |

### Hand Tracking
1. Click **Enable Camera** → grant permission.
2. Hold hand in front of webcam, index finger extended.
3. Move fingertip over a key, then press down quickly to trigger.

---

## Camera Troubleshooting

If camera permission is granted but hand tracking does not work:

1. Use Chrome first.
2. Use `localhost` or an HTTPS deployment.
3. If using StackBlitz/CodeSandbox, open the preview in a separate browser tab.
4. Check browser console for MediaPipe loading errors.
5. MediaPipe currently loads runtime files from CDN and requires internet access.
6. If the camera preview works but hands are not detected, the likely failure is MediaPipe runtime loading or `hands.send()`.

---

## Project Structure

```
src/
  components/  Piano, PianoKey, CameraPreview, SettingsPanel, HUD
  hooks/       usePianoAudio, useHandTracking, useKeyboardPiano
  utils/       notes.ts, gestureDetection.ts, audioSamples.ts
  App.tsx
```

## Current Range

The current keyboard range is C3–C6. This is intentional for the MVP because camera control is not precise enough for a full 88-key layout yet.

## Extend to 88 Keys Later

```tsx
<Piano midiStart={21} midiEnd={108} ... />
```

A real 88-key mode should add horizontal scrolling, viewport mapping, and calibration before being exposed to users.

---

## Known Limitations

1. MediaPipe loads from CDN on first use.
2. Camera press is delta-based Y movement, not physical contact.
3. Hand-to-key mapping still needs calibration and stronger diagnostics.
4. Audio samples load from a public CDN.
5. Camera requires HTTPS; localhost is allowed.
6. Advanced gestures are not implemented yet.

---

## Suggested Next Steps

- Harden `useHandTracking` with detailed MediaPipe diagnostics.
- Add explicit Enable Audio button wired in `App.tsx`.
- Add a visible fingertip cursor/debug overlay.
- Fix camera/video/canvas mirroring consistency.
- Bundle MediaPipe and piano samples locally for reliability.
- Add two-hand polyphonic control.
- Add velocity from fingertip downward speed.

---

*React 19 · Tone.js 15 · MediaPipe Hands 0.4*
