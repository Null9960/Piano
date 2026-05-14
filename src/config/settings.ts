export interface Settings {
  cameraEnabled: boolean;
  showSkeleton: boolean;
  mirrored: boolean;
  mapCameraToVisibleKeys: boolean;
  volume: number;
  sustain: boolean;
  softPedal: boolean;
  pressVelocity: number;
  releaseVelocity: number;
  keyTravel: number;
  handSmoothing: number;
  targetFps: number;
}

export const DEFAULT_SETTINGS: Settings = {
  cameraEnabled: true,
  showSkeleton: true,
  mirrored: true,
  mapCameraToVisibleKeys: true,
  volume: -8,
  sustain: false,
  softPedal: false,
  pressVelocity: 0.65,
  releaseVelocity: 0.38,
  keyTravel: 0.045,
  handSmoothing: 0.62,
  targetFps: 30,
};
