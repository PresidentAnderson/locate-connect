/**
 * Case Disposition Service
 * Tracks case closures and generates analytics
 */

import type {
  CaseDisposition,
  DispositionRecord,
  DispositionAnalytics,
} from "@/types/law-enforcement.types";

export interface CreateDispositionInput {
  caseId: string;
  caseNumber: string;
  disposition: CaseDisposition;
  circumstances: string;
  locationFound?: {
    city: string;
    state: string;
    country: string;
    distance?: number;
  };
  contributingFactors?: string[];
  keyLeadId?: string;
  finalReport?: string;
  attachments?: string[];
}

class DispositionService {
  private dispositions: Map<string, DispositionRecord> = new Map();

  /**
   * Create disposition record for a case
   */
  async createDisposition(
    input: CreateDispositionInput,
    userId: string,
    caseOpenedAt: string
  ): Promise<DispositionRecord> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Calculate time metrics
    const openedDate = new Date(caseOpenedAt);
    const closedDate = new Date();
    const daysToResolution = Math.floor(
      (closedDate.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const hoursActive = Math.floor(
      (closedDate.getTime() - openedDate.getTime()) / (1000 * 60 * 60)
    );

    const record: DispositionRecord = {
      id,
      caseId: input.caseId,
      caseNumber: input.caseNumber,
      disposition: input.disposition,
      dispositionDate: now,
      circumstances: input.circumstances,
      locationFound: input.locationFound,
      daysToResolution,
      hoursActive,
      contributingFactors: input.contributingFactors || [],
      keyLeadId: input.keyLeadId,
      finalReport: input.finalReport,
      attachments: input.attachments || [],
      closedBy: userId,
      closedAt: now,
    };

    this.dispositions.set(id, record);
    console.log(
      `[DispositionService] Created disposition for case ${input.caseNumber}: ${input.disposition}`
    );
    return record;
  }

  /**
   * Get disposition for a case
   */
  async getDisposition(caseId: string): Promise<DispositionRecord | null> {
    const dispositions = Array.from(this.dispositions.values());
    return dispositions.find((d) => d.caseId === caseId) || null;
  }

  /**
   * Get disposition by ID
   */
  async getDispositionById(id: string): Promise<DispositionRecord | null> {
    return this.dispositions.get(id) || null;
  }

  /**
   * Update disposition
   */
  async updateDisposition(
    id: string,
    updates: Partial<
      Pick<
        DispositionRecord,
        | "circumstances"
        | "contributingFactors"
        | "finalReport"
        | "attachments"
      >
    >
  ): Promise<DispositionRecord | null> {
    const record = this.dispositions.get(id);
    if (!record) return null;

    Object.assign(record, updates);
    this.dispositions.set(id, record);
    return record;
  }

  /**
   * Add supervisor approval
   */
  async addSupervisorApproval(
    id: string,
    supervisorId: string,
    supervisorName: string,
    notes?: string
  ): Promise<DispositionRecord | null> {
    const record = this.dispositions.get(id);
    if (!record) return null;

    record.supervisorApproval = {
      supervisorId,
      supervisorName,
      approvedAt: new Date().toISOString(),
      notes,
    };

    this.dispositions.set(id, record);
    return record;
  }

  /**
   * Get disposition analytics
   */
  async getAnalytics(
    period: "week" | "month" | "quarter" | "year",
    endDate?: string
  ): Promise<DispositionAnalytics> {
    const end = endDate ? new Date(endDate) : new Date();
    let start: Date;

    switch (period) {
      case "week":
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const dispositions = Array.from(this.dispositions.values()).filter((d) => {
      const date = new Date(d.dispositionDate);
      return date >= start && date <= end;
    });

    // Initialize counters
    const byDisposition: Record<CaseDisposition, number> = {
      located_alive: 0,
      located_deceased: 0,
      returned_home: 0,
      emancipated: 0,
      runaway_resolved: 0,
      false_report: 0,
      insufficient_info: 0,
      transferred: 0,
      other: 0,
    };

    const byPriority: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const factorCounts: Record<string, number> = {};
    const resolutionDays: number[] = [];

    // Calculate metrics
    for (const d of dispositions) {
      byDisposition[d.disposition]++;
      resolutionDays.push(d.daysToResolution);

      for (const factor of d.contributingFactors) {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      }
    }

    // Sort resolution days for median
    resolutionDays.sort((a, b) => a - b);
    const avgDays =
      resolutionDays.length > 0
        ? resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length
        : 0;
    const medianDays =
      resolutionDays.length > 0
        ? resolutionDays[Math.floor(resolutionDays.length / 2)]
        : 0;

    // Calculate rates
    const recovered =
      byDisposition.located_alive +
      byDisposition.returned_home +
      byDisposition.runaway_resolved;
    const recoveryRate =
      dispositions.length > 0 ? (recovered / dispositions.length) * 100 : 0;

    const falseReportRate =
      dispositions.length > 0
        ? (byDisposition.false_report / dispositions.length) * 100
        : 0;

    // Top contributing factors
    const topFactors = Object.entries(factorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([factor, count]) => ({ factor, count }));

    return {
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalCases: dispositions.length + 10, // Would include open cases
      closedCases: dispositions.length,
      openCases: 10, // Would be calculated
      byDisposition,
      byPriority,
      avgDaysToResolution: Math.round(avgDays * 10) / 10,
      medianDaysToResolution: medianDays,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      falseReportRate: Math.round(falseReportRate * 10) / 10,
      topContributingFactors: topFactors,
    };
  }

  /**
   * Get recent dispositions
   */
  async getRecentDispositions(limit = 10): Promise<DispositionRecord[]> {
    return Array.from(this.dispositions.values())
      .sort(
        (a, b) =>
          new Date(b.dispositionDate).getTime() -
          new Date(a.dispositionDate).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get dispositions by type
   */
  async getByDisposition(
    disposition: CaseDisposition
  ): Promise<DispositionRecord[]> {
    return Array.from(this.dispositions.values()).filter(
      (d) => d.disposition === disposition
    );
  }

  /**
   * Generate disposition report
   */
  async generateReport(id: string): Promise<string> {
    const record = this.dispositions.get(id);
    if (!record) throw new Error("Disposition not found");

    let report = `# CASE DISPOSITION REPORT\n\n`;
    report += `**Case Number:** ${record.caseNumber}\n`;
    report += `**Disposition:** ${this.formatDisposition(record.disposition)}\n`;
    report += `**Date:** ${new Date(record.dispositionDate).toLocaleDateString()}\n`;
    report += `**Days to Resolution:** ${record.daysToResolution}\n\n`;

    report += `## Circumstances\n\n${record.circumstances}\n\n`;

    if (record.locationFound) {
      report += `## Location Found\n\n`;
      report += `${record.locationFound.city}, ${record.locationFound.state}, ${record.locationFound.country}\n`;
      if (record.locationFound.distance) {
        report += `Distance from last seen: ${record.locationFound.distance} miles\n`;
      }
      report += `\n`;
    }

    if (record.contributingFactors.length > 0) {
      report += `## Contributing Factors\n\n`;
      record.contributingFactors.forEach((f) => {
        report += `- ${f}\n`;
      });
      report += `\n`;
    }

    if (record.finalReport) {
      report += `## Final Report\n\n${record.finalReport}\n\n`;
    }

    report += `## Sign-off\n\n`;
    report += `**Closed By:** ${record.closedBy}\n`;
    report += `**Closed At:** ${new Date(record.closedAt).toLocaleString()}\n`;

    if (record.supervisorApproval) {
      report += `**Supervisor:** ${record.supervisorApproval.supervisorName}\n`;
      report += `**Approved At:** ${new Date(record.supervisorApproval.approvedAt).toLocaleString()}\n`;
      if (record.supervisorApproval.notes) {
        report += `**Notes:** ${record.supervisorApproval.notes}\n`;
      }
    }

    return report;
  }

  /**
   * Format disposition for display
   */
  private formatDisposition(disposition: CaseDisposition): string {
    const labels: Record<CaseDisposition, string> = {
      located_alive: "Located Alive",
      located_deceased: "Located Deceased",
      returned_home: "Returned Home",
      emancipated: "Emancipated",
      runaway_resolved: "Runaway Resolved",
      false_report: "False Report",
      insufficient_info: "Insufficient Information",
      transferred: "Transferred to Another Agency",
      other: "Other",
    };
    return labels[disposition] || disposition;
  }

  /**
   * Export dispositions for reporting
   */
  async exportDispositions(
    startDate: string,
    endDate: string,
    format: "json" | "csv"
  ): Promise<string> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dispositions = Array.from(this.dispositions.values()).filter((d) => {
      const date = new Date(d.dispositionDate);
      return date >= start && date <= end;
    });

    if (format === "json") {
      return JSON.stringify(dispositions, null, 2);
    }

    // CSV format
    const headers = [
      "Case Number",
      "Disposition",
      "Date",
      "Days to Resolution",
      "Location",
      "Contributing Factors",
    ];

    const rows = dispositions.map((d) => [
      d.caseNumber,
      d.disposition,
      d.dispositionDate,
      d.daysToResolution.toString(),
      d.locationFound
        ? `${d.locationFound.city}, ${d.locationFound.state}`
        : "",
      d.contributingFactors.join("; "),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

export const dispositionService = new DispositionService();
