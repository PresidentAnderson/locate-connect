/**
 * Shift Handoff Service
 * Manages law enforcement shift transitions and case continuity
 */

import type {
  ShiftHandoff,
  CaseHandoffSummary,
  HandoffActionItem,
} from "@/types/law-enforcement.types";

export interface CreateHandoffInput {
  toOfficerId: string;
  toOfficerName: string;
  shiftDate: string;
  shiftType: "day" | "evening" | "night";
  caseSummaries: CaseHandoffSummary[];
  actionItems?: Omit<HandoffActionItem, "id" | "completed" | "completedAt" | "completedBy">[];
  generalNotes: string;
  urgentNotes?: string;
}

export interface HandoffFilters {
  fromOfficerId?: string;
  toOfficerId?: string;
  shiftDate?: string;
  shiftType?: "day" | "evening" | "night";
  status?: ShiftHandoff["status"];
}

class ShiftHandoffService {
  private handoffs: Map<string, ShiftHandoff> = new Map();

  /**
   * Create a new shift handoff
   */
  async createHandoff(
    input: CreateHandoffInput,
    fromOfficerId: string,
    fromOfficerName: string
  ): Promise<ShiftHandoff> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const actionItems: HandoffActionItem[] = (input.actionItems || []).map(
      (item) => ({
        ...item,
        id: crypto.randomUUID(),
        completed: false,
      })
    );

    const handoff: ShiftHandoff = {
      id,
      fromOfficerId,
      fromOfficerName,
      toOfficerId: input.toOfficerId,
      toOfficerName: input.toOfficerName,
      shiftDate: input.shiftDate,
      shiftType: input.shiftType,
      status: "draft",
      caseSummaries: input.caseSummaries,
      actionItems,
      generalNotes: input.generalNotes,
      urgentNotes: input.urgentNotes,
      createdAt: now,
    };

