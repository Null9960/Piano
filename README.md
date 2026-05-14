# Hand Piano

A browser-based 88-key piano playable with webcam hand tracking, computer keyboard, mouse, or touch.

Built with React, Vite, TypeScript, Tone.js, Web Audio, and MediaPipe Hands.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

The install/build scripts copy MediaPipe runtime assets from `@mediapipe/hands` into `public/mediapipe/hands` so camera tracking can run from the app origin instead of depending on a runtime CDN.

## Production Build

```bash
npm run build
npm run preview
```

Deploy `dist/` to Vercel or Netlify. For GitHub Pages, set `base: '/Piano/'` in `vite.config.ts` before building.

## How To Play

### Audio

Click **Enable Audio and Load Grand Piano** once. Browser audio policies require a user gesture before Tone.js can start the audio context.

The app uses `Tone.Sampler` with the Salamander Grand Piano sample map across A0-C8. If samples fail to load, a synth fallback remains available, but the realistic piano tone depends on the sampled instrument.

### Webcam Hand Performance

1. Click **Enable Camera** and grant permission.
2. Keep both hands visible above the keyboard.
3. Move each fingertip horizontally over a target key.
4. Strike downward with any finger to trigger a note.
5. Lift upward to release it.

All five fingers on both hands are tracked independently, so chords and multi-finger passages are supported. Strike velocity is converted into note velocity for more natural dynamics.

### Camera Mapping

The default **Visible Range** mode maps the camera width to the keys currently visible in the horizontal piano viewport. Scroll the keyboard to choose a register. Turning this setting off maps the camera across the entire 88-key span.

### Computer Keyboard Map

| Keys | Notes |
|---|---|
| Z X C V B N M | C3 D3 E3 F3 G3 A3 B3 |
| S D G H J | C#3 D#3 F#3 G#3 A#3 |
| Q W E R T Y U I | C4 D4 E4 F4 G4 A4 B4 C5 |
| 2 3 5 6 7 | C#4 D#4 F#4 G#4 A#4 |

## Project Structure

```text
scripts/
  copy-mediapipe-assets.mjs
src/
  components/  Piano, PianoKey, CameraPreview, SettingsPanel, HUD, AudioGate
  config/      settings.ts
  hooks/       usePianoAudio, useHandTracking, useHandPressurePianoControl, useKeyboardPiano
  utils/       notes.ts, gestureDetection.ts, audioSamples.ts, loadMediaPipeHands.ts
  App.tsx
  AppPiano.tsx
```

## Reliability Notes

- Camera access requires HTTPS or localhost.
- MediaPipe assets are copied locally during install/build.
- Audio samples still load from a public sample host unless bundled separately.
- Hand control is geometry-based: MediaPipe landmarks feed a smoothing layer, downward velocity detection, key-travel pressure estimation, and per-finger note ownership.
- A real camera is still needed to validate lighting, background, and device-specific tracking quality.

## Useful Commands

```bash
npm run copy:mediapipe
npm run lint
npm run build
```
