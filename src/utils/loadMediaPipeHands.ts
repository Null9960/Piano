type HandsConstructor = new (config: { locateFile: (file: string) => string }) => {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: unknown) => void) => void;
  send: (options: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

export async function loadMediaPipeHandsConstructor(): Promise<HandsConstructor> {
  const mod = await import('@mediapipe/hands');
  const candidates = [
    (mod as { Hands?: unknown }).Hands,
    (mod as { default?: { Hands?: unknown } }).default?.Hands,
    (globalThis as { Hands?: unknown }).Hands,
  ];

  const Hands = candidates.find((candidate): candidate is HandsConstructor => typeof candidate === 'function');

  if (!Hands) {
    const keys = Object.keys(mod as Record<string, unknown>).join(', ') || 'no module keys';
    throw new Error(`MediaPipe Hands constructor not found. Imported keys: ${keys}`);
  }

  return Hands;
}
