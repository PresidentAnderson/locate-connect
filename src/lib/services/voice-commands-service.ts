/**
 * Multi-Language Voice Commands Service
 * Handles voice recognition and command execution in multiple languages
 */

import type {
  VoiceLanguage,
  VoiceCommand,
  VoiceCommandParameter,
  VoiceCommandResult,
} from "@/types/law-enforcement.types";

interface VoiceRecognitionConfig {
  language: VoiceLanguage;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

interface CommandMatch {
  command: VoiceCommand;
  confidence: number;
  parameters: Record<string, unknown>;
}

class VoiceCommandsService {
  private commands: VoiceCommand[] = [];
  private recognition: SpeechRecognition | null = null;
  private currentLanguage: VoiceLanguage = "en";
  private isListening = false;
  private onResultCallback: ((result: VoiceCommandResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor() {
    this.initializeCommands();
  }

  /**
   * Initialize built-in commands
   */
  private initializeCommands(): void {
    this.commands = [
      // Navigation commands
      {
        id: "nav_dashboard",
        phrases: {
          en: ["go to dashboard", "open dashboard", "show dashboard"],
          es: ["ir al panel", "abrir panel", "mostrar panel"],
          fr: ["aller au tableau de bord", "ouvrir tableau de bord"],
          de: ["gehe zum dashboard", "dashboard öffnen"],
          zh: ["打开仪表板", "显示仪表板"],
          ar: ["افتح لوحة القيادة", "اذهب إلى لوحة القيادة"],
        },
        action: "navigate",
        parameters: [{ name: "path", type: "string", required: true, extractionPatterns: { en: [], es: [], fr: [], de: [], zh: [], ar: [] } }],
        category: "navigation",
        requiresConfirmation: false,
      },
      {
        id: "nav_cases",
        phrases: {
          en: ["go to cases", "show cases", "open cases", "list cases"],
          es: ["ir a casos", "mostrar casos", "abrir casos"],
          fr: ["aller aux dossiers", "afficher les dossiers"],
          de: ["gehe zu fällen", "fälle anzeigen"],
          zh: ["查看案件", "打开案件"],
          ar: ["افتح القضايا", "عرض القضايا"],
        },
        action: "navigate",
        parameters: [{ name: "path", type: "string", required: true, extractionPatterns: { en: [], es: [], fr: [], de: [], zh: [], ar: [] } }],
        category: "navigation",
        requiresConfirmation: false,
      },
      {
        id: "nav_leads",
        phrases: {
          en: ["go to leads", "show leads", "open leads"],
          es: ["ir a pistas", "mostrar pistas"],
          fr: ["aller aux pistes", "afficher les pistes"],
          de: ["gehe zu hinweisen", "hinweise anzeigen"],
          zh: ["查看线索", "打开线索"],
          ar: ["افتح الخيوط", "عرض الخيوط"],
        },
        action: "navigate",
        parameters: [{ name: "path", type: "string", required: true, extractionPatterns: { en: [], es: [], fr: [], de: [], zh: [], ar: [] } }],
        category: "navigation",
        requiresConfirmation: false,
      },

      // Search commands
      {
        id: "search_case",
        phrases: {
          en: ["search for case", "find case", "look up case"],
          es: ["buscar caso", "encontrar caso"],
          fr: ["rechercher un dossier", "trouver un dossier"],
          de: ["fall suchen", "fall finden"],
          zh: ["搜索案件", "查找案件"],
          ar: ["البحث عن قضية", "إيجاد قضية"],
        },
        action: "search_case",
        parameters: [
          {
            name: "query",
            type: "string",
            required: true,
            extractionPatterns: {
              en: ["case (.+)", "for case (.+)", "case number (.+)"],
              es: ["caso (.+)", "número de caso (.+)"],
              fr: ["dossier (.+)", "numéro de dossier (.+)"],
              de: ["fall (.+)", "fallnummer (.+)"],
              zh: ["案件 (.+)", "案件号 (.+)"],
              ar: ["قضية (.+)", "رقم القضية (.+)"],
            },
          },
        ],
        category: "search",
        requiresConfirmation: false,
      },
      {
        id: "search_person",
        phrases: {
          en: ["search for person", "find person", "look up person"],
          es: ["buscar persona", "encontrar persona"],
          fr: ["rechercher une personne", "trouver une personne"],
          de: ["person suchen", "person finden"],
          zh: ["搜索人员", "查找人员"],
          ar: ["البحث عن شخص", "إيجاد شخص"],
        },
        action: "search_person",
        parameters: [
          {
            name: "name",
            type: "string",
            required: true,
            extractionPatterns: {
              en: ["person (.+)", "for (.+)", "named (.+)"],
              es: ["persona (.+)", "llamada (.+)"],
              fr: ["personne (.+)", "nommée (.+)"],
              de: ["person (.+)", "namens (.+)"],
              zh: ["人员 (.+)", "名字 (.+)"],
              ar: ["شخص (.+)", "اسمه (.+)"],
            },
          },
        ],
        category: "search",
        requiresConfirmation: false,
      },

      // Case commands
      {
        id: "create_case",
        phrases: {
          en: ["create new case", "new case", "start new case"],
          es: ["crear nuevo caso", "nuevo caso"],
          fr: ["créer un nouveau dossier", "nouveau dossier"],
          de: ["neuen fall erstellen", "neuer fall"],
          zh: ["创建新案件", "新案件"],
          ar: ["إنشاء قضية جديدة", "قضية جديدة"],
        },
        action: "create_case",
        parameters: [],
        category: "case",
        requiresConfirmation: true,
      },
      {
        id: "update_case_status",
        phrases: {
          en: ["update case status", "change case status", "set status to"],
          es: ["actualizar estado del caso", "cambiar estado"],
          fr: ["mettre à jour le statut", "changer le statut"],
          de: ["fallstatus aktualisieren", "status ändern"],
          zh: ["更新案件状态", "修改状态"],
          ar: ["تحديث حالة القضية", "تغيير الحالة"],
        },
        action: "update_case_status",
        parameters: [
          {
            name: "status",
            type: "enum",
            required: true,
            enumValues: ["active", "pending", "closed", "archived"],
            extractionPatterns: {
              en: ["status to (.+)", "to (.+)"],
              es: ["estado a (.+)", "a (.+)"],
              fr: ["statut à (.+)", "à (.+)"],
              de: ["status auf (.+)", "auf (.+)"],
              zh: ["状态为 (.+)", "为 (.+)"],
              ar: ["الحالة إلى (.+)", "إلى (.+)"],
            },
          },
        ],
        category: "case",
        requiresConfirmation: true,
      },

      // Lead commands
      {
        id: "add_lead",
        phrases: {
          en: ["add lead", "create lead", "new lead", "record lead"],
          es: ["agregar pista", "crear pista", "nueva pista"],
          fr: ["ajouter une piste", "créer une piste"],
          de: ["hinweis hinzufügen", "neuer hinweis"],
          zh: ["添加线索", "新线索"],
          ar: ["إضافة خيط", "خيط جديد"],
        },
        action: "add_lead",
        parameters: [],
        category: "lead",
        requiresConfirmation: false,
      },
      {
        id: "assign_lead",
        phrases: {
          en: ["assign lead to", "give lead to", "transfer lead to"],
          es: ["asignar pista a", "dar pista a"],
          fr: ["assigner la piste à", "donner la piste à"],
          de: ["hinweis zuweisen an", "hinweis übergeben an"],
          zh: ["分配线索给", "将线索给"],
          ar: ["تعيين الخيط إلى", "إعطاء الخيط إلى"],
        },
        action: "assign_lead",
        parameters: [
          {
            name: "assignee",
            type: "string",
            required: true,
            extractionPatterns: {
              en: ["to (.+)", "assign to (.+)"],
              es: ["a (.+)", "asignar a (.+)"],
              fr: ["à (.+)", "assigner à (.+)"],
              de: ["an (.+)", "zuweisen an (.+)"],
              zh: ["给 (.+)", "分配给 (.+)"],
              ar: ["إلى (.+)", "تعيين إلى (.+)"],
            },
          },
        ],
        category: "lead",
        requiresConfirmation: true,
      },

      // Alert commands
      {
        id: "create_alert",
        phrases: {
          en: ["create alert", "new alert", "set alert", "trigger alert"],
          es: ["crear alerta", "nueva alerta"],
          fr: ["créer une alerte", "nouvelle alerte"],
          de: ["alarm erstellen", "neuer alarm"],
          zh: ["创建警报", "新警报"],
          ar: ["إنشاء تنبيه", "تنبيه جديد"],
        },
        action: "create_alert",
        parameters: [
          {
            name: "type",
            type: "enum",
            required: false,
            enumValues: ["amber", "silver", "bolo", "critical"],
            extractionPatterns: {
              en: ["(.+) alert"],
              es: ["alerta (.+)"],
              fr: ["alerte (.+)"],
              de: ["(.+) alarm"],
              zh: ["(.+) 警报"],
              ar: ["تنبيه (.+)"],
            },
          },
        ],
        category: "alert",
        requiresConfirmation: true,
      },

      // Report commands
      {
        id: "generate_report",
        phrases: {
          en: ["generate report", "create report", "run report"],
          es: ["generar informe", "crear informe"],
          fr: ["générer un rapport", "créer un rapport"],
          de: ["bericht erstellen", "report generieren"],
          zh: ["生成报告", "创建报告"],
          ar: ["إنشاء تقرير", "توليد تقرير"],
        },
        action: "generate_report",
        parameters: [
          {
            name: "type",
            type: "enum",
            required: false,
            enumValues: ["daily", "weekly", "monthly", "case"],
            extractionPatterns: {
              en: ["(.+) report"],
              es: ["informe (.+)"],
              fr: ["rapport (.+)"],
              de: ["(.+) bericht"],
              zh: ["(.+) 报告"],
              ar: ["تقرير (.+)"],
            },
          },
        ],
        category: "report",
        requiresConfirmation: false,
      },

      // Voice memo command
      {
        id: "start_voice_memo",
        phrases: {
          en: ["start recording", "record memo", "voice memo", "start memo"],
          es: ["empezar grabación", "grabar nota", "nota de voz"],
          fr: ["commencer l'enregistrement", "enregistrer mémo"],
          de: ["aufnahme starten", "memo aufnehmen"],
          zh: ["开始录音", "录制备忘录"],
          ar: ["بدء التسجيل", "تسجيل مذكرة"],
        },
        action: "start_voice_memo",
        parameters: [],
        category: "case",
        requiresConfirmation: false,
      },
      {
        id: "stop_voice_memo",
        phrases: {
          en: ["stop recording", "end recording", "finish memo", "stop memo"],
          es: ["detener grabación", "terminar grabación"],
          fr: ["arrêter l'enregistrement", "terminer l'enregistrement"],
          de: ["aufnahme stoppen", "aufnahme beenden"],
          zh: ["停止录音", "结束录音"],
          ar: ["إيقاف التسجيل", "إنهاء التسجيل"],
        },
        action: "stop_voice_memo",
        parameters: [],
        category: "case",
        requiresConfirmation: false,
      },
    ];
  }

  /**
   * Set the active language
   */
  setLanguage(language: VoiceLanguage): void {
    this.currentLanguage = language;
    if (this.recognition) {
      this.recognition.lang = this.getLocaleCode(language);
    }
  }

  /**
   * Get browser locale code for language
   */
  private getLocaleCode(language: VoiceLanguage): string {
    const locales: Record<VoiceLanguage, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      zh: "zh-CN",
      ar: "ar-SA",
    };
    return locales[language];
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  }

  /**
   * Start listening for voice commands
   */
  startListening(
    onResult: (result: VoiceCommandResult) => void,
    onError?: (error: Error) => void
  ): boolean {
    if (!this.isSupported()) {
      onError?.(new Error("Speech recognition not supported"));
      return false;
    }

    if (this.isListening) {
      return true;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.lang = this.getLocaleCode(this.currentLanguage);
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;

    this.onResultCallback = onResult;
    this.onErrorCallback = onError || null;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      const confidence = event.results[last][0].confidence;

      this.processTranscript(transcript, confidence);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.onErrorCallback?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Restart if still supposed to be listening
        this.recognition?.start();
      }
    };

    this.recognition.start();
    this.isListening = true;
    console.log(`[VoiceCommands] Started listening in ${this.currentLanguage}`);
    return true;
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.isListening = false;
    this.recognition?.stop();
    this.recognition = null;
    console.log("[VoiceCommands] Stopped listening");
  }

