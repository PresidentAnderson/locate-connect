"use client";

/**
 * QR Code Scanner Component
 * Scans QR codes from missing person posters
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  className?: string;
}

interface DetectedQRCode {
  rawValue: string;
  boundingBox?: DOMRectReadOnly;
}

export function QRScanner({
  onScan,
  onError,
  onClose,
  className = "",
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<BarcodeDetector | null>(null);
  const animationRef = useRef<number | null>(null);

  // Check for BarcodeDetector API support
  const isBarcodeDetectorSupported = typeof BarcodeDetector !== "undefined";

  // Start scanner
  const startScanner = useCallback(async () => {
    try {
      setError(null);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for flash/torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setHasFlash('torch' in capabilities);

      // Initialize barcode detector
      if (isBarcodeDetectorSupported) {
        scannerRef.current = new BarcodeDetector({
          formats: ["qr_code"],
        });
      }

      setIsScanning(true);

      // Start scanning loop
      scanFrame();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [isBarcodeDetectorSupported, onError]);

  // Scan frame for QR codes
  const scanFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !scannerRef.current ||
      videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA
    ) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const codes: DetectedQRCode[] = await scannerRef.current.detect(videoRef.current);

      if (codes.length > 0) {
        const qrData = codes[0].rawValue;

        // Debounce repeated scans
        if (qrData !== lastScanned) {
          setLastScanned(qrData);

          // Vibrate on successful scan
          if ("vibrate" in navigator) {
            navigator.vibrate(100);
          }

          onScan(qrData);

          // Reset after delay to allow re-scanning
          setTimeout(() => setLastScanned(null), 2000);
        }
      }
    } catch {
      // Detection error, continue scanning
    }

    animationRef.current = requestAnimationFrame(scanFrame);
  }, [lastScanned, onScan]);

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    scannerRef.current = null;
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet],
      });
      setFlashEnabled(!flashEnabled);
    } catch {
      // Torch toggle failed
    }
  }, [flashEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Auto-start when BarcodeDetector is available
  useEffect(() => {
    if (isBarcodeDetectorSupported && !isScanning) {
      // Don't auto-start, wait for user interaction
    }
  }, [isBarcodeDetectorSupported, isScanning]);

  if (!isBarcodeDetectorSupported) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-16 h-16 text-amber-500 mb-4"
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
        <p className="text-slate-600 dark:text-slate-300 text-center mb-2 font-medium">
          QR Scanner Not Supported
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-4">
          Your browser does not support the Barcode Detection API. Please try
          Chrome on Android or Safari on iOS.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
          >
            Close
          </button>
        )}
      </div>
    );
  }

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
          onClick={startScanner}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isScanning) {
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
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m10 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        <p className="text-slate-600 dark:text-slate-300 mb-4 text-center">
          Scan QR codes from missing person posters
        </p>
        <button
          onClick={startScanner}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Start Scanner
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black rounded-lg overflow-hidden ${className}`}
    >
      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto"
      />

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Scan frame */}
        <div className="relative w-64 h-64">
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500" />

          {/* Scanning line animation */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="w-full h-0.5 bg-blue-500 animate-scan" />
          </div>
        </div>

        {/* Outside overlay */}
        <div className="absolute inset-0 bg-black/50">
          <div
            className="absolute bg-transparent"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "256px",
              height: "256px",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      </div>

      {/* Last scanned indicator */}
      {lastScanned && (
        <div className="absolute top-4 left-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg text-center">
          <span className="text-sm font-medium">QR Code Detected!</span>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Flash toggle */}
          {hasFlash && (
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
          )}

          {/* Close button */}
          <button
            onClick={() => {
              stopScanner();
              onClose?.();
            }}
            className="p-3 bg-white/20 rounded-full hover:bg-white/30"
            aria-label="Close scanner"
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

        <p className="text-white/80 text-center text-sm mt-3">
          Position the QR code within the frame
        </p>
      </div>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(256px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Type declaration for BarcodeDetector API
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; boundingBox?: DOMRectReadOnly }>>;
  static getSupportedFormats(): Promise<string[]>;
}
