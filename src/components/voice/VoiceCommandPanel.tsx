"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  VoiceCommandService,
  type VoiceCommandResult,
  type VoiceCommandLanguage,
} from "@/lib/services/voice-commands";

interface VoiceCommandPanelProps {
  defaultLanguage?: VoiceCommandLanguage;
  onCommand?: (result: VoiceCommandResult) => void;
}

export function VoiceCommandPanel({
  defaultLanguage = "en",
  onCommand,
}: VoiceCommandPanelProps) {
  const router = useRouter();
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [language, setLanguage] = useState<VoiceCommandLanguage>(defaultLanguage);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceService] = useState(() => new VoiceCommandService({ language: defaultLanguage }));

  useEffect(() => {
    const supported = voiceService.init();
    setIsSupported(supported);

    if (supported) {
      voiceService.onCommand(handleCommand);
      voiceService.onDictation(setTranscript);
      voiceService.onError(setError);
    }

    return () => {
      voiceService.stop();
    };
  }, [voiceService]);

  const handleCommand = useCallback(
    (result: VoiceCommandResult) => {
      setLastCommand(result);
      setError(null);
      onCommand?.(result);

      if (!result.recognized) return;

      // Handle built-in actions
      switch (result.action) {
        case "NAVIGATE":
          const dest = result.params?.destination?.toLowerCase();
          if (dest) {
            const routes: Record<string, string> = {
              dashboard: "/dashboard",
              cases: "/cases",
              leads: "/leads",
              settings: "/settings",
              home: "/",
            };
            const route = routes[dest] || `/${dest}`;
            router.push(route);
            voiceService.speak(`Navigating to ${dest}`);
          }
          break;

        case "GO_BACK":
          router.back();
          voiceService.speak("Going back");
          break;

        case "SHOW_HELP":
          setShowHelp(true);
          voiceService.speak("Showing voice command help");
          break;

        case "START_DICTATION":
          setIsDictating(true);
          voiceService.startDictation();
          voiceService.speak("Dictation started. Speak your note.");
          break;

        case "STOP_DICTATION":
          const dictatedText = voiceService.stopDictation();
          setIsDictating(false);
          voiceService.speak("Dictation stopped");
          console.log("Dictated text:", dictatedText);
          break;

        case "SEARCH_CASE":
          const caseNum = result.params?.caseNumber;
          if (caseNum) {
            router.push(`/cases?search=${caseNum}`);
            voiceService.speak(`Searching for case ${caseNum}`);
          }
          break;

        case "SHOW_PRIORITY_CASES":
          router.push("/cases?priority=high");
          voiceService.speak("Showing high priority cases");
          break;

        default:
          // Custom handler
          break;
      }
    },
    [router, voiceService, onCommand]
  );

  const toggleListening = () => {
    if (isListening) {
      voiceService.stop();
      setIsListening(false);
    } else {
      voiceService.start();
      setIsListening(true);
      setError(null);
    }
  };

  const changeLanguage = (newLang: VoiceCommandLanguage) => {
    setLanguage(newLang);
    voiceService.setLanguage(newLang);
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        Voice commands are not supported in this browser. Please use Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Voice Commands</h3>
        <select
          value={language}
          onChange={(e) => changeLanguage(e.target.value as VoiceCommandLanguage)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
      </div>

      {/* Microphone Button */}
      <div className="mt-4 flex flex-col items-center">
        <button
          onClick={toggleListening}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
            isListening
              ? "bg-red-500 text-white shadow-lg shadow-red-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } ${isDictating ? "animate-pulse" : ""}`}
        >
          <MicrophoneIcon className="h-8 w-8" />
        </button>
        <p className="mt-2 text-xs text-gray-500">
          {isListening
            ? isDictating
              ? "Dictating..."
              : 'Listening... Say "locate" to activate'
            : "Click to start"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded bg-red-50 p-2 text-xs text-red-600">
          {error === "not-allowed"
            ? "Microphone access denied. Please enable it in your browser settings."
            : error}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="mt-3 rounded bg-gray-50 p-2">
          <p className="text-xs text-gray-500">Heard:</p>
          <p className="text-sm text-gray-900">{transcript}</p>
        </div>
      )}

      {/* Last Command */}
      {lastCommand && (
        <div className="mt-3 rounded bg-cyan-50 p-2">
          <p className="text-xs text-cyan-600">
            {lastCommand.recognized ? `Action: ${lastCommand.action}` : "Command not recognized"}
          </p>
          <p className="text-xs text-gray-500">
            Confidence: {Math.round(lastCommand.confidence * 100)}%
          </p>
        </div>
      )}

      {/* Help Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="mt-3 text-xs text-cyan-600 hover:underline"
      >
        {showHelp ? "Hide commands" : "Show available commands"}
      </button>

      {/* Help Panel */}
      {showHelp && (
        <div className="mt-3 space-y-2 rounded bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-700">Available Commands:</p>
          <ul className="space-y-1 text-xs text-gray-600">
            {voiceService.getAvailableCommands().map((cmd, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-500">•</span>
                <span>{cmd.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
      />
    </svg>
  );
}

export default VoiceCommandPanel;
