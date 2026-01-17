/**
 * Anonymous Tips Service
 * Secure anonymous tip submission and management
 */

import type { AnonymousTip, SupportedLanguage } from "@/types/compliance.types";

class AnonymousTipsService {
  private tips: Map<string, AnonymousTip> = new Map();
  private tipCodeIndex: Map<string, string> = new Map(); // tipCode -> tipId

  /**
   * Generate a unique tip code
   */
  private generateTipCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Submit an anonymous tip
   */
  async submitTip(input: {
    caseNumber?: string;
    description: string;
    location?: AnonymousTip["location"];
    sightingDate?: string;
    sightingTime?: string;
    personDescription?: string;
    vehicleDescription?: string;
    companionDescription?: string;
    attachments?: AnonymousTip["attachments"];
    language: SupportedLanguage;
    source: "web" | "phone" | "app";
  }): Promise<{ tipId: string; tipCode: string }> {
    const id = crypto.randomUUID();
    const tipCode = this.generateTipCode();

    // Auto-assign priority based on content
    const priority = this.calculatePriority(input);

    const tip: AnonymousTip = {
      id,
      tipCode,
      caseNumber: input.caseNumber,
      description: input.description,
      location: input.location,
      sightingDate: input.sightingDate,
      sightingTime: input.sightingTime,
      personDescription: input.personDescription,
      vehicleDescription: input.vehicleDescription,
      companionDescription: input.companionDescription,
      attachments: input.attachments || [],
      status: "new",
      priority,
      submittedAt: new Date().toISOString(),
      language: input.language,
      source: input.source,
    };

    this.tips.set(id, tip);
    this.tipCodeIndex.set(tipCode, id);

    console.log(`[AnonymousTips] Tip submitted: ${tipCode}`);

    // Auto-escalate critical tips
    if (priority === "critical") {
      await this.escalateTip(id);
    }

    return { tipId: id, tipCode };
  }

  /**
   * Get tip by code (for anonymous follow-up)
   */
  async getTipByCode(tipCode: string): Promise<{
    status: AnonymousTip["status"];
    submittedAt: string;
    hasUpdate: boolean;
  } | null> {
    const tipId = this.tipCodeIndex.get(tipCode.toUpperCase());
    if (!tipId) return null;

    const tip = this.tips.get(tipId);
    if (!tip) return null;

    // Don't return full tip details for security
    return {
      status: tip.status,
      submittedAt: tip.submittedAt,
      hasUpdate: tip.status !== "new",
    };
  }

  /**
   * Get tip by ID (internal use)
   */
  getTip(tipId: string): AnonymousTip | null {
    return this.tips.get(tipId) || null;
  }

  /**
   * List tips with filters (internal use)
   */
  listTips(filters?: {
    status?: AnonymousTip["status"];
    priority?: AnonymousTip["priority"];
    caseNumber?: string;
    dateFrom?: string;
    dateTo?: string;
  }): AnonymousTip[] {
    let tips = Array.from(this.tips.values());

    if (filters?.status) {
      tips = tips.filter((t) => t.status === filters.status);
    }

    if (filters?.priority) {
      tips = tips.filter((t) => t.priority === filters.priority);
    }

    if (filters?.caseNumber) {
      tips = tips.filter((t) => t.caseNumber === filters.caseNumber);
    }

    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      tips = tips.filter((t) => new Date(t.submittedAt) >= from);
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      tips = tips.filter((t) => new Date(t.submittedAt) <= to);
    }

    // Sort by priority and date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return tips.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  }

  /**
   * Update tip status
   */
  async updateStatus(
    tipId: string,
    status: AnonymousTip["status"]
  ): Promise<AnonymousTip | null> {
    const tip = this.tips.get(tipId);
    if (!tip) return null;

    tip.status = status;
    this.tips.set(tipId, tip);

    console.log(`[AnonymousTips] Tip ${tip.tipCode} status updated to ${status}`);
    return tip;
  }

