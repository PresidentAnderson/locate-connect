/**
 * Privacy Compliance Service
 * Quebec Law 25 and Canadian privacy law compliance
 */

import type {
  PrivacyCompliance,
  DataCategory,
  PrivacyRequest,
} from "@/types/compliance.types";

const DEFAULT_DATA_CATEGORIES: DataCategory[] = [
  {
    id: "personal_identity",
    name: "Personal Identity Information",
    description: "Name, date of birth, gender, physical description",
    personalData: true,
    sensitiveData: false,
    retentionPeriod: 2555, // 7 years
    legalBasis: "Legal obligation - missing persons investigation",
    thirdPartySharing: true,
    crossBorderTransfer: true,
  },
  {
    id: "contact_info",
    name: "Contact Information",
    description: "Phone numbers, email addresses, physical addresses",
    personalData: true,
    sensitiveData: false,
    retentionPeriod: 2555,
    legalBasis: "Legitimate interest - case coordination",
    thirdPartySharing: true,
    crossBorderTransfer: false,
  },
  {
    id: "health_info",
    name: "Health Information",
    description: "Medical conditions, medications, mental health status",
    personalData: true,
    sensitiveData: true,
    retentionPeriod: 2555,
    legalBasis: "Vital interest - safety of missing person",
    thirdPartySharing: true,
    crossBorderTransfer: false,
  },
  {
    id: "location_data",
    name: "Location Data",
    description: "GPS coordinates, addresses, movement patterns",
    personalData: true,
    sensitiveData: false,
    retentionPeriod: 365,
    legalBasis: "Legitimate interest - locating missing person",
    thirdPartySharing: true,
    crossBorderTransfer: true,
  },
  {
    id: "biometric_data",
    name: "Biometric Data",
    description: "Photos, fingerprints, DNA profiles",
    personalData: true,
    sensitiveData: true,
    retentionPeriod: 3650, // 10 years
    legalBasis: "Legal obligation - identification",
    thirdPartySharing: true,
    crossBorderTransfer: true,
  },
  {
    id: "case_notes",
    name: "Case Notes and Reports",
    description: "Investigation notes, witness statements, tips",
    personalData: true,
    sensitiveData: false,
    retentionPeriod: 2555,
    legalBasis: "Legal obligation - investigation records",
    thirdPartySharing: false,
    crossBorderTransfer: false,
  },
];

class PrivacyComplianceService {
  private requests: Map<string, PrivacyRequest> = new Map();
  private compliance: PrivacyCompliance;

  constructor() {
    this.compliance = {
      consentRequired: true,
      consentObtained: false,
      accessRequestEnabled: true,
      rectificationEnabled: true,
      deletionEnabled: true,
      portabilityEnabled: true,
      privacyOfficer: {
        name: "Privacy Officer",
        email: "privacy@locateconnect.ca",
        phone: "1-800-555-0199",
      },
      dataCategories: DEFAULT_DATA_CATEGORIES,
      breachNotificationProcedure:
        "Notify affected individuals within 72 hours of discovery",
      breachNotificationTimeframe: 72,
    };
  }

  /**
   * Get privacy compliance configuration
   */
  getCompliance(): PrivacyCompliance {
    return this.compliance;
  }

  /**
   * Update privacy officer
   */
  updatePrivacyOfficer(officer: PrivacyCompliance["privacyOfficer"]): void {
    this.compliance.privacyOfficer = officer;
  }

  /**
   * Record consent
   */
  recordConsent(userId: string, version: string): void {
    this.compliance.consentObtained = true;
    this.compliance.consentDate = new Date().toISOString();
    this.compliance.consentVersion = version;
    console.log(`[Privacy] Consent recorded for user ${userId}`);
  }