  /**
   * Process voice transcript
   */
  private processTranscript(transcript: string, confidence: number): void {
    console.log(`[VoiceCommands] Heard: "${transcript}" (${Math.round(confidence * 100)}%)`);

    const match = this.findBestMatch(transcript);

    if (match && match.confidence > 0.5) {
      const result: VoiceCommandResult = {
        success: true,
        command: transcript,
        action: match.command.action,
        parameters: match.parameters,
        response: this.getResponse(match.command, this.currentLanguage),
        timestamp: new Date().toISOString(),
      };

      this.onResultCallback?.(result);
    } else {
      const result: VoiceCommandResult = {
        success: false,
        command: transcript,
        action: "unknown",
        parameters: {},
        response: this.getUnknownCommandResponse(this.currentLanguage),
        timestamp: new Date().toISOString(),
      };

      this.onResultCallback?.(result);
    }
  }

  /**
   * Find the best matching command
   */
  private findBestMatch(transcript: string): CommandMatch | null {
    let bestMatch: CommandMatch | null = null;
    let bestScore = 0;

    for (const command of this.commands) {
      const phrases = command.phrases[this.currentLanguage] || [];

      for (const phrase of phrases) {
        const score = this.calculateSimilarity(transcript, phrase);

        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = {
            command,
            confidence: score,
            parameters: this.extractParameters(transcript, command),
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(a: string, b: string): number {
    const aWords = a.toLowerCase().split(/\s+/);
    const bWords = b.toLowerCase().split(/\s+/);

    // Check for phrase containment
    if (a.includes(b) || b.includes(a)) {
      return 0.9;
    }

    // Word overlap score
    const overlap = aWords.filter((w) => bWords.includes(w)).length;
    const maxLen = Math.max(aWords.length, bWords.length);

    return overlap / maxLen;
  }

  /**
   * Extract parameters from transcript
   */
  private extractParameters(
    transcript: string,
    command: VoiceCommand
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (!command.parameters) return params;

    for (const param of command.parameters) {
      const patterns = param.extractionPatterns[this.currentLanguage] || [];

      for (const pattern of patterns) {
        const regex = new RegExp(pattern, "i");
        const match = transcript.match(regex);

        if (match && match[1]) {
          let value: unknown = match[1].trim();

          // Type conversion
          if (param.type === "number") {
            value = parseFloat(value as string);
          } else if (param.type === "boolean") {
            value = ["yes", "true", "si", "oui", "ja"].includes(
              (value as string).toLowerCase()
            );
          } else if (param.type === "enum" && param.enumValues) {
            // Find closest enum match
            const enumMatch = param.enumValues.find((e) =>
              (value as string).toLowerCase().includes(e.toLowerCase())
            );
            value = enumMatch || value;
          }

          params[param.name] = value;
          break;
        }
      }
    }

    return params;
  }

  /**
   * Get response message for command
   */
  private getResponse(command: VoiceCommand, language: VoiceLanguage): string {
    const responses: Record<VoiceLanguage, string> = {
      en: `Executing: ${command.id.replace(/_/g, " ")}`,
      es: `Ejecutando: ${command.id.replace(/_/g, " ")}`,
      fr: `Exécution: ${command.id.replace(/_/g, " ")}`,
      de: `Ausführen: ${command.id.replace(/_/g, " ")}`,
      zh: `执行: ${command.id.replace(/_/g, " ")}`,
      ar: `تنفيذ: ${command.id.replace(/_/g, " ")}`,
    };
    return responses[language];
  }

  /**
   * Get unknown command response
   */
  private getUnknownCommandResponse(language: VoiceLanguage): string {
    const responses: Record<VoiceLanguage, string> = {
      en: "Sorry, I didn't understand that command.",
      es: "Lo siento, no entendí ese comando.",
      fr: "Désolé, je n'ai pas compris cette commande.",
      de: "Entschuldigung, ich habe diesen Befehl nicht verstanden.",
      zh: "抱歉，我没有理解这个命令。",
      ar: "عذراً، لم أفهم هذا الأمر.",
    };
    return responses[language];
  }

  /**
   * Get available commands for current language
   */
  getAvailableCommands(): Array<{
    id: string;
    phrases: string[];
    category: string;
  }> {
    return this.commands.map((cmd) => ({
      id: cmd.id,
      phrases: cmd.phrases[this.currentLanguage] || [],
      category: cmd.category,
    }));
  }

  /**
   * Add custom command
   */
  addCommand(command: VoiceCommand): void {
    this.commands.push(command);
  }

  /**
   * Remove command by ID
   */
  removeCommand(commandId: string): void {
    this.commands = this.commands.filter((c) => c.id !== commandId);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): VoiceLanguage[] {
    return ["en", "es", "fr", "de", "zh", "ar"];
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): VoiceLanguage {
    return this.currentLanguage;
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }
}

export const voiceCommandsService = new VoiceCommandsService();

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
