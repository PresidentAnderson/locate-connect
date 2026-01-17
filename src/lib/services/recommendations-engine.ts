/**
 * Recommendations Engine Service
 * LC-FEAT-021: Case Outcome Reports
 *
 * Analyzes case data and generates intelligent recommendations
 * for process improvements and learning.
 */

import type {
  CaseOutcomeReport,
  OutcomeRecommendation,
  RecommendationCategory,
  RecommendationPriority,
  SimilarCaseAnalysis,
  SimilarityFactor,
  RecommendationPattern,
  DecisionPoint,
  LeadSourcePerformance,
  DelayPattern,
} from "@/types/outcome-report.types";

// =============================================================================
// TYPES
// =============================================================================

interface RecommendationInput {
  report: CaseOutcomeReport;
  caseData: {
    isMinor: boolean;
    isElderly: boolean;
    isIndigenous: boolean;
    hasMedicalConditions: boolean;
    wasAmberAlert: boolean;
    jurisdictionId?: string;
    priorityLevel: string;
  };
  historicalMetrics?: {
    avgResolutionHours: number;
    avgLeadsPerCase: number;
    avgFalsePositiveRate: number;
    avgTipConversionRate: number;
  };
}

interface GeneratedRecommendation {
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  sourceAnalysis: string;
  patternId?: string;
}

interface SimilarityCriteria {
  ageRange?: [number, number];
  gender?: string;
  isMinor?: boolean;
  isIndigenous?: boolean;
  jurisdiction?: string;
  disposition?: string;
  priorityLevel?: string;
}

// =============================================================================
// RECOMMENDATION RULES
// =============================================================================

