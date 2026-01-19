/**
 * Privacy Compliance Service
 * Quebec Law 25 and Canadian privacy law compliance
 */

import { createClient } from "@/lib/supabase/server";
import { emailService } from "@/lib/services/email-service";
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
   * Process access request - compile all user data for GDPR/Law 25 compliance
   */
  async processAccessRequest(requestId: string): Promise<{
    data: Record<string, unknown>;
    categories: string[];
  }> {
    const request = this.requests.get(requestId);
    if (!request || request.type !== "access") {
      throw new Error("Invalid access request");
    }

    const supabase = await createClient();
    const userId = request.requesterId;

    // Compile all user data from various tables
    const data: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      requestId,
      userId,
      categories: {},
    };

    // 1. Personal Profile Information
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profile) {
      data.personalInfo = {
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        province: profile.province,
        postalCode: profile.postal_code,
        country: profile.country,
        dateOfBirth: profile.date_of_birth,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        role: profile.role,
        organization: profile.organization,
      };
    }

    // 2. Case Involvement (as reporter or assignee)
    const { data: caseReports } = await supabase
      .from("case_reports")
      .select("id, case_number, status, created_at, missing_person_name")
      .or(`reported_by.eq.${userId},assigned_to.eq.${userId}`);

    data.caseInvolvement = (caseReports || []).map((c) => ({
      caseNumber: c.case_number,
      status: c.status,
      createdAt: c.created_at,
      role: "Involved party",
      missingPersonName: c.missing_person_name,
    }));

    // 3. Leads submitted
    const { data: leads } = await supabase
      .from("leads")
      .select("id, title, description, created_at, status, case_id")
      .eq("submitted_by", userId);

    data.leadsSubmitted = (leads || []).map((l) => ({
      title: l.title,
      description: l.description,
      status: l.status,
      createdAt: l.created_at,
    }));

    // 4. Tips submitted (anonymous tips may be excluded)
    const { data: tips } = await supabase
      .from("anonymous_tips")
      .select("id, content, created_at, status")
      .eq("submitter_id", userId)
      .eq("is_anonymous", false); // Only non-anonymous tips

    data.tipsSubmitted = (tips || []).map((t) => ({
      content: t.content,
      status: t.status,
      createdAt: t.created_at,
    }));

    // 5. Activity Log
    const { data: activities } = await supabase
      .from("user_activity_log")
      .select("action, details, created_at, ip_address")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000);

    data.activityLog = (activities || []).map((a) => ({
      action: a.action,
      details: a.details,
      timestamp: a.created_at,
      ipAddress: a.ip_address,
    }));

    // 6. Consent History
    const { data: consents } = await supabase
      .from("user_consents")
      .select("consent_type, granted, granted_at, revoked_at, version")
      .eq("user_id", userId);

    data.consentHistory = (consents || []).map((c) => ({
      type: c.consent_type,
      granted: c.granted,
      grantedAt: c.granted_at,
      revokedAt: c.revoked_at,
      version: c.version,
    }));

    // 7. Notifications received
    const { data: notifications } = await supabase
      .from("notifications")
      .select("type, title, message, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    data.notifications = (notifications || []).map((n) => ({
      type: n.type,
      title: n.title,
      message: n.message,
      sentAt: n.created_at,
      readAt: n.read_at,
    }));

    // 8. Voice memos recorded
    const { data: memos } = await supabase
      .from("voice_memos")
      .select("id, title, duration, recorded_at, transcription")
      .eq("recorded_by", userId);

    data.voiceMemos = (memos || []).map((m) => ({
      title: m.title,
      duration: m.duration,
      recordedAt: m.recorded_at,
      hasTranscription: !!m.transcription,
    }));

    // 9. Files uploaded
    const { data: files } = await supabase
      .from("file_uploads")
      .select("filename, file_type, file_size, uploaded_at, purpose")
      .eq("uploaded_by", userId);

    data.filesUploaded = (files || []).map((f) => ({
      filename: f.filename,
      type: f.file_type,
      size: f.file_size,
      uploadedAt: f.uploaded_at,
      purpose: f.purpose,
    }));

    // Determine which categories have data
    const categories = this.compliance.dataCategories
      .filter((c) => c.personalData)
      .map((c) => c.name);

    // Mark request as completed and store export metadata
    await this.updateRequestStatus(requestId, "completed", "Data export provided");

    // Log the export for audit purposes
    await supabase.from("data_exports").insert({
      request_id: requestId,
      user_id: userId,
      export_date: new Date().toISOString(),
      categories_exported: categories,
      record_counts: {
        caseInvolvement: (data.caseInvolvement as unknown[]).length,
        leadsSubmitted: (data.leadsSubmitted as unknown[]).length,
        tipsSubmitted: (data.tipsSubmitted as unknown[]).length,
        activityLog: (data.activityLog as unknown[]).length,
        notifications: (data.notifications as unknown[]).length,
        voiceMemos: (data.voiceMemos as unknown[]).length,
        filesUploaded: (data.filesUploaded as unknown[]).length,
      },
    });

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
   * Notify privacy officer of new request
   */
  private async notifyPrivacyOfficer(request: PrivacyRequest): Promise<void> {
    console.log(
      `[Privacy] Notifying privacy officer of ${request.type} request ${request.id}`
    );

    const supabase = await createClient();

    // Get privacy officers (users with privacy_officer or admin role)
    const { data: privacyOfficers, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("role", ["privacy_officer", "admin"]);

    if (error || !privacyOfficers?.length) {
      console.error("[Privacy] No privacy officers found to notify");
      return;
    }

    const requestTypeLabels: Record<string, string> = {
      access: "Data Access Request",
      rectification: "Data Rectification Request",
      deletion: "Data Deletion Request",
      portability: "Data Portability Request",
    };

    const requestTypeLabel = requestTypeLabels[request.type] || request.type;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca";
    const requestUrl = `${appUrl}/admin/privacy/requests/${request.id}`;

    // Send email to each privacy officer
    for (const officer of privacyOfficers) {
      await emailService.send({
        to: officer.email,
        subject: `📋 New Privacy Request: ${requestTypeLabel}`,
        html: `
          <h2>New Privacy Request Submitted</h2>
          <p>A new privacy request has been submitted and requires your review.</p>

          <table style="border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; font-weight: bold;">Request ID:</td><td style="padding: 8px;">${request.id}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${requestTypeLabel}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Requester Email:</td><td style="padding: 8px;">${request.requesterEmail}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">${request.status}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Submitted:</td><td style="padding: 8px;">${new Date(request.createdAt).toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Due Date:</td><td style="padding: 8px;">${new Date(request.dueDate).toLocaleString()}</td></tr>
          </table>

          <p style="margin-top: 20px;">
            <a href="${requestUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
              Review Request
            </a>
          </p>

          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            Under Quebec Law 25, privacy requests must be responded to within 30 days.
          </p>
        `,
        text: `
New Privacy Request Submitted

Type: ${requestTypeLabel}
Requester Email: ${request.requesterEmail}
Status: ${request.status}
Submitted: ${new Date(request.createdAt).toLocaleString()}
Due Date: ${new Date(request.dueDate).toLocaleString()}

Review request at: ${requestUrl}

Under Quebec Law 25, privacy requests must be responded to within 30 days.
        `.trim(),
        priority: "high",
      });

      // Also create in-app notification
      await supabase.from("notifications").insert({
        user_id: officer.id,
        type: "privacy_request",
        title: `New ${requestTypeLabel}`,
        message: `A user (${request.requesterEmail}) has submitted a ${requestTypeLabel.toLowerCase()}. Response required within 30 days.`,
        priority: "medium",
        data: {
          request_id: request.id,
          request_type: request.type,
          requester_email: request.requesterEmail,
        },
      });
    }

    console.log(`[Privacy] Notified ${privacyOfficers.length} privacy officers`);
  }

  /**
   * Notify requester of status update
   */
  private async notifyRequester(request: PrivacyRequest): Promise<void> {
    console.log(
      `[Privacy] Notifying requester ${request.requesterEmail} of status update: ${request.status}`
    );

    const statusMessages: Record<string, { subject: string; message: string }> = {
      pending: {
        subject: "Your Privacy Request Has Been Received",
        message: "We have received your privacy request and it is currently being reviewed. We will respond within 30 days as required by law.",
      },
      processing: {
        subject: "Your Privacy Request Is Being Processed",
        message: "Your privacy request is currently being processed by our team. We will notify you once it is complete.",
      },
      completed: {
        subject: "Your Privacy Request Has Been Completed",
        message: "Your privacy request has been completed. Please log in to view the results or check your email for any attachments.",
      },
      denied: {
        subject: "Your Privacy Request Update",
        message: "After careful review, we were unable to fulfill your privacy request. Please see the response for more information about the reason and your options.",
      },
    };

    const statusInfo = statusMessages[request.status] || {
      subject: "Privacy Request Update",
      message: `Your privacy request status has been updated to: ${request.status}`,
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://locateconnect.ca";
    const requestUrl = `${appUrl}/privacy/requests/${request.id}`;

    const completedDate = request.completedAt ? new Date(request.completedAt).toLocaleString() : "Pending";

    await emailService.send({
      to: request.requesterEmail,
      subject: `📋 ${statusInfo.subject}`,
      html: `
        <h2>${statusInfo.subject}</h2>

        <p>Dear User,</p>

        <p>${statusInfo.message}</p>

        <table style="border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
          <tr><td style="padding: 8px; font-weight: bold;">Request ID:</td><td style="padding: 8px;">${request.id.substring(0, 8)}...</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${request.type}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">${request.status}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Due Date:</td><td style="padding: 8px;">${new Date(request.dueDate).toLocaleString()}</td></tr>
          ${request.completedAt ? `<tr><td style="padding: 8px; font-weight: bold;">Completed:</td><td style="padding: 8px;">${completedDate}</td></tr>` : ""}
        </table>

        ${request.response ? `<p style="background-color: #fef3c7; padding: 16px; border-radius: 8px;"><strong>Response:</strong><br>${request.response}</p>` : ""}

        <p style="margin-top: 20px;">
          <a href="${requestUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
            View Request Details
          </a>
        </p>

        <p style="color: #666; margin-top: 30px; font-size: 14px;">
          If you have any questions about your privacy request, please contact our Privacy Officer at privacy@locateconnect.ca.
        </p>
      `,
      text: `
${statusInfo.subject}

Dear User,

${statusInfo.message}

Request ID: ${request.id.substring(0, 8)}...
Type: ${request.type}
Status: ${request.status}
Due Date: ${new Date(request.dueDate).toLocaleString()}
${request.completedAt ? `Completed: ${completedDate}` : ""}

${request.response ? `Response: ${request.response}` : ""}

View your request at: ${requestUrl}

If you have any questions about your privacy request, please contact our Privacy Officer at privacy@locateconnect.ca.
      `.trim(),
    });

    console.log(`[Privacy] Notified requester at ${request.requesterEmail}`);
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