    this.handoffs.set(id, handoff);
    console.log(`[ShiftHandoffService] Created handoff ${id}`);
    return handoff;
  }

  /**
   * Get handoff by ID
   */
  async getHandoff(handoffId: string): Promise<ShiftHandoff | null> {
    return this.handoffs.get(handoffId) || null;
  }

  /**
   * List handoffs with filters
   */
  async listHandoffs(filters: HandoffFilters): Promise<ShiftHandoff[]> {
    let handoffs = Array.from(this.handoffs.values());

    if (filters.fromOfficerId) {
      handoffs = handoffs.filter(
        (h) => h.fromOfficerId === filters.fromOfficerId
      );
    }

    if (filters.toOfficerId) {
      handoffs = handoffs.filter((h) => h.toOfficerId === filters.toOfficerId);
    }

    if (filters.shiftDate) {
      handoffs = handoffs.filter((h) => h.shiftDate === filters.shiftDate);
    }

    if (filters.shiftType) {
      handoffs = handoffs.filter((h) => h.shiftType === filters.shiftType);
    }

    if (filters.status) {
      handoffs = handoffs.filter((h) => h.status === filters.status);
    }

    return handoffs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update handoff
   */
  async updateHandoff(
    handoffId: string,
    updates: Partial<
      Pick<
        ShiftHandoff,
        "caseSummaries" | "actionItems" | "generalNotes" | "urgentNotes"
      >
    >
  ): Promise<ShiftHandoff | null> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return null;

    if (handoff.status !== "draft") {
      throw new Error("Can only update draft handoffs");
    }

    Object.assign(handoff, updates);
    this.handoffs.set(handoffId, handoff);
    return handoff;
  }

  /**
   * Add case summary to handoff
   */
  async addCaseSummary(
    handoffId: string,
    summary: CaseHandoffSummary
  ): Promise<boolean> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff || handoff.status !== "draft") return false;

    // Remove existing summary for same case
    handoff.caseSummaries = handoff.caseSummaries.filter(
      (s) => s.caseId !== summary.caseId
    );
    handoff.caseSummaries.push(summary);

    // Sort by priority
    handoff.caseSummaries.sort((a, b) => a.priority - b.priority);

    this.handoffs.set(handoffId, handoff);
    return true;
  }

  /**
   * Add action item to handoff
   */
  async addActionItem(
    handoffId: string,
    item: Omit<HandoffActionItem, "id" | "completed" | "completedAt" | "completedBy">
  ): Promise<HandoffActionItem | null> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return null;

    const actionItem: HandoffActionItem = {
      ...item,
      id: crypto.randomUUID(),
      completed: false,
    };

    handoff.actionItems.push(actionItem);
    this.handoffs.set(handoffId, handoff);
    return actionItem;
  }

  /**
   * Complete action item
   */
  async completeActionItem(
    handoffId: string,
    itemId: string,
    userId: string
  ): Promise<boolean> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return false;

    const item = handoff.actionItems.find((i) => i.id === itemId);
    if (!item) return false;

    item.completed = true;
    item.completedAt = new Date().toISOString();
    item.completedBy = userId;

    this.handoffs.set(handoffId, handoff);
    return true;
  }

  /**
   * Submit handoff for acknowledgment
   */
  async submitHandoff(handoffId: string): Promise<ShiftHandoff | null> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return null;

    if (handoff.status !== "draft") {
      throw new Error("Handoff already submitted");
    }

    if (handoff.caseSummaries.length === 0) {
      throw new Error("Handoff must have at least one case summary");
    }

    handoff.status = "submitted";
    handoff.submittedAt = new Date().toISOString();

    this.handoffs.set(handoffId, handoff);

    // Notify incoming officer
    await this.notifyIncomingOfficer(handoff);

    console.log(`[ShiftHandoffService] Submitted handoff ${handoffId}`);
    return handoff;
  }

  /**
   * Acknowledge handoff
   */
  async acknowledgeHandoff(
    handoffId: string,
    officerId: string
  ): Promise<ShiftHandoff | null> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) return null;

    if (handoff.status !== "submitted") {
      throw new Error("Handoff not submitted");
    }

    if (handoff.toOfficerId !== officerId) {
      throw new Error("Only the assigned officer can acknowledge");
    }

    handoff.status = "acknowledged";
    handoff.acknowledgedAt = new Date().toISOString();

    this.handoffs.set(handoffId, handoff);
    console.log(`[ShiftHandoffService] Acknowledged handoff ${handoffId}`);
    return handoff;
  }

  /**
   * Get pending handoffs for an officer
   */
  async getPendingHandoffs(officerId: string): Promise<ShiftHandoff[]> {
    return Array.from(this.handoffs.values()).filter(
      (h) => h.toOfficerId === officerId && h.status === "submitted"
    );
  }

  /**
   * Get incomplete action items for an officer
   */
  async getIncompleteActionItems(
    officerId: string
  ): Promise<Array<{ handoff: ShiftHandoff; item: HandoffActionItem }>> {
    const results: Array<{ handoff: ShiftHandoff; item: HandoffActionItem }> =
      [];

    for (const handoff of this.handoffs.values()) {
      if (
        handoff.toOfficerId === officerId &&
        handoff.status === "acknowledged"
      ) {
        for (const item of handoff.actionItems) {
          if (!item.completed) {
            results.push({ handoff, item });
          }
        }
      }
    }

    // Sort by due date and priority
    return results.sort((a, b) => {
      if (a.item.dueBy && b.item.dueBy) {
        return (
          new Date(a.item.dueBy).getTime() - new Date(b.item.dueBy).getTime()
        );
      }
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.item.priority] - priorityOrder[b.item.priority];
    });
  }

  /**
   * Generate handoff report
   */
  async generateReport(handoffId: string): Promise<string> {
    const handoff = this.handoffs.get(handoffId);
    if (!handoff) throw new Error("Handoff not found");

    let report = `# SHIFT HANDOFF REPORT\n\n`;
    report += `**Date:** ${handoff.shiftDate}\n`;
    report += `**Shift:** ${handoff.shiftType}\n`;
    report += `**From:** ${handoff.fromOfficerName}\n`;
    report += `**To:** ${handoff.toOfficerName}\n`;
    report += `**Status:** ${handoff.status}\n\n`;

    if (handoff.urgentNotes) {
      report += `## ⚠️ URGENT NOTES\n\n${handoff.urgentNotes}\n\n`;
    }

    report += `## Case Summaries\n\n`;
    for (const summary of handoff.caseSummaries) {
      report += `### ${summary.caseNumber} - ${summary.missingPersonName}\n`;
      report += `- **Priority:** P${summary.priority}\n`;
      report += `- **Status:** ${summary.status}\n`;
      report += `- **Recent Activity:** ${summary.recentActivity}\n`;
      if (summary.pendingTasks.length > 0) {
        report += `- **Pending Tasks:**\n`;
        summary.pendingTasks.forEach((task) => {
          report += `  - ${task}\n`;
        });
      }
      if (summary.notes) {
        report += `- **Notes:** ${summary.notes}\n`;
      }
      report += `\n`;
    }

    if (handoff.actionItems.length > 0) {
      report += `## Action Items\n\n`;
      for (const item of handoff.actionItems) {
        const status = item.completed ? "✅" : "⬜";
        report += `${status} [${item.priority.toUpperCase()}] ${item.description}`;
        if (item.dueBy) {
          report += ` (Due: ${item.dueBy})`;
        }
        report += `\n`;
      }
      report += `\n`;
    }

    report += `## General Notes\n\n${handoff.generalNotes}\n`;

    return report;
  }

  /**
   * Notify incoming officer of pending handoff
   */
  private async notifyIncomingOfficer(handoff: ShiftHandoff): Promise<void> {
    console.log(
      `[ShiftHandoffService] Notifying ${handoff.toOfficerName} of pending handoff`
    );
    // Would send email/push notification
  }

  /**
   * Auto-generate case summaries from active cases
   */
  async generateCaseSummaries(
    officerId: string,
    caseIds: string[]
  ): Promise<CaseHandoffSummary[]> {
    // Would fetch case data from database
    const summaries: CaseHandoffSummary[] = caseIds.map((caseId, index) => ({
      caseId,
      caseNumber: `LC-${caseId.slice(0, 8).toUpperCase()}`,
      missingPersonName: "Person Name", // Would be fetched
      priority: Math.min(index + 1, 5),
      status: "active",
      recentActivity: "Recent updates would be fetched from case timeline",
      pendingTasks: [],
      notes: "",
    }));

    return summaries;
  }
}

export const shiftHandoffService = new ShiftHandoffService();
