/**
 * Multi-language Voice Commands Service
 * Provides hands-free voice interface for the application.
 */

// Web Speech API type - use any to avoid conflicts with DOM lib types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

export type VoiceCommandLanguage = "en" | "fr" | "es";

export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  params?: string[];
  description: string;
}

export interface VoiceCommandResult {
  recognized: boolean;
  command?: string;
  action?: string;
  params?: Record<string, string>;
  confidence: number;
}

export interface VoiceRecognitionConfig {
  language: VoiceCommandLanguage;
  continuous: boolean;
  interimResults: boolean;
  wakeWord?: string;
}

// Voice command patterns for each language
const COMMAND_PATTERNS: Record<VoiceCommandLanguage, VoiceCommand[]> = {
  en: [
    {
      pattern: /search (?:for )?case (?:number )?(\w+)/i,
      action: "SEARCH_CASE",
      params: ["caseNumber"],
      description: "Search for a case by number",
    },
    {
      pattern: /add (?:a )?note to case (?:number )?(\w+)/i,
      action: "ADD_NOTE",
      params: ["caseNumber"],
      description: "Add a note to a case",
    },
    {
      pattern: /what(?:'s| is) the status of (?:my )?case(?: (\w+))?/i,
      action: "GET_STATUS",
      params: ["caseNumber"],
      description: "Get case status",
    },
    {
      pattern: /show (?:me )?priority (?:zero|0|high) cases/i,
      action: "SHOW_PRIORITY_CASES",
      description: "Show high priority cases",
    },
    {
      pattern: /navigate to (\w+)/i,
      action: "NAVIGATE",
      params: ["destination"],
      description: "Navigate to a section",
    },
    {
      pattern: /read (?:the )?latest updates/i,
      action: "READ_UPDATES",
      description: "Read latest case updates",
    },
    {
      pattern: /start (?:voice )?note/i,
      action: "START_DICTATION",
      description: "Start voice note dictation",
    },
    {
      pattern: /stop (?:voice )?note/i,
      action: "STOP_DICTATION",
      description: "Stop voice note dictation",
    },
    {
      pattern: /go back/i,
      action: "GO_BACK",
      description: "Navigate back",
    },
    {
      pattern: /help/i,
      action: "SHOW_HELP",
      description: "Show voice command help",
    },
  ],
  fr: [
    {
      pattern: /rechercher (?:le )?dossier (?:numéro )?(\w+)/i,
      action: "SEARCH_CASE",
      params: ["caseNumber"],
      description: "Rechercher un dossier par numéro",
    },
    {
      pattern: /ajouter (?:une )?note au dossier (?:numéro )?(\w+)/i,
      action: "ADD_NOTE",
      params: ["caseNumber"],
      description: "Ajouter une note à un dossier",
    },
    {
      pattern: /quel est le statut (?:de mon )?dossier(?: (\w+))?/i,
      action: "GET_STATUS",
      params: ["caseNumber"],
      description: "Obtenir le statut du dossier",
    },
    {
      pattern: /afficher (?:les )?dossiers prioritaires/i,
      action: "SHOW_PRIORITY_CASES",
      description: "Afficher les dossiers prioritaires",
    },
    {
      pattern: /naviguer vers (\w+)/i,
      action: "NAVIGATE",
      params: ["destination"],
      description: "Naviguer vers une section",
    },
    {
      pattern: /lire (?:les )?dernières mises à jour/i,
      action: "READ_UPDATES",
      description: "Lire les dernières mises à jour",
    },
    {
      pattern: /commencer (?:la )?note (?:vocale)?/i,
      action: "START_DICTATION",
      description: "Commencer la dictée vocale",
    },
    {
      pattern: /arrêter (?:la )?note (?:vocale)?/i,
      action: "STOP_DICTATION",
      description: "Arrêter la dictée vocale",
    },
    {
      pattern: /retour/i,
      action: "GO_BACK",
      description: "Retour",
    },
    {
      pattern: /aide/i,
      action: "SHOW_HELP",
      description: "Afficher l'aide vocale",
    },
  ],
  es: [
    {
      pattern: /buscar (?:el )?caso (?:número )?(\w+)/i,
      action: "SEARCH_CASE",
      params: ["caseNumber"],
      description: "Buscar un caso por número",
    },
    {
      pattern: /agregar (?:una )?nota al caso (?:número )?(\w+)/i,
      action: "ADD_NOTE",
      params: ["caseNumber"],
      description: "Agregar una nota a un caso",
    },
    {
      pattern: /cuál es el estado (?:de mi )?caso(?: (\w+))?/i,
      action: "GET_STATUS",
      params: ["caseNumber"],
      description: "Obtener el estado del caso",
    },
    {
      pattern: /mostrar casos prioritarios/i,
      action: "SHOW_PRIORITY_CASES",
      description: "Mostrar casos prioritarios",
    },
    {
      pattern: /navegar a (\w+)/i,
      action: "NAVIGATE",
      params: ["destination"],
      description: "Navegar a una sección",
    },
    {
      pattern: /leer (?:las )?últimas actualizaciones/i,
      action: "READ_UPDATES",
      description: "Leer últimas actualizaciones",
    },
    {
      pattern: /comenzar nota (?:de voz)?/i,
      action: "START_DICTATION",
      description: "Comenzar dictado de voz",
    },
    {
      pattern: /detener nota (?:de voz)?/i,
      action: "STOP_DICTATION",
      description: "Detener dictado de voz",
    },
    {
      pattern: /volver/i,
      action: "GO_BACK",
      description: "Volver",
    },
    {
      pattern: /ayuda/i,
      action: "SHOW_HELP",
      description: "Mostrar ayuda de voz",
    },
  ],
};

const WAKE_WORDS: Record<VoiceCommandLanguage, string[]> = {
  en: ["hey locate", "ok locate", "locate"],
  fr: ["salut locate", "ok locate", "locate"],
  es: ["oye locate", "ok locate", "locate"],
};

export class VoiceCommandService {
  private recognition: SpeechRecognitionInstance | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private config: VoiceRecognitionConfig;
  private isListening = false;
  private isDictating = false;
  private dictationText = "";
  private onCommandCallback?: (result: VoiceCommandResult) => void;
  private onDictationCallback?: (text: string) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(config: Partial<VoiceRecognitionConfig> = {}) {
    this.config = {
      language: "en",
      continuous: true,
      interimResults: true,
      wakeWord: "locate",
      ...config,
    };
  }

  init(): boolean {
    if (typeof window === "undefined") return false;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("[VoiceCommands] Speech recognition not supported");
      return false;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.getLanguageCode(this.config.language);

    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);

    this.synthesis = window.speechSynthesis;

    console.log("[VoiceCommands] Initialized");
    return true;
  }

  private getLanguageCode(lang: VoiceCommandLanguage): string {
    const codes: Record<VoiceCommandLanguage, string> = {
      en: "en-US",
      fr: "fr-FR",
      es: "es-ES",
    };
    return codes[lang];
  }

  setLanguage(language: VoiceCommandLanguage) {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = this.getLanguageCode(language);
    }
  }

  start() {
    if (!this.recognition) {
      this.onErrorCallback?.("Voice recognition not initialized");
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      console.log("[VoiceCommands] Listening started");
    } catch (error) {
      this.onErrorCallback?.("Failed to start voice recognition");
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    this.recognition.stop();
    this.isListening = false;
    console.log("[VoiceCommands] Listening stopped");
  }

  startDictation() {
    this.isDictating = true;
    this.dictationText = "";
    console.log("[VoiceCommands] Dictation started");
  }

  stopDictation(): string {
    this.isDictating = false;
    const text = this.dictationText;
    this.dictationText = "";
    console.log("[VoiceCommands] Dictation stopped");
    return text;
  }

  speak(text: string, language?: VoiceCommandLanguage) {
    if (!this.synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getLanguageCode(language || this.config.language);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    this.synthesis.speak(utterance);
  }

  onCommand(callback: (result: VoiceCommandResult) => void) {
    this.onCommandCallback = callback;
  }

  onDictation(callback: (text: string) => void) {
    this.onDictationCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  getAvailableCommands(): VoiceCommand[] {
    return COMMAND_PATTERNS[this.config.language] || COMMAND_PATTERNS.en;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleResult(event: any) {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (!lastResult.isFinal) {
      if (this.isDictating) {
        this.onDictationCallback?.(lastResult[0].transcript);
      }
      return;
    }

    const transcript = lastResult[0].transcript.trim().toLowerCase();
    const confidence = lastResult[0].confidence;

    console.log(`[VoiceCommands] Heard: "${transcript}" (${confidence})`);

    if (this.isDictating) {
      this.dictationText += " " + transcript;
      this.onDictationCallback?.(this.dictationText.trim());
      return;
    }

    // Check for wake word if configured
    if (this.config.wakeWord) {
      const wakeWords = WAKE_WORDS[this.config.language];
      const hasWakeWord = wakeWords.some((word) => transcript.includes(word));

      if (!hasWakeWord) {
        return;
      }
    }

    const result = this.parseCommand(transcript, confidence);
    if (result.recognized) {
      this.onCommandCallback?.(result);
    }
  }

  private parseCommand(transcript: string, confidence: number): VoiceCommandResult {
    const patterns = COMMAND_PATTERNS[this.config.language] || COMMAND_PATTERNS.en;

    for (const command of patterns) {
      const match = transcript.match(command.pattern);
      if (match) {
        const params: Record<string, string> = {};

        if (command.params) {
          command.params.forEach((param, index) => {
            params[param] = match[index + 1] || "";
          });
        }

        return {
          recognized: true,
          command: transcript,
          action: command.action,
          params,
          confidence,
        };
      }
    }

    return {
      recognized: false,
      command: transcript,
      confidence,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(event: any) {
    console.error("[VoiceCommands] Error:", event.error);
    this.onErrorCallback?.(event.error);

    if (event.error === "not-allowed") {
      this.isListening = false;
    }
  }

  private handleEnd() {
    if (this.isListening && this.config.continuous) {
      // Restart if continuous mode
      try {
        this.recognition?.start();
      } catch {
        this.isListening = false;
      }
    }
  }
}

export const voiceCommands = new VoiceCommandService();