const RECOMMENDATION_RULES: {
  check: (input: RecommendationInput) => boolean;
  generate: (input: RecommendationInput) => GeneratedRecommendation;
}[] = [
  // High false positive rate
  {
    check: (input) => (input.report.falsePositiveRate || 0) > 50,
    generate: (input) => ({
      category: "process",
      priority: "medium",
      title: "Review lead verification process",
      description:
        "The false positive rate exceeded 50% in this case. Consider implementing additional verification steps before leads are acted upon, or providing training on lead assessment criteria.",
      sourceAnalysis: `False positive rate: ${input.report.falsePositiveRate?.toFixed(1)}%. This is above the recommended threshold of 50%.`,
    }),
  },

  // Very high false positive rate (critical)
  {
    check: (input) => (input.report.falsePositiveRate || 0) > 75,
    generate: (input) => ({
      category: "training",
      priority: "high",
      title: "Urgent: Lead assessment training needed",
      description:
        "The false positive rate was critically high at over 75%. Immediate training on lead quality assessment is recommended to avoid wasting resources on unverified leads.",
      sourceAnalysis: `False positive rate: ${input.report.falsePositiveRate?.toFixed(1)}%. Critical threshold exceeded.`,
    }),
  },

  // Slow initial response
  {
    check: (input) => (input.report.timeToFirstResponse || 0) > 24,
    generate: (input) => ({
      category: "resource",
      priority: "high",
      title: "Improve initial response time",
      description:
        "Initial response took over 24 hours. Review staffing levels and on-call procedures. Consider implementing automated case assignment and notification systems.",
      sourceAnalysis: `Time to first response: ${input.report.timeToFirstResponse?.toFixed(1)} hours. Target is under 24 hours.`,
    }),
  },

  // Very slow response for high-risk cases
  {
    check: (input) =>
      (input.report.timeToFirstResponse || 0) > 4 &&
      (input.caseData.isMinor || input.caseData.isElderly),
    generate: (input) => ({
      category: "process",
      priority: "critical",
      title: "Critical: Expedite high-risk case response",
      description:
        "Response time exceeded 4 hours for a high-risk case (minor or elderly). Implement priority queuing and immediate escalation protocols for vulnerable persons.",
      sourceAnalysis: `Time to first response: ${input.report.timeToFirstResponse?.toFixed(1)} hours for ${input.caseData.isMinor ? "minor" : "elderly"} person.`,
    }),
  },

  // Low tip conversion rate
  {
    check: (input) =>
      (input.report.tipConversionRate || 0) < 10 && input.report.totalTipsReceived > 5,
    generate: (input) => ({
      category: "communication",
      priority: "medium",
      title: "Improve tip quality and public communication",
      description:
        "The tip-to-lead conversion rate was below 10%. Consider improving public communication about what constitutes a useful tip, and provide clearer guidance on information to include.",
      sourceAnalysis: `Tip conversion rate: ${input.report.tipConversionRate?.toFixed(1)}% from ${input.report.totalTipsReceived} tips.`,
    }),
  },

  // High hoax tip rate
  {
    check: (input) =>
      input.report.totalTipsReceived > 0 &&
      (input.report.tipsHoax / input.report.totalTipsReceived) * 100 > 20,
    generate: (input) => ({
      category: "technology",
      priority: "medium",
      title: "Implement tip verification system",
      description:
        "Over 20% of tips were identified as hoaxes. Consider implementing automated screening, CAPTCHA, or verification steps to filter out malicious submissions.",
      sourceAnalysis: `Hoax rate: ${((input.report.tipsHoax / input.report.totalTipsReceived) * 100).toFixed(1)}% (${input.report.tipsHoax} of ${input.report.totalTipsReceived} tips).`,
    }),
  },

  // No social media monitoring
  {
    check: (input) => input.report.socialMediaReach === 0,
    generate: (input) => ({
      category: "technology",
      priority: "low",
      title: "Consider social media monitoring",
      description:
        "No social media outreach was recorded for this case. For future cases, consider leveraging social media platforms for wider reach and potential sighting reports.",
      sourceAnalysis: "Social media reach: 0. Modern cases often benefit from social media exposure.",
    }),
  },

  // Limited media engagement
  {
    check: (input) =>
      input.report.mediaOutletsEngaged === 0 &&
      (input.report.totalDurationHours || 0) > 48,
    generate: (input) => ({
      category: "communication",
      priority: "medium",
      title: "Engage media outlets earlier",
      description:
        "No media outlets were engaged despite the case lasting over 48 hours. Consider establishing media partnerships and protocols for timely public appeals.",
      sourceAnalysis: `Case duration: ${input.report.totalDurationHours?.toFixed(1)} hours with no media engagement.`,
    }),
  },

  // Extended case duration
  {
    check: (input) => (input.report.totalDurationHours || 0) > 72,
    generate: (input) => ({
      category: "process",
      priority: "medium",
      title: "Review escalation procedures",
      description:
        "Case took over 72 hours to resolve. Review case escalation procedures and ensure adequate resources are assigned to time-critical cases.",
      sourceAnalysis: `Total duration: ${input.report.totalDurationHours?.toFixed(1)} hours exceeds 72-hour threshold.`,
    }),
  },

  // Low resource utilization
  {
    check: (input) =>
      input.report.totalAssignedOfficers < 2 && (input.report.totalDurationHours || 0) > 24,
    generate: (input) => ({
      category: "resource",
      priority: "medium",
      title: "Evaluate staffing levels for extended cases",
      description:
        "Only one officer was assigned for a case lasting over 24 hours. Consider protocols for automatic escalation and additional resource assignment.",
      sourceAnalysis: `${input.report.totalAssignedOfficers} officer(s) assigned for ${input.report.totalDurationHours?.toFixed(1)} hour case.`,
    }),
  },

  // Slow lead response
  {
    check: (input) => (input.report.avgLeadResponseHours || 0) > 12,
    generate: (input) => ({
      category: "process",
      priority: "high",
      title: "Accelerate lead follow-up process",
      description:
        "Average lead response time exceeded 12 hours. Time-sensitive leads require faster action. Review triage procedures and consider dedicated lead response teams.",
      sourceAnalysis: `Average lead response: ${input.report.avgLeadResponseHours?.toFixed(1)} hours. Target is under 12 hours.`,
    }),
  },

  // Indigenous case without liaison
  {
    check: (input) =>
      input.caseData.isIndigenous &&
      !input.report.partnerOrganizationsInvolved?.some(
        (org) =>
          org.toLowerCase().includes("indigenous") ||
          org.toLowerCase().includes("first nation") ||
          org.toLowerCase().includes("mmiwg")
      ),
    generate: (input) => ({
      category: "policy",
      priority: "high",
      title: "Engage Indigenous liaison services",
      description:
        "This case involved an Indigenous person but no Indigenous liaison organizations were recorded as partners. Consider engaging community liaisons for culturally sensitive approaches.",
      sourceAnalysis:
        "Indigenous case without documented Indigenous liaison organization involvement.",
    }),
  },

  // Medical dependency without expedited handling
  {
    check: (input) =>
      input.caseData.hasMedicalConditions && (input.report.timeToFirstResponse || 0) > 2,
    generate: (input) => ({
      category: "process",
      priority: "critical",
      title: "Expedite medical dependency cases",
      description:
        "Response time exceeded 2 hours for a person with medical conditions. Implement immediate escalation protocols for medically dependent individuals.",
      sourceAnalysis: `Response time: ${input.report.timeToFirstResponse?.toFixed(1)} hours for medical dependency case.`,
    }),
  },

  // No partner organizations
  {
    check: (input) =>
      (input.report.partnerOrganizationsInvolved?.length || 0) === 0 &&
      (input.report.totalDurationHours || 0) > 48,
    generate: (input) => ({
      category: "resource",
      priority: "low",
      title: "Leverage partner organizations",
      description:
        "No partner organizations were involved despite extended case duration. Consider building partnerships with local organizations, shelters, and community groups.",
      sourceAnalysis: `No partners engaged during ${input.report.totalDurationHours?.toFixed(1)} hour case.`,
    }),
  },

  // Delays identified but not addressed
  {
    check: (input) => (input.report.delaysIdentified?.length || 0) > 2,
    generate: (input) => ({
      category: "process",
      priority: "high",
      title: "Address recurring delay patterns",
      description: `${input.report.delaysIdentified.length} delays were identified in this case. Review and address systemic issues causing these delays to prevent recurrence.`,
      sourceAnalysis: `Delays identified: ${input.report.delaysIdentified.join(", ")}`,
    }),
  },
];