  /**
   * Update tip priority
   */
  async updatePriority(
    tipId: string,
    priority: AnonymousTip["priority"]
  ): Promise<AnonymousTip | null> {
    const tip = this.tips.get(tipId);
    if (!tip) return null;

    tip.priority = priority;
    this.tips.set(tipId, tip);

    if (priority === "critical") {
      await this.escalateTip(tipId);
    }

    return tip;
  }

  /**
   * Link tip to case
   */
  async linkToCase(tipId: string, caseNumber: string): Promise<boolean> {
    const tip = this.tips.get(tipId);
    if (!tip) return false;

    tip.caseNumber = caseNumber;
    this.tips.set(tipId, tip);

    console.log(`[AnonymousTips] Tip ${tip.tipCode} linked to case ${caseNumber}`);
    return true;
  }

  /**
   * Calculate priority based on tip content
   */
  private calculatePriority(input: {
    description: string;
    sightingDate?: string;
    location?: AnonymousTip["location"];
  }): AnonymousTip["priority"] {
    const desc = input.description.toLowerCase();

    // Critical keywords
    if (
      desc.includes("danger") ||
      desc.includes("urgent") ||
      desc.includes("emergency") ||
      desc.includes("abduct") ||
      desc.includes("kidnap") ||
      desc.includes("weapon")
    ) {
      return "critical";
    }

    // High priority: recent sighting with location
    if (input.sightingDate && input.location) {
      const sightingTime = new Date(input.sightingDate);
      const hoursSince = (Date.now() - sightingTime.getTime()) / (1000 * 60 * 60);

      if (hoursSince <= 24) return "high";
      if (hoursSince <= 72) return "medium";
    }

    // Medium if has location
    if (input.location?.coordinates) {
      return "medium";
    }

    return "low";
  }

  /**
   * Escalate critical tip
   */
  private async escalateTip(tipId: string): Promise<void> {
    const tip = this.tips.get(tipId);
    if (!tip) return;

    console.log(`[AnonymousTips] CRITICAL TIP ESCALATED: ${tip.tipCode}`);
    // Would notify on-call staff, law enforcement, etc.
  }

  /**
   * Get tip statistics
   */
  getStatistics(): {
    total: number;
    byStatus: Record<AnonymousTip["status"], number>;
    byPriority: Record<AnonymousTip["priority"], number>;
    last24Hours: number;
    last7Days: number;
  } {
    const tips = Array.from(this.tips.values());
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const byStatus: Record<AnonymousTip["status"], number> = {
      new: 0,
      reviewing: 0,
      verified: 0,
      actionable: 0,
      closed: 0,
    };

    const byPriority: Record<AnonymousTip["priority"], number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let last24Hours = 0;
    let last7Days = 0;

    for (const tip of tips) {
      byStatus[tip.status]++;
      byPriority[tip.priority]++;

      const tipTime = new Date(tip.submittedAt).getTime();
      if (now - tipTime <= day) last24Hours++;
      if (now - tipTime <= 7 * day) last7Days++;
    }

    return {
      total: tips.length,
      byStatus,
      byPriority,
      last24Hours,
      last7Days,
    };
  }

  /**
   * Add follow-up information to tip (via tip code)
   */
  async addFollowUp(
    tipCode: string,
    additionalInfo: string
  ): Promise<boolean> {
    const tipId = this.tipCodeIndex.get(tipCode.toUpperCase());
    if (!tipId) return false;

    const tip = this.tips.get(tipId);
    if (!tip) return false;

    // Append to description
    tip.description += `\n\n[Follow-up ${new Date().toISOString()}]: ${additionalInfo}`;
    this.tips.set(tipId, tip);

    console.log(`[AnonymousTips] Follow-up added to tip ${tipCode}`);
    return true;
  }
}

export const anonymousTipsService = new AnonymousTipsService();
