/**
 * Phase 2 Gating Service
 * Manages launch criteria and multi-jurisdiction expansion
 */

import type {
  Phase2Criteria,
  Phase2Readiness,
  Jurisdiction,
  JurisdictionAgreement,
} from "@/types/compliance.types";

// Default Phase 2 criteria
const DEFAULT_CRITERIA: Phase2Criteria[] = [
  // Technical
  {
    id: "wcag-compliance",
    name: "WCAG 2.1 AA Compliance",
    description: "All public-facing pages meet WCAG 2.1 AA standards",
    category: "technical",
    status: "completed",
    progress: 100,
    owner: "Accessibility Team",
    dueDate: "2026-01-15",
    completedAt: "2026-01-10",
  },
  {
    id: "i18n-enFr",
    name: "EN/FR Internationalization",
    description: "Full bilingual support for all UI elements",
    category: "technical",
    status: "completed",
    progress: 100,
    owner: "i18n Team",
    dueDate: "2026-01-15",
    completedAt: "2026-01-12",
  },
  {
    id: "indigenous-languages",
    name: "Indigenous Language Support",
    description: "Priority indigenous language support in intake forms",
    category: "technical",
    status: "in_progress",
    progress: 60,
    owner: "i18n Team",
    dueDate: "2026-02-01",
  },
  {
    id: "mobile-apps",
    name: "Mobile Applications",
    description: "iOS and Android apps published and approved",
    category: "technical",
    status: "in_progress",
    progress: 75,
    owner: "Mobile Team",
    dueDate: "2026-02-15",
  },
  {
    id: "ai-photo-matching",
    name: "AI Photo Matching",
    description: "Face recognition system operational and tested",
    category: "technical",
    status: "in_progress",
    progress: 80,
    owner: "AI Team",
    dueDate: "2026-01-30",
  },

  // Compliance
  {
    id: "quebec-law25",
    name: "Quebec Law 25 Compliance",
    description: "Full compliance with Quebec privacy regulations",
    category: "compliance",
    status: "completed",
    progress: 100,
    owner: "Legal Team",
    dueDate: "2026-01-01",
    completedAt: "2025-12-20",
  },
  {
    id: "pipeda-compliance",
    name: "PIPEDA Compliance",
    description: "Federal privacy law compliance verified",
    category: "compliance",
    status: "completed",
    progress: 100,
    owner: "Legal Team",
    dueDate: "2026-01-01",
    completedAt: "2025-12-15",
  },
  {
    id: "security-audit",
    name: "Security Audit",
    description: "Third-party security audit completed",
    category: "compliance",
    status: "completed",
    progress: 100,
    owner: "Security Team",
    dueDate: "2026-01-10",
    completedAt: "2026-01-08",
  },

  // Operational
  {
    id: "support-team",
    name: "Support Team Trained",
    description: "24/7 support team trained and operational",
    category: "operational",
    status: "completed",
    progress: 100,
    owner: "Operations",
    dueDate: "2026-01-15",
    completedAt: "2026-01-14",
  },
  {
    id: "le-partnerships",
    name: "Law Enforcement Partnerships",
    description: "Minimum 5 LE agency partnerships active",
    category: "operational",
    status: "in_progress",
    progress: 60,
    owner: "Partnerships",
    dueDate: "2026-02-01",
  },
  {
    id: "volunteer-network",
    name: "Volunteer Network",
    description: "Minimum 100 verified volunteers registered",
    category: "operational",
    status: "in_progress",
    progress: 45,
    owner: "Community Team",
    dueDate: "2026-02-15",
  },

  // Business
  {
    id: "funding-secured",
    name: "Funding Secured",
    description: "Operating budget secured for 18 months",
    category: "business",
    status: "completed",
    progress: 100,
    owner: "Finance",
    dueDate: "2026-01-01",
    completedAt: "2025-11-30",
  },
  {
    id: "media-strategy",
    name: "Media Strategy",
    description: "Launch media strategy and materials prepared",
    category: "business",
    status: "in_progress",
    progress: 70,
    owner: "Communications",
    dueDate: "2026-01-20",
  },
];