// =============================================================================
// RECOMMENDATIONS ENGINE
// =============================================================================

export class RecommendationsEngine {
  /**
   * Generate recommendations based on case outcome report analysis
   */
  static generateRecommendations(input: RecommendationInput): GeneratedRecommendation[] {
    const recommendations: GeneratedRecommendation[] = [];

    for (const rule of RECOMMENDATION_RULES) {
      if (rule.check(input)) {
        recommendations.push(rule.generate(input));
      }
    }

    // Sort by priority (critical > high > medium > low)
    const priorityOrder: Record<RecommendationPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Remove duplicates based on title
    const uniqueRecommendations = recommendations.filter(
      (rec, index, self) => index === self.findIndex((r) => r.title === rec.title)
    );

    return uniqueRecommendations;
  }

  /**
   * Calculate similarity score between two cases
   */
  static calculateSimilarityScore(
    sourceCase: SimilarityCriteria,
    targetCase: SimilarityCriteria
  ): { score: number; factors: SimilarityFactor[] } {
    const factors: SimilarityFactor[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    // Gender match (weight: 15)
    if (sourceCase.gender !== undefined) {
      totalWeight += 15;
      const match = sourceCase.gender === targetCase.gender;
      factors.push({ factor: "gender", match, weight: 15 });
      if (match) matchedWeight += 15;
    }

    // Minor status (weight: 20)
    if (sourceCase.isMinor !== undefined) {
      totalWeight += 20;
      const match = sourceCase.isMinor === targetCase.isMinor;
      factors.push({ factor: "minor_status", match, weight: 20 });
      if (match) matchedWeight += 20;
    }

    // Indigenous status (weight: 15)
    if (sourceCase.isIndigenous !== undefined) {
      totalWeight += 15;
      const match = sourceCase.isIndigenous === targetCase.isIndigenous;
      factors.push({ factor: "indigenous_status", match, weight: 15 });
      if (match) matchedWeight += 15;
    }

    // Jurisdiction match (weight: 20)
    if (sourceCase.jurisdiction !== undefined) {
      totalWeight += 20;
      const match = sourceCase.jurisdiction === targetCase.jurisdiction;
      factors.push({ factor: "jurisdiction", match, weight: 20 });
      if (match) matchedWeight += 20;
    }

    // Disposition match (weight: 25)
    if (sourceCase.disposition !== undefined) {
      totalWeight += 25;
      const match = sourceCase.disposition === targetCase.disposition;
      factors.push({ factor: "disposition", match, weight: 25 });
      if (match) matchedWeight += 25;
    }

    // Priority level (weight: 10)
    if (sourceCase.priorityLevel !== undefined) {
      totalWeight += 10;
      const match = sourceCase.priorityLevel === targetCase.priorityLevel;
      factors.push({ factor: "priority_level", match, weight: 10 });
      if (match) matchedWeight += 10;
    }

    // Age range (weight: 20) - if within 5 years
    if (sourceCase.ageRange && targetCase.ageRange) {
      totalWeight += 20;
      const sourceMid = (sourceCase.ageRange[0] + sourceCase.ageRange[1]) / 2;
      const targetMid = (targetCase.ageRange[0] + targetCase.ageRange[1]) / 2;
      const match = Math.abs(sourceMid - targetMid) <= 5;
      factors.push({ factor: "age_range", match, weight: 20, description: "Within 5 years" });
      if (match) matchedWeight += 20;
    }

    const score = totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

    return { score: Math.round(score * 100) / 100, factors };
  }

  /**
   * Analyze lead effectiveness and generate insights
   */
  static analyzeLeadEffectiveness(
    leads: {
      source: string;
      status: string;
      contributedToResolution: boolean;
      responseTimeHours: number;
    }[]
  ): LeadSourcePerformance[] {
    const sourceStats: Record<
      string,
      { total: number; successful: number; totalResponseHours: number }
    > = {};

    for (const lead of leads) {
      const source = lead.source || "unknown";
      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, successful: 0, totalResponseHours: 0 };
      }

      sourceStats[source].total++;
      if (lead.contributedToResolution || lead.status === "verified") {
        sourceStats[source].successful++;
      }
      sourceStats[source].totalResponseHours += lead.responseTimeHours || 0;
    }

