"use client";

/**
 * Voice Notes Component
 * Record and transcribe voice notes using Web Speech API
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface VoiceNote {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  transcript?: string;
  createdAt: number;
}

interface VoiceNotesProps {
  onRecordingComplete: (note: VoiceNote) => void;
  onTranscriptUpdate?: (id: string, transcript: string) => void;
  onError?: (error: Error) => void;
  enableTranscription?: boolean;
  maxDuration?: number; // seconds
  language?: string;
  className?: string;
}

export function VoiceNotes({
  onRecordingComplete,
  onTranscriptUpdate,
  onError,
  enableTranscription = true,
  maxDuration = 300, // 5 minutes
  language = "en-US",
  className = "",
}: VoiceNotesProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check if Speech Recognition is supported
  const isSpeechRecognitionSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Initialize speech recognition
  useEffect(() => {
    if (enableTranscription && isSpeechRecognitionSupported) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        setLiveTranscript((prev) => {
          if (finalTranscript) {
            return prev + finalTranscript;
          }
          return prev + interimTranscript;
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "no-speech") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enableTranscription, isSpeechRecognitionSupported, language]);

  // Monitor audio levels
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    animationRef.current = requestAnimationFrame(monitorAudioLevel);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];
      setLiveTranscript("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Setup media recorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Start audio level monitoring
      monitorAudioLevel();

      // Start speech recognition
      if (enableTranscription && recognitionRef.current) {
        recognitionRef.current.start();
        setIsTranscribing(true);
      }

      // Recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access microphone";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [enableTranscription, maxDuration, monitorAudioLevel, onError]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      monitorAudioLevel();

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  }, [maxDuration, monitorAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current.onstop = () => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);

        const note: VoiceNote = {
          id: `voice-${Date.now()}`,
          blob,
          url,
          duration,
          transcript: liveTranscript.trim() || undefined,
          createdAt: Date.now(),
        };

        onRecordingComplete(note);

        if (note.transcript && onTranscriptUpdate) {
          onTranscriptUpdate(note.id, note.transcript);
        }
      };
    }

    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioLevel(0);
  }, [liveTranscript, onRecordingComplete, onTranscriptUpdate]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    // Cleanup without saving
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioLevel(0);
    setLiveTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}
      >
        <svg
          className="w-12 h-12 text-red-500 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        <p className="text-red-600 dark:text-red-400 text-center mb-3 text-sm">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            startRecording();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Recording status */}
      {isRecording && (
        <div className="mb-4">
          {/* Audio visualizer */}
          <div className="flex items-center justify-center gap-1 h-16 mb-2">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, audioLevel * 64 * (0.5 + Math.random() * 0.5))}px`,
                  opacity: isPaused ? 0.3 : 1,
                }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center">
            <span className="text-2xl font-mono text-slate-900 dark:text-white">
              {formatTime(recordingTime)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
              / {formatTime(maxDuration)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Live transcript */}
      {isRecording && enableTranscription && (
        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`w-2 h-2 rounded-full ${isTranscribing ? "bg-green-500 animate-pulse" : "bg-slate-400"}`}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isTranscribing ? "Transcribing..." : "Transcription paused"}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {liveTranscript || "Start speaking..."}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!isRecording ? (
          // Start recording button
          <button
            onClick={startRecording}
            className="flex flex-col items-center p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
            aria-label="Start recording"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
        ) : (
          <>
            {/* Cancel button */}
            <button
              onClick={cancelRecording}
              className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full transition-colors"
              aria-label="Cancel recording"
            >
              <svg
                className="w-6 h-6 text-slate-600 dark:text-slate-300"
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

            {/* Pause/Resume button */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors"
              aria-label={isPaused ? "Resume recording" : "Pause recording"}
            >
              {isPaused ? (
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              aria-label="Stop and save recording"
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {!isRecording && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
          Tap the microphone to start recording
          {enableTranscription && isSpeechRecognitionSupported && (
            <span className="block text-xs mt-1">
              Voice-to-text transcription enabled
            </span>
          )}
        </p>
      )}
    </div>
  );
}
