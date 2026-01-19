/**
 * Shift Handoff Service
 * Manages law enforcement shift transitions and case continuity
 */

import { createClient } from "@/lib/supabase/server";
import { emailService } from "@/lib/services/email-service";
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

    const supabase = await createClient();

    // Get incoming officer's profile for email
    const { data: officer, error: officerError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", handoff.toOfficerId)
      .single();

    if (officerError || !officer) {
      console.error("[ShiftHandoffService] Failed to get officer profile:", officerError);
      return;
    }

    const shiftLabels: Record<string, string> = {
      day: "Day Shift",
      evening: "Evening Shift",
      night: "Night Shift",
    };

    const shiftLabel = shiftLabels[handoff.shiftType] || handoff.shiftType;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca";
    const handoffUrl = `${appUrl}/law-enforcement/shift-handoff/${handoff.id}`;

    // Count urgent items
    const urgentCases = handoff.caseSummaries.filter((c) => c.priority <= 2).length;
    const totalActionItems = handoff.actionItems.filter((i) => !i.completed).length;

    // Send email notification
    await emailService.send({
      to: officer.email,
      subject: `📋 Shift Handoff: ${shiftLabel} on ${new Date(handoff.shiftDate).toLocaleDateString()}`,
      html: `
        <h2>Shift Handoff Report</h2>

        <p>Hello ${officer.full_name || handoff.toOfficerName},</p>

        <p>${handoff.fromOfficerName} has prepared a shift handoff report for your upcoming ${shiftLabel.toLowerCase()}.</p>

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Summary</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li>📅 Shift Date: <strong>${new Date(handoff.shiftDate).toLocaleDateString()}</strong></li>
            <li>🕐 Shift Type: <strong>${shiftLabel}</strong></li>
            <li>📁 Active Cases: <strong>${handoff.caseSummaries.length}</strong></li>
            ${urgentCases > 0 ? `<li style="color: #dc2626;">🚨 Urgent Cases: <strong>${urgentCases}</strong></li>` : ""}
            <li>✅ Pending Action Items: <strong>${totalActionItems}</strong></li>
          </ul>
        </div>

        ${handoff.urgentNotes ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">⚠️ Urgent Notes</h3>
          <p style="margin-bottom: 0;">${handoff.urgentNotes}</p>
        </div>
        ` : ""}

        <p style="margin-top: 20px;">
          <a href="${handoffUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
            View Full Handoff Report
          </a>
        </p>

        <p style="color: #666; margin-top: 20px; font-size: 14px;">
          Please review this handoff report and mark it as acknowledged when you begin your shift.
        </p>
      `,
      text: `
Shift Handoff Report

Hello ${officer.full_name || handoff.toOfficerName},

${handoff.fromOfficerName} has prepared a shift handoff report for your upcoming ${shiftLabel.toLowerCase()}.

Summary:
- Shift Date: ${new Date(handoff.shiftDate).toLocaleDateString()}
- Shift Type: ${shiftLabel}
- Active Cases: ${handoff.caseSummaries.length}
${urgentCases > 0 ? `- Urgent Cases: ${urgentCases}` : ""}
- Pending Action Items: ${totalActionItems}

${handoff.urgentNotes ? `URGENT NOTES:\n${handoff.urgentNotes}` : ""}

View full report at: ${handoffUrl}

Please review this handoff report and mark it as acknowledged when you begin your shift.
      `.trim(),
      priority: urgentCases > 0 ? "high" : "normal",
    });

    // Create in-app notification
    await supabase.from("notifications").insert({
      user_id: handoff.toOfficerId,
      type: "shift_handoff",
      title: `Shift Handoff from ${handoff.fromOfficerName}`,
      message: `You have a pending shift handoff for ${shiftLabel} on ${new Date(handoff.shiftDate).toLocaleDateString()}. ${urgentCases > 0 ? `${urgentCases} urgent case(s) require immediate attention.` : ""}`,
      priority: urgentCases > 0 ? "high" : "medium",
      data: {
        handoff_id: handoff.id,
        from_officer_id: handoff.fromOfficerId,
        from_officer_name: handoff.fromOfficerName,
        shift_date: handoff.shiftDate,
        shift_type: handoff.shiftType,
        case_count: handoff.caseSummaries.length,
        urgent_case_count: urgentCases,
      },
    });

    console.log(`[ShiftHandoffService] Notified officer ${officer.email} of handoff ${handoff.id}`);
  }

  /**
   * Auto-generate case summaries from active cases
   */
  async generateCaseSummaries(
    officerId: string,
    caseIds: string[]
  ): Promise<CaseHandoffSummary[]> {
    if (caseIds.length === 0) {
      return [];
    }

    const supabase = await createClient();

    // Fetch case details from database
    const { data: cases, error: casesError } = await supabase
      .from("case_reports")
      .select(`
        id,
        case_number,
        missing_person_name,
        priority,
        status,
        updated_at
      `)
      .in("id", caseIds);

    if (casesError) {
      console.error("[ShiftHandoffService] Failed to fetch cases:", casesError);
      return [];
    }

    // Fetch recent activity for each case
    const summaries: CaseHandoffSummary[] = [];

    for (const caseData of cases || []) {
      // Get recent activity from case_activity table
      const { data: activities } = await supabase
        .from("case_activity")
        .select("description, created_at")
        .eq("case_id", caseData.id)
        .order("created_at", { ascending: false })
        .limit(3);

      // Get pending tasks/action items
      const { data: tasks } = await supabase
        .from("case_tasks")
        .select("title, priority, due_date")
        .eq("case_id", caseData.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(5);

      const recentActivity = activities?.length
        ? activities.map((a) => `${new Date(a.created_at).toLocaleDateString()}: ${a.description}`).join("\n")
        : "No recent activity recorded.";

      const pendingTasks: string[] = (tasks || []).map((t) => {
        const dueDate = t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleDateString()})` : "";
        const priorityLabel = t.priority ? `[${t.priority.toUpperCase()}]` : "";
        return `${priorityLabel} ${t.title}${dueDate}`.trim();
      });

      summaries.push({
        caseId: caseData.id,
        caseNumber: caseData.case_number,
        missingPersonName: caseData.missing_person_name || "Unknown",
        priority: caseData.priority || 3,
        status: caseData.status || "active",
        recentActivity,
        pendingTasks,
        notes: "",
      });
    }

    // Sort by priority (lower number = higher priority)
    summaries.sort((a, b) => a.priority - b.priority);

    console.log(`[ShiftHandoffService] Generated summaries for ${summaries.length} cases`);
    return summaries;
  }
}

export const shiftHandoffService = new ShiftHandoffService();