    const performance: LeadSourcePerformance[] = Object.entries(sourceStats).map(
      ([source, stats]) => ({
        source,
        count: stats.total,
        successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        avgResponseHours: stats.total > 0 ? stats.totalResponseHours / stats.total : 0,
      })
    );

    // Sort by success rate descending
    performance.sort((a, b) => b.successRate - a.successRate);

    return performance;
  }

  /**
   * Identify delay patterns from timeline milestones
   */
  static identifyDelayPatterns(
    milestones: { wasDelay: boolean; delayHours?: number; delayReason?: string }[]
  ): DelayPattern[] {
    const delayStats: Record<string, { count: number; totalHours: number }> = {};

    for (const milestone of milestones) {
      if (milestone.wasDelay && milestone.delayReason) {
        const reason = milestone.delayReason;
        if (!delayStats[reason]) {
          delayStats[reason] = { count: 0, totalHours: 0 };
        }
        delayStats[reason].count++;
        delayStats[reason].totalHours += milestone.delayHours || 0;
      }
    }

    const patterns: DelayPattern[] = Object.entries(delayStats).map(([reason, stats]) => ({
      reason,
      frequency: stats.count,
      avgDelayHours: stats.count > 0 ? stats.totalHours / stats.count : 0,
    }));

    // Sort by frequency descending
    patterns.sort((a, b) => b.frequency - a.frequency);

    return patterns;
  }

  /**
   * Generate "what worked" analysis based on case metrics
   */
  static analyzeWhatWorked(report: CaseOutcomeReport): string[] {
    const whatWorked: string[] = [];

    // Fast resolution
    if ((report.totalDurationHours || 0) < 24) {
      whatWorked.push("Quick resolution within 24 hours");
    }

    // High lead verification rate
    if (
      report.totalLeadsGenerated > 0 &&
      (report.leadsVerified / report.totalLeadsGenerated) * 100 > 30
    ) {
      whatWorked.push("High lead verification rate indicates quality tip processing");
    }

    // Good tip conversion
    if (
      report.totalTipsReceived > 0 &&
      (report.tipsConvertedToLeads / report.totalTipsReceived) * 100 > 20
    ) {
      whatWorked.push("Effective tip-to-lead conversion process");
    }

    // Fast first response
    if ((report.timeToFirstResponse || 0) < 2) {
      whatWorked.push("Rapid initial response time under 2 hours");
    }

    // Partner engagement
    if ((report.partnerOrganizationsInvolved?.length || 0) > 2) {
      whatWorked.push("Strong partner organization collaboration");
    }

    // Social media effectiveness
    if ((report.socialMediaReach || 0) > 10000) {
      whatWorked.push("Effective social media outreach");
    }

    // Low false positive rate
    if ((report.falsePositiveRate || 0) < 30) {
      whatWorked.push("Efficient lead quality assessment");
    }

    // Solving lead identified
    if (report.solvingLeadId) {
      whatWorked.push(`Case solved through ${report.solvingLeadSource || "identified lead"}`);
    }

    return whatWorked;
  }

  /**
   * Generate "what didn't work" analysis based on case metrics
   */
  static analyzeWhatDidntWork(report: CaseOutcomeReport): string[] {
    const whatDidntWork: string[] = [];

    // Slow resolution
    if ((report.totalDurationHours || 0) > 72) {
      whatDidntWork.push("Extended resolution time exceeding 72 hours");
    }

    // High false positive rate
    if ((report.falsePositiveRate || 0) > 50) {
      whatDidntWork.push("High false positive rate on leads");
    }

    // Low tip conversion
    if (
      report.totalTipsReceived > 5 &&
      (report.tipsConvertedToLeads / report.totalTipsReceived) * 100 < 10
    ) {
      whatDidntWork.push("Low tip-to-lead conversion rate");
    }

    // Slow response
    if ((report.timeToFirstResponse || 0) > 24) {
      whatDidntWork.push("Delayed initial response time");
    }

    // No partner engagement
    if ((report.partnerOrganizationsInvolved?.length || 0) === 0) {
      whatDidntWork.push("No partner organization involvement");
    }

    // High hoax rate
    if (
      report.totalTipsReceived > 0 &&
      (report.tipsHoax / report.totalTipsReceived) * 100 > 20
    ) {
      whatDidntWork.push("High percentage of hoax tips");
    }

    // Many leads but few verified
    if (
      report.totalLeadsGenerated > 10 &&
      (report.leadsVerified / report.totalLeadsGenerated) * 100 < 10
    ) {
      whatDidntWork.push("Many leads generated but few verified");
    }

    // Delays identified
    if ((report.delaysIdentified?.length || 0) > 0) {
      for (const delay of report.delaysIdentified.slice(0, 3)) {
        whatDidntWork.push(`Delay: ${delay}`);
      }
    }

    return whatDidntWork;
  }

  /**
   * Compare with historical metrics to identify anomalies
   */
  static compareWithHistorical(
    report: CaseOutcomeReport,
    historical: {
      avgResolutionHours: number;
      avgLeadsPerCase: number;
      avgFalsePositiveRate: number;
      avgTipConversionRate: number;
    }
  ): { metric: string; actual: number; expected: number; deviation: string }[] {
    const comparisons: {
      metric: string;
      actual: number;
      expected: number;
      deviation: string;
    }[] = [];

    // Resolution time
    const actualResolution = report.totalDurationHours || 0;
    if (actualResolution > 0) {
      const deviation =
        ((actualResolution - historical.avgResolutionHours) / historical.avgResolutionHours) * 100;
      comparisons.push({
        metric: "Resolution Time (hours)",
        actual: actualResolution,
        expected: historical.avgResolutionHours,
        deviation: `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}%`,
      });
    }

    // Leads per case
    if (report.totalLeadsGenerated > 0) {
      const deviation =
        ((report.totalLeadsGenerated - historical.avgLeadsPerCase) /
          historical.avgLeadsPerCase) *
        100;
      comparisons.push({
        metric: "Leads Generated",
        actual: report.totalLeadsGenerated,
        expected: historical.avgLeadsPerCase,
        deviation: `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}%`,
      });
    }

    // False positive rate
    if (report.falsePositiveRate !== undefined) {
      const deviation =
        ((report.falsePositiveRate - historical.avgFalsePositiveRate) /
          historical.avgFalsePositiveRate) *
        100;
      comparisons.push({
        metric: "False Positive Rate (%)",
        actual: report.falsePositiveRate,
        expected: historical.avgFalsePositiveRate,
        deviation: `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}%`,
      });
    }

    // Tip conversion rate
    if (report.tipConversionRate !== undefined) {
      const deviation =
        ((report.tipConversionRate - historical.avgTipConversionRate) /
          historical.avgTipConversionRate) *
        100;
      comparisons.push({
        metric: "Tip Conversion Rate (%)",
        actual: report.tipConversionRate,
        expected: historical.avgTipConversionRate,
        deviation: `${deviation > 0 ? "+" : ""}${deviation.toFixed(1)}%`,
      });
    }

    return comparisons;
  }
}

export default RecommendationsEngine;
