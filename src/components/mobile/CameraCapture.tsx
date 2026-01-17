"use client";

/**
 * Camera Capture Component
 * Enables photo and video capture for tips and evidence
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useRef, useCallback, useEffect } from "react";

export interface CapturedMedia {
  type: "image" | "video";
  blob: Blob;
  url: string;
  filename: string;
  metadata: {
    capturedAt: number;
    location?: { latitude: number; longitude: number };
    deviceInfo: string;
  };
}

interface CameraCaptureProps {
  onCapture: (media: CapturedMedia) => void;
  onError?: (error: Error) => void;
  enableVideo?: boolean;
  enableLocation?: boolean;
  maxVideoDuration?: number; // seconds
  quality?: "low" | "medium" | "high";
  facingMode?: "user" | "environment";
  className?: string;
}

export function CameraCapture({
  onCapture,
  onError,
  enableVideo = true,
  enableLocation = true,
  maxVideoDuration = 60,
  quality = "high",
  facingMode = "environment",
  className = "",
}: CameraCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentFacing, setCurrentFacing] = useState(facingMode);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get video constraints based on quality
  const getVideoConstraints = useCallback(() => {
    const qualityMap = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
    };

    return {
      facingMode: currentFacing,
      ...qualityMap[quality],
    };
  }, [currentFacing, quality]);

  // Check for multiple cameras
  useEffect(() => {
    async function checkCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Ignore errors
      }
    }
    checkCameras();
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: enableVideo,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [getVideoConstraints, enableVideo, onError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsRecording(false);
    setRecordingTime(0);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, []);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (!hasMultipleCameras) return;

    stopCamera();
    setCurrentFacing((prev) => (prev === "user" ? "environment" : "user"));

    // Restart with new facing mode
    setTimeout(startCamera, 100);
  }, [hasMultipleCameras, stopCamera, startCamera]);

  // Toggle flash/torch
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if ('torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet],
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch {
      // Torch not supported
    }
  }, [flashEnabled]);

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<
    { latitude: number; longitude: number } | undefined
  > => {
    if (!enableLocation) return undefined;

    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }, [enableLocation]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    ctx.drawImage(video, 0, 0);

    // Get location
    const location = await getCurrentLocation();

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const media: CapturedMedia = {
          type: "image",
          blob,
          url: URL.createObjectURL(blob),
          filename: `photo-${Date.now()}.jpg`,
          metadata: {
            capturedAt: Date.now(),
            location,
            deviceInfo: navigator.userAgent,
          },
        };

        onCapture(media);
      },
      "image/jpeg",
      quality === "high" ? 0.95 : quality === "medium" ? 0.85 : 0.7
    );
  }, [getCurrentLocation, onCapture, quality]);

  // Start video recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: quality === "high" ? 2500000 : 1000000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const location = await getCurrentLocation();

      const media: CapturedMedia = {
        type: "video",
        blob,
        url: URL.createObjectURL(blob),
        filename: `video-${Date.now()}.webm`,
        metadata: {
          capturedAt: Date.now(),
          location,
          deviceInfo: navigator.userAgent,
        },
      };

      onCapture(media);
      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    setIsRecording(true);

    // Recording timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxVideoDuration - 1) {
          stopRecording();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  }, [getCurrentLocation, maxVideoDuration, onCapture, quality]);

  // Stop video recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-16 h-16 text-red-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-red-600 dark:text-red-400 text-center mb-4">
          {error}
        </p>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isStreaming) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-16 h-16 text-slate-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Camera access required
        </p>
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Open Camera
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto"
        style={{ transform: currentFacing === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {formatTime(recordingTime)} / {formatTime(maxVideoDuration)}
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Flash toggle */}
          <button
            onClick={toggleFlash}
            className={`p-3 rounded-full ${
              flashEnabled ? "bg-yellow-500" : "bg-white/20"
            }`}
            aria-label={flashEnabled ? "Turn off flash" : "Turn on flash"}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </button>

          {/* Capture photo */}
          <button
            onClick={capturePhoto}
            disabled={isRecording}
            className="p-4 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label="Capture photo"
          >
            <svg
              className="w-8 h-8 text-slate-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Video recording */}
          {enableVideo && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-4 rounded-full ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="8" />
                </svg>
              )}
            </button>
          )}

          {/* Switch camera */}
          {hasMultipleCameras && (
            <button
              onClick={switchCamera}
              disabled={isRecording}
              className="p-3 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50"
              aria-label="Switch camera"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={stopCamera}
          className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30"
          aria-label="Close camera"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
