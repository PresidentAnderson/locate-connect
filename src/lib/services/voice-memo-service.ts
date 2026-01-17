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
   * Queue memo for transcription
   */
  private queueTranscription(memoId: string): void {
    const memo = this.memos.get(memoId);
    if (!memo) return;

    memo.transcriptionStatus = "processing";
    this.memos.set(memoId, memo);

    // Simulate transcription (would use Whisper API or similar)
    setTimeout(async () => {
      await this.setTranscription(
        memoId,
        "[Transcription would appear here after processing]"
      );
    }, 5000);

    console.log(`[VoiceMemoService] Queued transcription for memo ${memoId}`);
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
