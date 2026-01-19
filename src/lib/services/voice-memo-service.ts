/**
 * Voice Memo Service
 * Handles voice recordings, transcription, and evidence chain management
 */

import type {
  VoiceMemo,
  EvidenceChainEntry,
} from "@/types/law-enforcement.types";

export interface CreateVoiceMemoInput {
  caseId: string;
  leadId?: string;
  title: string;
  audioBlob?: Blob;
  audioUrl?: string;
  duration: number;
  tags?: string[];
  isEvidence?: boolean;
}

export interface VoiceMemoFilters {
  caseId?: string;
  leadId?: string;
  isEvidence?: boolean;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

class VoiceMemoService {
  private memos: Map<string, VoiceMemo> = new Map();

  /**
   * Create a new voice memo
   */
  async createVoiceMemo(
    input: CreateVoiceMemoInput,
    userId: string
  ): Promise<VoiceMemo> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Calculate hash for evidence chain
    const hash = await this.calculateHash(input.audioUrl || "");

    const memo: VoiceMemo = {
      id,
      caseId: input.caseId,
      leadId: input.leadId,
      title: input.title,
      audioUrl: input.audioUrl || "",
      duration: input.duration,
      transcriptionStatus: "pending",
      recordedBy: userId,
      recordedAt: now,
      tags: input.tags || [],
      isEvidence: input.isEvidence || false,
      evidenceChain: input.isEvidence
        ? [
            {
              id: crypto.randomUUID(),
              action: "created",
              userId,
              userName: "",
              timestamp: now,
              notes: "Voice memo recorded and stored",
              hash,
            },
          ]
        : undefined,
    };

    this.memos.set(id, memo);

    // Queue for transcription
    if (memo.audioUrl) {
      this.queueTranscription(id);
    }

    console.log(`[VoiceMemoService] Created memo ${id} for case ${input.caseId}`);
    return memo;
  }

  /**
   * Get voice memo by ID
   */
  async getVoiceMemo(memoId: string, userId?: string): Promise<VoiceMemo | null> {
    const memo = this.memos.get(memoId);
    if (!memo) return null;

    // Log access for evidence items
    if (memo.isEvidence && userId && memo.evidenceChain) {
      memo.evidenceChain.push({
        id: crypto.randomUUID(),
        action: "accessed",
        userId,
        userName: "",
        timestamp: new Date().toISOString(),
      });
      this.memos.set(memoId, memo);
    }

    return memo;
  }