// Canadian jurisdictions
const CANADIAN_JURISDICTIONS: Jurisdiction[] = [
  {
    id: "ca-federal",
    code: "CA-FED",
    name: { en: "Federal", fr: "Fédéral" },
    type: "federal",
    country: "CA",
    timezone: "America/Toronto",
    languages: ["en", "fr"],
    privacyRegulation: "PIPEDA",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ca-qc",
    code: "CA-QC",
    name: { en: "Quebec", fr: "Québec" },
    type: "provincial",
    parentId: "ca-federal",
    country: "CA",
    timezone: "America/Montreal",
    languages: ["fr", "en"],
    privacyRegulation: "Law 25",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ca-on",
    code: "CA-ON",
    name: { en: "Ontario", fr: "Ontario" },
    type: "provincial",
    parentId: "ca-federal",
    country: "CA",
    timezone: "America/Toronto",
    languages: ["en", "fr"],
    privacyRegulation: "PIPEDA",
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ca-bc",
    code: "CA-BC",
    name: { en: "British Columbia", fr: "Colombie-Britannique" },
    type: "provincial",
    parentId: "ca-federal",
    country: "CA",
    timezone: "America/Vancouver",
    languages: ["en"],
    privacyRegulation: "PIPA",
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ca-ab",
    code: "CA-AB",
    name: { en: "Alberta", fr: "Alberta" },
    type: "provincial",
    parentId: "ca-federal",
    country: "CA",
    timezone: "America/Edmonton",
    languages: ["en"],
    privacyRegulation: "PIPA",
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ca-nu",
    code: "CA-NU",
    name: { en: "Nunavut", fr: "Nunavut", iu: "ᓄᓇᕗᑦ" },
    type: "territorial",
    parentId: "ca-federal",
    country: "CA",
    timezone: "America/Iqaluit",
    languages: ["en", "fr", "iu"],
    privacyRegulation: "PIPEDA",
    enabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

class Phase2GatingService {
  private criteria: Map<string, Phase2Criteria> = new Map();
  private jurisdictions: Map<string, Jurisdiction> = new Map();
  private agreements: Map<string, JurisdictionAgreement> = new Map();

  constructor() {
    for (const criterion of DEFAULT_CRITERIA) {
      this.criteria.set(criterion.id, criterion);
    }

    for (const jurisdiction of CANADIAN_JURISDICTIONS) {
      this.jurisdictions.set(jurisdiction.id, jurisdiction);
    }
  }

  // ==================== PHASE 2 CRITERIA ====================

  /**
   * Get all criteria
   */
  getCriteria(): Phase2Criteria[] {
    return Array.from(this.criteria.values());
  }

  /**
   * Get criteria by category
   */
  getCriteriaByCategory(category: Phase2Criteria["category"]): Phase2Criteria[] {
    return Array.from(this.criteria.values()).filter(
      (c) => c.category === category
    );
  }

  /**
   * Get criterion by ID
   */
  getCriterion(criterionId: string): Phase2Criteria | null {
    return this.criteria.get(criterionId) || null;
  }

  /**
   * Update criterion progress
   */
  updateCriterionProgress(
    criterionId: string,
    progress: number,
    status?: Phase2Criteria["status"]
  ): Phase2Criteria | null {
    const criterion = this.criteria.get(criterionId);
    if (!criterion) return null;

    criterion.progress = Math.min(100, Math.max(0, progress));

    if (status) {
      criterion.status = status;
    } else if (progress >= 100) {
      criterion.status = "completed";
      criterion.completedAt = new Date().toISOString();
    }

    this.criteria.set(criterionId, criterion);
    return criterion;
  }

  /**
   * Add blocker to criterion
   */
  addBlocker(criterionId: string, blocker: string): boolean {
    const criterion = this.criteria.get(criterionId);
    if (!criterion) return false;

    criterion.blockers = criterion.blockers || [];
    criterion.blockers.push(blocker);
    criterion.status = "blocked";

    this.criteria.set(criterionId, criterion);
    return true;
  }

  /**
   * Remove blocker from criterion
   */
  removeBlocker(criterionId: string, blockerIndex: number): boolean {
    const criterion = this.criteria.get(criterionId);
    if (!criterion || !criterion.blockers) return false;

    criterion.blockers.splice(blockerIndex, 1);
    if (criterion.blockers.length === 0) {
      criterion.status = "in_progress";
    }

    this.criteria.set(criterionId, criterion);
    return true;
  }

  /**
   * Get Phase 2 readiness assessment
   */
  getReadiness(): Phase2Readiness {
    const criteria = Array.from(this.criteria.values());

    const byCategory: Phase2Readiness["criteriaByCategory"] = {
      technical: { total: 0, completed: 0, blocked: 0 },
      compliance: { total: 0, completed: 0, blocked: 0 },
      operational: { total: 0, completed: 0, blocked: 0 },
      business: { total: 0, completed: 0, blocked: 0 },
    };

    const blockers: Phase2Readiness["blockers"] = [];
    let totalProgress = 0;

    for (const criterion of criteria) {
      byCategory[criterion.category].total++;
      totalProgress += criterion.progress;

      if (criterion.status === "completed") {
        byCategory[criterion.category].completed++;
      }

      if (criterion.status === "blocked") {
        byCategory[criterion.category].blocked++;
        for (const blocker of criterion.blockers || []) {
          blockers.push({
            criteriaId: criterion.id,
            description: blocker,
            severity: criterion.category === "compliance" ? "critical" : "high",
          });
        }
      }
    }

    const overallProgress = Math.round(totalProgress / criteria.length);

    // Estimate ready date based on incomplete criteria
    let estimatedReadyDate: string | undefined;
    const incompleteCriteria = criteria.filter((c) => c.status !== "completed");
    if (incompleteCriteria.length > 0) {
      const latestDueDate = incompleteCriteria.reduce((latest, c) => {
        const dueDate = new Date(c.dueDate);
        return dueDate > latest ? dueDate : latest;
      }, new Date());
      estimatedReadyDate = latestDueDate.toISOString();
    }

    return {
      overallProgress,
      criteriaByCategory: byCategory,
      blockers,
      estimatedReadyDate,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Check if ready for Phase 2 launch
   */
  isReadyForLaunch(): { ready: boolean; reason?: string } {
    const criteria = Array.from(this.criteria.values());

    // Check for blockers
    const blocked = criteria.filter((c) => c.status === "blocked");
    if (blocked.length > 0) {
      return {
        ready: false,
        reason: `${blocked.length} criteria are blocked`,
      };
    }

    // Check compliance criteria (must all be complete)
    const complianceCriteria = criteria.filter(
      (c) => c.category === "compliance"
    );
    const incompleteCompliance = complianceCriteria.filter(
      (c) => c.status !== "completed"
    );
    if (incompleteCompliance.length > 0) {
      return {
        ready: false,
        reason: `${incompleteCompliance.length} compliance criteria incomplete`,
      };
    }

    // Check overall progress (minimum 80%)
    const overallProgress =
      criteria.reduce((sum, c) => sum + c.progress, 0) / criteria.length;
    if (overallProgress < 80) {
      return {
        ready: false,
        reason: `Overall progress ${Math.round(overallProgress)}% (minimum 80% required)`,
      };
    }

    return { ready: true };
  }

  // ==================== JURISDICTIONS ====================

  /**
   * Get all jurisdictions
   */
  getJurisdictions(): Jurisdiction[] {
    return Array.from(this.jurisdictions.values());
  }

  /**
   * Get enabled jurisdictions
   */
  getEnabledJurisdictions(): Jurisdiction[] {
    return Array.from(this.jurisdictions.values()).filter((j) => j.enabled);
  }

  /**
   * Get jurisdiction by ID
   */
  getJurisdiction(jurisdictionId: string): Jurisdiction | null {
    return this.jurisdictions.get(jurisdictionId) || null;
  }

  /**
   * Enable jurisdiction
   */
  enableJurisdiction(jurisdictionId: string): boolean {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) return false;

    jurisdiction.enabled = true;
    jurisdiction.updatedAt = new Date().toISOString();
    this.jurisdictions.set(jurisdictionId, jurisdiction);

    console.log(`[Phase2] Enabled jurisdiction: ${jurisdiction.code}`);
    return true;
  }

  /**
   * Disable jurisdiction
   */
  disableJurisdiction(jurisdictionId: string): boolean {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) return false;

    jurisdiction.enabled = false;
    jurisdiction.updatedAt = new Date().toISOString();
    this.jurisdictions.set(jurisdictionId, jurisdiction);

    return true;
  }

  /**
   * Add jurisdiction
   */
  addJurisdiction(
    input: Omit<Jurisdiction, "id" | "createdAt" | "updatedAt">
  ): Jurisdiction {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const jurisdiction: Jurisdiction = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.jurisdictions.set(id, jurisdiction);
    return jurisdiction;
  }

  /**
   * Update jurisdiction contact
   */
  updateJurisdictionContact(
    jurisdictionId: string,
    contact: Jurisdiction["primaryContact"]
  ): boolean {
    const jurisdiction = this.jurisdictions.get(jurisdictionId);
    if (!jurisdiction) return false;

    jurisdiction.primaryContact = contact;
    jurisdiction.updatedAt = new Date().toISOString();
    this.jurisdictions.set(jurisdictionId, jurisdiction);

    return true;
  }

  // ==================== AGREEMENTS ====================

  /**
   * Create jurisdiction agreement
   */
  createAgreement(
    input: Omit<JurisdictionAgreement, "id" | "signatories">
  ): JurisdictionAgreement {
    const id = crypto.randomUUID();

    const agreement: JurisdictionAgreement = {
      ...input,
      id,
      signatories: [],
    };

    this.agreements.set(id, agreement);
    return agreement;
  }

  /**
   * Get agreement
   */
  getAgreement(agreementId: string): JurisdictionAgreement | null {
    return this.agreements.get(agreementId) || null;
  }

  /**
   * List agreements
   */
  listAgreements(jurisdictionId?: string): JurisdictionAgreement[] {
    let agreements = Array.from(this.agreements.values());

    if (jurisdictionId) {
      agreements = agreements.filter((a) =>
        a.jurisdictionIds.includes(jurisdictionId)
      );
    }

    return agreements;
  }

  /**
   * Sign agreement
   */
  signAgreement(
    agreementId: string,
    jurisdictionId: string,
    signedBy: string
  ): boolean {
    const agreement = this.agreements.get(agreementId);
    if (!agreement) return false;

    if (!agreement.jurisdictionIds.includes(jurisdictionId)) return false;

    // Check if already signed
    if (agreement.signatories.some((s) => s.jurisdictionId === jurisdictionId)) {
      return false;
    }

    agreement.signatories.push({
      jurisdictionId,
      signedBy,
      signedAt: new Date().toISOString(),
    });

    // Activate if all parties signed
    if (agreement.signatories.length === agreement.jurisdictionIds.length) {
      agreement.status = "active";
    }

    this.agreements.set(agreementId, agreement);
    return true;
  }

  /**
   * Get expansion roadmap
   */
  getExpansionRoadmap(): Array<{
    phase: number;
    jurisdictions: string[];
    targetDate: string;
    status: "completed" | "in_progress" | "planned";
  }> {
    return [
      {
        phase: 1,
        jurisdictions: ["ca-qc", "ca-on"],
        targetDate: "2026-01-15",
        status: "completed",
      },
      {
        phase: 2,
        jurisdictions: ["ca-bc", "ca-ab"],
        targetDate: "2026-03-01",
        status: "in_progress",
      },
      {
        phase: 3,
        jurisdictions: ["ca-mb", "ca-sk", "ca-ns", "ca-nb"],
        targetDate: "2026-06-01",
        status: "planned",
      },
      {
        phase: 4,
        jurisdictions: ["ca-nl", "ca-pe", "ca-nt", "ca-yt", "ca-nu"],
        targetDate: "2026-09-01",
        status: "planned",
      },
    ];
  }
}

export const phase2GatingService = new Phase2GatingService();
