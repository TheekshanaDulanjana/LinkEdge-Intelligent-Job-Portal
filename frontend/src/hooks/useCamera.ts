'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  isCameraOn: boolean;
  cameraError: string;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): CameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // 🎥 START CAMERA
  const startCamera = useCallback(async () => {
    try {
      setCameraError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      // 🔥 Ensure video element is ready before attaching stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 0);

      setIsCameraOn(true);
    } catch (err: unknown) {
      const error = err as Error;

      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and refresh.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera. Please check your device.');
      }

      setIsCameraOn(false);
    }
  }, []);

  // 🛑 STOP CAMERA
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOn(false);
  }, []);

  // 🔁 Attach stream again if component re-renders
useEffect(() => {
  if (videoRef.current && streamRef.current) {
    videoRef.current.srcObject = streamRef.current;

    videoRef.current.onloadedmetadata = () => {
      videoRef.current?.play().catch(() => {});
    };
  }
});
  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    isCameraOn,
    cameraError,
    startCamera,
    stopCamera,
  };
}