  /**
   * List voice memos with filters
   */
  async listVoiceMemos(filters: VoiceMemoFilters): Promise<VoiceMemo[]> {
    let memos = Array.from(this.memos.values());

    if (filters.caseId) {
      memos = memos.filter((m) => m.caseId === filters.caseId);
    }

    if (filters.leadId) {
      memos = memos.filter((m) => m.leadId === filters.leadId);
    }

    if (filters.isEvidence !== undefined) {
      memos = memos.filter((m) => m.isEvidence === filters.isEvidence);
    }

    if (filters.tags && filters.tags.length > 0) {
      memos = memos.filter((m) =>
        filters.tags!.some((tag) => m.tags.includes(tag))
      );
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      memos = memos.filter((m) => new Date(m.recordedAt) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      memos = memos.filter((m) => new Date(m.recordedAt) <= to);
    }

    // Sort by date descending
    memos.sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    return memos;
  }

  /**
   * Update voice memo
   */
  async updateVoiceMemo(
    memoId: string,
    updates: { title?: string; tags?: string[]; isEvidence?: boolean },
    userId: string
  ): Promise<VoiceMemo | null> {
    const memo = this.memos.get(memoId);
    if (!memo) return null;

    const now = new Date().toISOString();

    if (updates.title) memo.title = updates.title;
    if (updates.tags) memo.tags = updates.tags;

    // Handle evidence status change
    if (updates.isEvidence !== undefined && updates.isEvidence !== memo.isEvidence) {
      memo.isEvidence = updates.isEvidence;

      if (updates.isEvidence) {
        // Initialize evidence chain
        memo.evidenceChain = [
          {
            id: crypto.randomUUID(),
            action: "modified",
            userId,
            userName: "",
            timestamp: now,
            notes: "Marked as evidence",
            hash: await this.calculateHash(memo.audioUrl),
          },
        ];
      }
    }

    // Log modification in evidence chain
    if (memo.isEvidence && memo.evidenceChain) {
      memo.evidenceChain.push({
        id: crypto.randomUUID(),
        action: "modified",
        userId,
        userName: "",
        timestamp: now,
        notes: `Memo updated: ${Object.keys(updates).join(", ")}`,
      });
    }

    this.memos.set(memoId, memo);
    return memo;
  }

  /**
   * Delete voice memo
   */
  async deleteVoiceMemo(memoId: string): Promise<boolean> {
    const memo = this.memos.get(memoId);
    if (!memo) return false;

    // Don't allow deleting evidence
    if (memo.isEvidence) {
      throw new Error("Cannot delete evidence items");
    }

    this.memos.delete(memoId);
    return true;
  }

  /**
   * Set transcription result
   */
  async setTranscription(
    memoId: string,
    transcription: string
  ): Promise<boolean> {
    const memo = this.memos.get(memoId);
    if (!memo) return false;

    memo.transcription = transcription;
    memo.transcriptionStatus = "completed";

    this.memos.set(memoId, memo);
    console.log(`[VoiceMemoService] Transcription completed for memo ${memoId}`);
    return true;
  }

  /**
   * Get evidence chain for a memo
   */
  async getEvidenceChain(memoId: string): Promise<EvidenceChainEntry[]> {
    const memo = this.memos.get(memoId);
    if (!memo || !memo.evidenceChain) return [];
    return memo.evidenceChain;
  }

  /**
   * Transfer evidence custody
   */
  async transferCustody(
    memoId: string,
    toUserId: string,
    fromUserId: string,
    notes?: string
  ): Promise<boolean> {
    const memo = this.memos.get(memoId);
    if (!memo || !memo.isEvidence || !memo.evidenceChain) return false;

    memo.evidenceChain.push({
      id: crypto.randomUUID(),
      action: "transferred",
      userId: fromUserId,
      userName: "",
      timestamp: new Date().toISOString(),
      notes: notes || `Custody transferred to user ${toUserId}`,
    });

    this.memos.set(memoId, memo);
    return true;
  }

  /**
   * Queue memo for transcription using OpenAI Whisper API
   */
  private queueTranscription(memoId: string): void {
    const memo = this.memos.get(memoId);
    if (!memo) return;

    memo.transcriptionStatus = "processing";
    this.memos.set(memoId, memo);

    // Process transcription asynchronously
    this.processTranscription(memoId).catch((error) => {
      console.error(`[VoiceMemoService] Transcription failed for memo ${memoId}:`, error);
      const failedMemo = this.memos.get(memoId);
      if (failedMemo) {
        failedMemo.transcriptionStatus = "failed";
        this.memos.set(memoId, failedMemo);
      }
    });

    console.log(`[VoiceMemoService] Queued transcription for memo ${memoId}`);
  }

  /**
   * Process transcription using OpenAI Whisper API or fallback services
   */
  private async processTranscription(memoId: string): Promise<void> {
    const memo = this.memos.get(memoId);
    if (!memo || !memo.audioUrl) {
      throw new Error("Memo not found or no audio URL");
    }

    // Try OpenAI Whisper API first
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      const transcription = await this.transcribeWithWhisper(memo.audioUrl, openaiApiKey);
      if (transcription) {
        await this.setTranscription(memoId, transcription);
        return;
      }
    }

    // Try Deepgram as fallback
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramApiKey) {
      const transcription = await this.transcribeWithDeepgram(memo.audioUrl, deepgramApiKey);
      if (transcription) {
        await this.setTranscription(memoId, transcription);
        return;
      }
    }

    // Try AssemblyAI as another fallback
    const assemblyApiKey = process.env.ASSEMBLYAI_API_KEY;
    if (assemblyApiKey) {
      const transcription = await this.transcribeWithAssemblyAI(memo.audioUrl, assemblyApiKey);
      if (transcription) {
        await this.setTranscription(memoId, transcription);
        return;
      }
    }