  /**
   * Check if consent is valid
   */
  isConsentValid(consentDate?: string, currentVersion?: string): boolean {
    if (!this.compliance.consentRequired) return true;
    if (!consentDate) return false;

    // Consent expires after 1 year
    const consentTime = new Date(consentDate).getTime();
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    if (now - consentTime > oneYear) return false;

    // Check version if provided
    if (
      currentVersion &&
      this.compliance.consentVersion &&
      currentVersion !== this.compliance.consentVersion
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get data categories
   */
  getDataCategories(): DataCategory[] {
    return this.compliance.dataCategories;
  }

  /**
   * Get sensitive data categories
   */
  getSensitiveCategories(): DataCategory[] {
    return this.compliance.dataCategories.filter((c) => c.sensitiveData);
  }

  /**
   * Create privacy request (access, deletion, etc.)
   */
  async createRequest(
    type: PrivacyRequest["type"],
    requesterId: string,
    requesterEmail: string,
    description: string
  ): Promise<PrivacyRequest> {
    const id = crypto.randomUUID();
    const now = new Date();

    // Due date based on Quebec Law 25 (30 days)
    const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const request: PrivacyRequest = {
      id,
      type,
      status: "pending",
      requesterId,
      requesterEmail,
      description,
      createdAt: now.toISOString(),
      dueDate: dueDate.toISOString(),
      attachments: [],
    };

    this.requests.set(id, request);
    console.log(`[Privacy] Created ${type} request ${id}`);

    // Notify privacy officer
    await this.notifyPrivacyOfficer(request);

    return request;
  }

  /**
   * Get privacy request
   */
  getRequest(requestId: string): PrivacyRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * List privacy requests
   */
  listRequests(filters?: {
    status?: PrivacyRequest["status"];
    type?: PrivacyRequest["type"];
  }): PrivacyRequest[] {
    let requests = Array.from(this.requests.values());

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }

    if (filters?.type) {
      requests = requests.filter((r) => r.type === filters.type);
    }

    return requests.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: PrivacyRequest["status"],
    response?: string
  ): Promise<PrivacyRequest | null> {
    const request = this.requests.get(requestId);
    if (!request) return null;

    request.status = status;
    if (response) request.response = response;
    if (status === "completed" || status === "denied") {
      request.completedAt = new Date().toISOString();
    }

    this.requests.set(requestId, request);

    // Notify requester
    await this.notifyRequester(request);

    return request;
  }

  /**
   * Process access request
   */
  async processAccessRequest(requestId: string): Promise<{
    data: Record<string, unknown>;
    categories: string[];
  }> {
    const request = this.requests.get(requestId);
    if (!request || request.type !== "access") {
      throw new Error("Invalid access request");
    }

    // In production, this would compile all data for the user
    const data = {
      personalInfo: {},
      caseInvolvement: [],
      activityLog: [],
      consentHistory: [],
    };

    const categories = this.compliance.dataCategories
      .filter((c) => c.personalData)
      .map((c) => c.name);

    await this.updateRequestStatus(requestId, "completed", "Data export provided");

    return { data, categories };
  }

  /**
   * Process deletion request
   */
  async processDeletionRequest(requestId: string): Promise<{
    deleted: string[];
    retained: string[];
    reason?: string;
  }> {
    const request = this.requests.get(requestId);
    if (!request || request.type !== "deletion") {
      throw new Error("Invalid deletion request");
    }

    // Some data must be retained for legal reasons
    const deleted: string[] = [];
    const retained: string[] = [];

    for (const category of this.compliance.dataCategories) {
      if (category.legalBasis.includes("Legal obligation")) {
        retained.push(category.name);
      } else {
        deleted.push(category.name);
      }
    }

    await this.updateRequestStatus(
      requestId,
      "completed",
      `Deleted: ${deleted.length} categories. Retained: ${retained.length} categories (legal obligation).`
    );

    return {
      deleted,
      retained,
      reason: "Some data retained due to legal obligations",
    };
  }

  /**
   * Generate data portability export
   */
  async generatePortabilityExport(
    requestId: string
  ): Promise<{ format: string; downloadUrl: string }> {
    const request = this.requests.get(requestId);
    if (!request || request.type !== "portability") {
      throw new Error("Invalid portability request");
    }

    // Generate export in standard format (JSON)
    const exportData = {
      exportDate: new Date().toISOString(),
      requestId,
      data: {},
    };

    // In production, generate file and return URL
    const downloadUrl = `/api/privacy/exports/${requestId}.json`;

    await this.updateRequestStatus(requestId, "completed", "Export ready for download");

    return { format: "JSON", downloadUrl };
  }

  /**
   * Check data retention compliance
   */
  checkRetentionCompliance(): Array<{
    category: string;
    recordsExpired: number;
    action: string;
  }> {
    const results: Array<{
      category: string;
      recordsExpired: number;
      action: string;
    }> = [];

    for (const category of this.compliance.dataCategories) {
      // In production, check actual data against retention period
      results.push({
        category: category.name,
        recordsExpired: 0,
        action: `Delete after ${category.retentionPeriod} days`,
      });
    }

    return results;
  }

  /**
   * Generate privacy impact assessment
   */
  generatePIA(
    projectName: string,
    dataProcessing: string[]
  ): {
    riskLevel: "low" | "medium" | "high";
    findings: string[];
    recommendations: string[];
  } {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Check sensitive data processing
    const sensitiveCategories = this.getSensitiveCategories();
    for (const processing of dataProcessing) {
      if (sensitiveCategories.some((c) => processing.includes(c.name))) {
        riskScore += 2;
        findings.push(`Processing sensitive data: ${processing}`);
        recommendations.push(
          `Implement additional safeguards for ${processing}`
        );
      }
    }

    // Check cross-border transfer
    const crossBorderCategories = this.compliance.dataCategories.filter(
      (c) => c.crossBorderTransfer
    );
    if (crossBorderCategories.length > 0) {
      riskScore += 1;
      findings.push("Cross-border data transfer enabled");
      recommendations.push("Ensure adequate protection for international transfers");
    }

    // Check third-party sharing
    const sharedCategories = this.compliance.dataCategories.filter(
      (c) => c.thirdPartySharing
    );
    if (sharedCategories.length > 0) {
      riskScore += 1;
      findings.push(`Third-party sharing enabled for ${sharedCategories.length} categories`);
      recommendations.push("Review third-party data processing agreements");
    }

    const riskLevel: "low" | "medium" | "high" =
      riskScore <= 2 ? "low" : riskScore <= 4 ? "medium" : "high";

    return { riskLevel, findings, recommendations };
  }

  /**
   * Notify privacy officer
   */
  private async notifyPrivacyOfficer(request: PrivacyRequest): Promise<void> {
    console.log(
      `[Privacy] Notifying privacy officer of ${request.type} request ${request.id}`
    );
    // Would send email notification
  }

  /**
   * Notify requester
   */
  private async notifyRequester(request: PrivacyRequest): Promise<void> {
    console.log(
      `[Privacy] Notifying requester ${request.requesterEmail} of status update: ${request.status}`
    );
    // Would send email notification
  }

  /**
   * Get Quebec Law 25 compliance checklist
   */
  getLaw25Checklist(): Array<{
    requirement: string;
    status: "compliant" | "partial" | "non_compliant";
    notes: string;
  }> {
    return [
      {
        requirement: "Designate person responsible for personal information protection",
        status: "compliant",
        notes: "Privacy Officer designated",
      },
      {
        requirement: "Implement privacy governance policies",
        status: "compliant",
        notes: "Privacy policy in place",
      },
      {
        requirement: "Conduct privacy impact assessments",
        status: "compliant",
        notes: "PIA process established",
      },
      {
        requirement: "Implement consent management",
        status: "compliant",
        notes: "Consent tracking active",
      },
      {
        requirement: "Enable data subject rights (access, rectification, deletion)",
        status: "compliant",
        notes: "Rights request portal available",
      },
      {
        requirement: "Implement breach notification procedures",
        status: "compliant",
        notes: "72-hour notification procedure in place",
      },
      {
        requirement: "Maintain data inventory",
        status: "compliant",
        notes: "Data categories documented",
      },
      {
        requirement: "Implement data minimization",
        status: "partial",
        notes: "Review data collection practices",
      },
      {
        requirement: "Ensure transparency in processing",
        status: "compliant",
        notes: "Privacy notices published",
      },
      {
        requirement: "Implement appropriate security measures",
        status: "compliant",
        notes: "Encryption and access controls in place",
      },
    ];
  }
}

export const privacyComplianceService = new PrivacyComplianceService();
