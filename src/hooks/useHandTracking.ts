import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandData } from '../utils/gestureDetection';
import { loadMediaPipeHandsConstructor } from '../utils/loadMediaPipeHands';

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
  drawSkeleton?: boolean;
  targetFps?: number;
}

export interface UseHandTrackingReturn {
  cameraStatus: CameraStatus;
  startCamera: () => void;
  stopCamera: () => void;
  error: string | null;
}

const MEDIAPIPE_HANDS_VERSION = '0.4.1675469240';
const DEFAULT_TARGET_FPS = 30;
const MAX_CONSECUTIVE_SEND_FAILURES = 3;

type HandsInstance = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: {
    multiHandLandmarks?: { x: number; y: number; z: number }[][];
    multiHandedness?: { label: string }[];
  }) => void) => void;
  send: (options: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

export function useHandTracking({
  enabled,
  videoRef,
  canvasRef,
  onHandsDetected,
  drawSkeleton = true,
  targetFps = DEFAULT_TARGET_FPS,
}: UseHandTrackingOptions): UseHandTrackingReturn {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<HandsInstance | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const lastFrameAtRef = useRef(0);
  const sendFailureCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  const drawHand = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: { x: number; y: number; z: number }[], w: number, h: number) => {
      if (!drawSkeleton) return;

      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],
        [0, 5], [5, 6], [6, 7], [7, 8],
        [0, 9], [9, 10], [10, 11], [11, 12],
        [0, 13], [13, 14], [14, 15], [15, 16],
        [0, 17], [17, 18], [18, 19], [19, 20],
        [5, 9], [9, 13], [13, 17],
      ];

      // Draw in raw MediaPipe coordinates. CameraPreview mirrors both video and
      // canvas with CSS when requested, so drawing logic must not mirror again.
      const pt = (lm: { x: number; y: number }) => ({ x: lm.x * w, y: lm.y * h });

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 2;
      for (const [a, b] of connections) {
        const p1 = pt(landmarks[a]);
        const p2 = pt(landmarks[b]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      for (let i = 0; i < landmarks.length; i++) {
        const p = pt(landmarks[i]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === 8 ? 8 : 4, 0, Math.PI * 2);
        ctx.fillStyle = i === 8 ? 'rgba(251, 191, 36, 1)' : 'rgba(255,255,255,0.8)';
        ctx.fill();
      }
    },
    [drawSkeleton],
  );

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hands = handsRef.current;

    if (!video || !canvas || !hands || !mountedRef.current || !runningRef.current) return;

    const now = performance.now();
    const minFrameMs = 1000 / Math.max(1, targetFps);
    if (now - lastFrameAtRef.current < minFrameMs) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    lastFrameAtRef.current = now;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    clearCanvas();

    try {
      await hands.send({ image: video });
      sendFailureCountRef.current = 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendFailureCountRef.current += 1;
      console.error('[HandTracking] hands.send failed', err);
      setError(`MediaPipe error: ${message}`);
      onHandsDetected([]);
      clearCanvas();

      if (sendFailureCountRef.current >= MAX_CONSECUTIVE_SEND_FAILURES) {
        runningRef.current = false;
        setCameraStatus('error');
        setError(`MediaPipe stopped after repeated failures: ${message}`);
      }
    } finally {
      if (mountedRef.current && runningRef.current) {
        animFrameRef.current = requestAnimationFrame(runDetection);
      }
    }
  }, [videoRef, canvasRef, targetFps, clearCanvas, onHandsDetected]);

  const startCamera = useCallback(async () => {
    if (cameraStatus === 'active' || cameraStatus === 'requesting') return;
    setCameraStatus('requesting');
    setError(null);
    sendFailureCountRef.current = 0;
    lastFrameAtRef.current = 0;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API unavailable. Use HTTPS or localhost.');
      }

      console.info('[HandTracking] requesting camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Video element is not mounted.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      console.info('[HandTracking] loading MediaPipe Hands');
      const Hands = await loadMediaPipeHandsConstructor();
      const handsInstance = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_HANDS_VERSION}/${file}`,
      }) as HandsInstance;

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.55,
      });

      handsInstance.onResults((results) => {
        if (!mountedRef.current) return;

        const canvas = canvasRef.current;
        const handsData: HandData[] = [];
        if (canvas) {
          const ctx = canvas.getContext('2d');
          clearCanvas();

          results.multiHandLandmarks?.forEach((landmarks, i) => {
            const handedness = results.multiHandedness?.[i]?.label ?? 'Right';
            if (ctx) drawHand(ctx, landmarks, canvas.width, canvas.height);
            handsData.push({
              landmarks,
              handedness: handedness as 'Left' | 'Right',
            });
          });
        }

        onHandsDetected(handsData);
      });

      handsRef.current = handsInstance;
      runningRef.current = true;
      setCameraStatus('active');
      animFrameRef.current = requestAnimationFrame(runDetection);
    } catch (err) {
      if (!mountedRef.current) return;
      runningRef.current = false;
      onHandsDetected([]);
      clearCanvas();

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCameraStatus('denied');
        setError('Camera access denied. Use mouse, touch, or keyboard to play.');
      } else {
        setCameraStatus('error');
        setError(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, [cameraStatus, videoRef, canvasRef, runDetection, drawHand, onHandsDetected, clearCanvas]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    onHandsDetected([]);
    clearCanvas();

    try { handsRef.current?.close?.(); } catch { /* best effort */ }
    handsRef.current = null;
    setCameraStatus('idle');
  }, [videoRef, onHandsDetected, clearCanvas]);

  useEffect(() => {
    if (!enabled && cameraStatus === 'active') stopCamera();
  }, [enabled, cameraStatus, stopCamera]);

  return { cameraStatus, startCamera, stopCamera, error };
}