    // No transcription service configured
    console.warn("[VoiceMemoService] No transcription service configured");
    await this.setTranscription(
      memoId,
      "[Transcription service not configured. Please set OPENAI_API_KEY, DEEPGRAM_API_KEY, or ASSEMBLYAI_API_KEY]"
    );
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  private async transcribeWithWhisper(audioUrl: string, apiKey: string): Promise<string | null> {
    try {
      console.log("[VoiceMemoService] Transcribing with OpenAI Whisper");

      // Fetch the audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }

      const audioBlob = await audioResponse.blob();

      // Create form data for Whisper API
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");
      formData.append("language", "en"); // Can be made configurable
      formData.append("response_format", "text");

      // Call Whisper API
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("[VoiceMemoService] Whisper API error:", error);
        return null;
      }

      const transcription = await response.text();
      console.log("[VoiceMemoService] Whisper transcription complete");
      return transcription.trim();
    } catch (error) {
      console.error("[VoiceMemoService] Whisper transcription error:", error);
      return null;
    }
  }

  /**
   * Transcribe audio using Deepgram API
   */
  private async transcribeWithDeepgram(audioUrl: string, apiKey: string): Promise<string | null> {
    try {
      console.log("[VoiceMemoService] Transcribing with Deepgram");

      // Fetch the audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }

      const audioBuffer = await audioResponse.arrayBuffer();

      // Call Deepgram API
      const response = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "audio/webm",
          },
          body: audioBuffer,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("[VoiceMemoService] Deepgram API error:", error);
        return null;
      }

      const result = (await response.json()) as {
        results?: {
          channels?: Array<{
            alternatives?: Array<{ transcript?: string }>;
          }>;
        };
      };

      const transcription = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      if (transcription) {
        console.log("[VoiceMemoService] Deepgram transcription complete");
        return transcription;
      }

      return null;
    } catch (error) {
      console.error("[VoiceMemoService] Deepgram transcription error:", error);
      return null;
    }
  }

  /**
   * Transcribe audio using AssemblyAI API
   */
  private async transcribeWithAssemblyAI(audioUrl: string, apiKey: string): Promise<string | null> {
    try {
      console.log("[VoiceMemoService] Transcribing with AssemblyAI");

      // Step 1: Submit transcription request
      const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: "en",
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.text();
        console.error("[VoiceMemoService] AssemblyAI submit error:", error);
        return null;
      }

      const submitResult = (await submitResponse.json()) as { id: string };
      const transcriptId = submitResult.id;

      // Step 2: Poll for completion (max 5 minutes)
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const pollResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
          {
            headers: {
              Authorization: apiKey,
            },
          }
        );

        if (!pollResponse.ok) continue;

        const pollResult = (await pollResponse.json()) as {
          status: string;
          text?: string;
          error?: string;
        };

        if (pollResult.status === "completed" && pollResult.text) {
          console.log("[VoiceMemoService] AssemblyAI transcription complete");
          return pollResult.text;
        }

        if (pollResult.status === "error") {
          console.error("[VoiceMemoService] AssemblyAI error:", pollResult.error);
          return null;
        }
      }

      console.error("[VoiceMemoService] AssemblyAI transcription timed out");
      return null;
    } catch (error) {
      console.error("[VoiceMemoService] AssemblyAI transcription error:", error);
      return null;
    }
  }

  /**
   * Calculate hash for evidence integrity
   */
  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Record audio (browser API wrapper)
   */
  createRecorder(): {
    start: () => Promise<void>;
    stop: () => Promise<{ blob: Blob; duration: number }>;
    getState: () => "inactive" | "recording" | "paused";
  } {
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let startTime: number = 0;

    return {
      start: async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];
        startTime = Date.now();

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.start();
      },

      stop: () => {
        return new Promise((resolve) => {
          if (!mediaRecorder) {
            resolve({ blob: new Blob(), duration: 0 });
            return;
          }

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            const duration = Math.floor((Date.now() - startTime) / 1000);
            resolve({ blob, duration });
          };

          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        });
      },

      getState: () => {
        return mediaRecorder?.state || "inactive";
      },
    };
  }
}

export const voiceMemoService = new VoiceMemoService();
