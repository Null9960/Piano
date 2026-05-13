import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandData } from '../utils/gestureDetection';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'active'
  | 'error';

export interface UseHandTrackingOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onHandsDetected: (hands: HandData[]) => void;
  mirrored?: boolean;
  drawSkeleton?: boolean;
}

export interface UseHandTrackingReturn {
  cameraStatus: CameraStatus;
  startCamera: () => void;
  stopCamera: () => void;
  error: string | null;
}

export function useHandTracking({
  enabled,
  videoRef,
  canvasRef,
  onHandsDetected,
  mirrored = true,
  drawSkeleton = true,
}: UseHandTrackingOptions): UseHandTrackingReturn {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<unknown>(null);
  const animFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Draw skeleton ──────────────────────────────────────────────────────────
  const drawHand = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      if (!drawSkeleton) return;

      const CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // index
        [0, 9], [9, 10], [10, 11], [11, 12],  // middle
        [0, 13], [13, 14], [14, 15], [15, 16],// ring
        [0, 17], [17, 18], [18, 19], [19, 20],// pinky
        [5, 9], [9, 13], [13, 17],             // palm
      ];

      const pt = (lm: { x: number; y: number }) => ({
        x: mirrored ? (1 - lm.x) * w : lm.x * w,
        y: lm.y * h,
      });

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 2;
      for (const [a, b] of CONNECTIONS) {
        const p1 = pt(landmarks[a]);
        const p2 = pt(landmarks[b]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw landmark dots
      for (let i = 0; i < landmarks.length; i++) {
        const p = pt(landmarks[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === 8 ? 8 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 8 ? 'rgba(251, 191, 36, 1)' : 'rgba(255,255,255,0.8)';
        ctx.fill();
      }
    },
    [drawSkeleton, mirrored],
  );

  // ─── Camera detection loop ──────────────────────────────────────────────────
  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hands = handsRef.current as { send: (options: { image: HTMLVideoElement }) => Promise<void> } | null;

    if (!video || !canvas || !hands || !mountedRef.current) return;
    if (video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await hands.send({ image: video });

    if (mountedRef.current) {
      animFrameRef.current = requestAnimationFrame(runDetection);
    }
  }, [videoRef, canvasRef]);

  // ─── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (cameraStatus === 'active') return;
    setCameraStatus('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Dynamically import MediaPipe Hands
      const { Hands } = await import('@mediapipe/hands');

      const handsInstance = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      handsInstance.onResults((results: {
        multiHandLandmarks?: { x: number; y: number; z: number }[][];
        multiHandedness?: { label: string }[];
      }) => {
        if (!mountedRef.current) return;

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d')!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const handsData: HandData[] = [];

          if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach((landmarks, i) => {
              const handedness = results.multiHandedness?.[i]?.label ?? 'Right';
              drawHand(ctx, landmarks, canvas.width, canvas.height);
              handsData.push({
                landmarks: landmarks as { x: number; y: number; z: number }[],
                handedness: handedness as 'Left' | 'Right',
              });
            });
          }

          onHandsDetected(handsData);
        }
      });

      handsRef.current = handsInstance;
      setCameraStatus('active');
      animFrameRef.current = requestAnimationFrame(runDetection);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCameraStatus('denied');
        setError('Camera access denied. Use mouse, touch, or keyboard to play.');
      } else {
        setCameraStatus('error');
        setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [cameraStatus, videoRef, canvasRef, runDetection, drawHand, onHandsDetected]);

  // ─── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    setCameraStatus('idle');
    handsRef.current = null;
  }, [videoRef, canvasRef]);

  // Re-run detection loop when enabled changes
  useEffect(() => {
    if (!enabled && cameraStatus === 'active') {
      stopCamera();
    }
  }, [enabled, cameraStatus, stopCamera]);

  return { cameraStatus, startCamera, stopCamera, error };
}
