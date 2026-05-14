import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { HandData } from '../utils/gestureDetection';
import { loadMediaPipeHandsConstructor } from '../utils/loadMediaPipeHands';

export type CameraStatus = 'idle' | 'requesting' | 'denied' | 'active' | 'error';

export interface UseHandTrackingOptions {
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onHandsDetected: (hands: HandData[]) => void;
  mirrored?: boolean;
  drawSkeleton?: boolean;
  targetFps?: number;
}

export interface UseHandTrackingReturn {
  cameraStatus: CameraStatus;
  startCamera: () => void;
  stopCamera: () => void;
  error: string | null;
}

type MediaPipeResult = {
  multiHandLandmarks?: { x: number; y: number; z: number }[][];
  multiHandedness?: { label: string }[];
};

type HandsInstance = {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: MediaPipeResult) => void) => void;
  send: (options: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
};

const DEFAULT_TARGET_FPS = 30;
const MAX_CONSECUTIVE_SEND_FAILURES = 3;
const MEDIAPIPE_ASSET_BASE = `${import.meta.env.BASE_URL}mediapipe/hands/`;

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
  const runDetectionRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runningRef.current = false;
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        handsRef.current?.close?.();
      } catch {
        // Best effort shutdown during unmount.
      }
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
        ctx.fillStyle = i === 8 ? 'rgba(251, 191, 36, 1)' : 'rgba(255,255,255,0.82)';
        ctx.fill();
      }
    },
    [drawSkeleton],
  );

  const scheduleNextFrame = useCallback(() => {
    if (!mountedRef.current || !runningRef.current) return;
    animFrameRef.current = requestAnimationFrame(() => {
      runDetectionRef.current();
    });
  }, []);

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hands = handsRef.current;

    if (!video || !canvas || !hands || !mountedRef.current || !runningRef.current) return;

    const now = performance.now();
    const minFrameMs = 1000 / Math.max(1, targetFps);
    if (now - lastFrameAtRef.current < minFrameMs) {
      scheduleNextFrame();
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      scheduleNextFrame();
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
      setError(`MediaPipe frame error: ${message}`);
      onHandsDetected([]);
      clearCanvas();

      if (sendFailureCountRef.current >= MAX_CONSECUTIVE_SEND_FAILURES) {
        runningRef.current = false;
        setCameraStatus('error');
        setError(`MediaPipe stopped after repeated frame failures: ${message}`);
      }
    } finally {
      scheduleNextFrame();
    }
  }, [videoRef, canvasRef, targetFps, scheduleNextFrame, clearCanvas, onHandsDetected]);

  useEffect(() => {
    runDetectionRef.current = () => {
      void runDetection();
    };
  }, [runDetection]);

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

    try {
      handsRef.current?.close?.();
    } catch {
      // MediaPipe close is best effort across browsers.
    }
    handsRef.current = null;
    setCameraStatus('idle');
  }, [videoRef, onHandsDetected, clearCanvas]);

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
        video: {
          width: { ideal: 960 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
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
        locateFile: (file: string) => `${MEDIAPIPE_ASSET_BASE}${file}`,
      }) as HandsInstance;

      handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        selfieMode: true,
        minDetectionConfidence: 0.62,
        minTrackingConfidence: 0.5,
      });

      handsInstance.onResults((results) => {
        if (!mountedRef.current) return;

        const canvas = canvasRef.current;
        const handsData: HandData[] = [];
        if (canvas) {
          const ctx = canvas.getContext('2d');
          clearCanvas();

          results.multiHandLandmarks?.forEach((landmarks, index) => {
            const handedness = results.multiHandedness?.[index]?.label === 'Left' ? 'Left' : 'Right';
            if (ctx) drawHand(ctx, landmarks, canvas.width, canvas.height);
            handsData.push({ landmarks, handedness });
          });
        }

        onHandsDetected(handsData);
      });

      handsRef.current = handsInstance;
      runningRef.current = true;
      setCameraStatus('active');
      scheduleNextFrame();
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
  }, [
    cameraStatus,
    videoRef,
    canvasRef,
    scheduleNextFrame,
    drawHand,
    onHandsDetected,
    clearCanvas,
  ]);

  useEffect(() => {
    if (enabled || cameraStatus !== 'active') return undefined;
    const timeout = window.setTimeout(() => stopCamera(), 0);
    return () => window.clearTimeout(timeout);
  }, [enabled, cameraStatus, stopCamera]);

  return { cameraStatus, startCamera, stopCamera, error };
}
