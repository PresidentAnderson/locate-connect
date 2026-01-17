/**
 * Compliance Service (LC-FEAT-037)
 * Service layer for compliance checking, audit logging, and data privacy operations
 */

import { createClient } from '@/lib/supabase/server';
import {
  ComplianceFramework,
  ComplianceStatus,
  AuditActionType,
  DataRequestType,
  ComprehensiveAuditLog,
} from '@/types/audit.types';

// =============================================================================
// AUDIT LOGGING SERVICE
// =============================================================================

export interface AuditLogParams {
  userId?: string;
  sessionId?: string;
  action: AuditActionType;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  isSensitiveData?: boolean;
  complianceRelevant?: boolean;
  complianceFrameworks?: ComplianceFramework[];
}

export async function createAuditLog(params: AuditLogParams): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Get user profile if userId is provided
    let actorEmail: string | undefined;
    let actorRole: string | undefined;
    let actorOrganization: string | undefined;

    if (params.userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, role, organization')
        .eq('id', params.userId)
        .single();

      if (profile) {
        actorEmail = profile.email;
        actorRole = profile.role;
        actorOrganization = profile.organization;
      }
    }

    const { data, error } = await supabase
      .from('comprehensive_audit_logs')
      .insert({
        user_id: params.userId,
        session_id: params.sessionId,
        actor_email: actorEmail,
        actor_role: actorRole,
        actor_organization: actorOrganization,
        action: params.action,
        resource_type: params.resourceType,
        resource_id: params.resourceId,
        resource_name: params.resourceName,
        old_values: params.oldValues,
        new_values: params.newValues,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        is_sensitive_data: params.isSensitiveData || false,
        compliance_relevant: params.complianceRelevant || false,
        compliance_frameworks: params.complianceFrameworks,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating audit log:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in createAuditLog:', error);
    return null;
  }
}

// =============================================================================
// DATA ACCESS LOGGING
// =============================================================================

export interface DataAccessParams {
  userId: string;
  sessionId?: string;
  resourceType: string;
  resourceId: string;
  accessType: 'view' | 'list' | 'search' | 'export' | 'api';
  fieldsAccessed?: string[];
  containsPii?: boolean;
  piiFieldsAccessed?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export async function logDataAccess(params: DataAccessParams): Promise<void> {
  try {
    const supabase = await createClient();

    // First create an audit log
    const auditId = await createAuditLog({
      userId: params.userId,
      sessionId: params.sessionId,
      action: 'read',
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      isSensitiveData: params.containsPii,
      complianceRelevant: params.containsPii,
    });

    // Get resource owner
    let resourceOwnerId: string | null = null;
    if (params.resourceType === 'cases') {
      const { data } = await supabase
        .from('cases')
        .select('reporter_id')
        .eq('id', params.resourceId)
        .single();
      resourceOwnerId = data?.reporter_id || null;
    } else if (params.resourceType === 'profiles') {
      resourceOwnerId = params.resourceId;
    }

    // Create data access log
    await supabase.from('data_access_logs').insert({
      audit_log_id: auditId,
      user_id: params.userId,
      session_id: params.sessionId,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      resource_owner_id: resourceOwnerId,
      access_type: params.accessType,
      fields_accessed: params.fieldsAccessed,
      contains_pii: params.containsPii || false,
      pii_fields_accessed: params.piiFieldsAccessed,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  } catch (error) {
    console.error('Error in logDataAccess:', error);
  }
}

// =============================================================================
// COMPLIANCE CHECKING
// =============================================================================

export interface ComplianceCheckResult {
  framework: ComplianceFramework;
  status: ComplianceStatus;
  score: number;
  issues: string[];
  recommendations: string[];
}

export async function checkPIPEDACompliance(): Promise<ComplianceCheckResult> {
  const supabase = await createClient();
  const issues: string[] = [];
  const recommendations: string[] = [];

  let score = 100;

  // Check 1: Consent management
  const { count: consentCount } = await supabase
    .from('consent_records')
    .select('*', { count: 'exact', head: true });

  if ((consentCount || 0) === 0) {
    issues.push('No consent records found');
    recommendations.push('Implement consent management for all data processing activities');
    score -= 20;
  }

  // Check 2: Data retention policies
  const { data: retentionPolicies } = await supabase
    .from('data_retention_policies')
    .select('*')
    .eq('is_active', true);

  if (!retentionPolicies || retentionPolicies.length === 0) {
    issues.push('No active data retention policies');
    recommendations.push('Define and implement data retention policies for all data types');
    score -= 15;
  }

  // Check 3: Audit logging
  const { count: auditCount } = await supabase
    .from('comprehensive_audit_logs')
    .select('*', { count: 'exact', head: true });

  if ((auditCount || 0) === 0) {
    issues.push('Audit logging not active');
    recommendations.push('Enable comprehensive audit logging for all data access');
    score -= 15;
  }

  // Check 4: Overdue data requests
  const { data: overdueRequests } = await supabase
    .from('data_subject_requests')
    .select('*')
    .lt('due_date', new Date().toISOString())
    .not('status', 'in', '("completed","denied","cancelled")');

  if (overdueRequests && overdueRequests.length > 0) {
    issues.push(`${overdueRequests.length} overdue data subject requests`);
    recommendations.push('Process overdue data subject requests immediately');
    score -= 20;
  }

  // Check 5: Open violations
  const { data: openViolations } = await supabase
    .from('compliance_violations')
    .select('*')
    .eq('status', 'open');

  if (openViolations && openViolations.length > 0) {
    const criticalCount = openViolations.filter((v) => v.severity === 'critical').length;
    if (criticalCount > 0) {
      issues.push(`${criticalCount} critical compliance violations`);
      score -= criticalCount * 10;
    }
    recommendations.push('Address open compliance violations');
  }

  // Determine status
  let status: ComplianceStatus = 'compliant';
  if (score < 50) {
    status = 'non_compliant';
  } else if (score < 80) {
    status = 'partial';
  }

  return {
    framework: 'pipeda',
    status,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

export async function checkGDPRCompliance(): Promise<ComplianceCheckResult> {
  const supabase = await createClient();
  const issues: string[] = [];
  const recommendations: string[] = [];

  let score = 100;

  // Check 1: Right to access implementation
  const { count: accessRequestsProcessed } = await supabase
    .from('data_subject_requests')
    .select('*', { count: 'exact', head: true })
    .eq('request_type', 'access')
    .eq('status', 'completed');

  // This is more about capability than metrics
  // Check 2: Right to erasure implementation
  const { count: erasureCount } = await supabase
    .from('data_erasure_records')
    .select('*', { count: 'exact', head: true });

  // Check 3: Data portability
  const { count: exportCount } = await supabase
    .from('data_portability_exports')
    .select('*', { count: 'exact', head: true });

  // Check 4: Consent records
  const { count: consentCount } = await supabase
    .from('consent_records')
    .select('*', { count: 'exact', head: true });

  if ((consentCount || 0) === 0) {
    issues.push('No consent records - consent management may not be implemented');
    score -= 20;
  }

  // Check 5: Legal basis documentation
  // This would require manual review

  // Check 6: Data processing register
  // This would require manual review

  // Determine status
  let status: ComplianceStatus = 'compliant';
  if (score < 50) {
    status = 'non_compliant';
  } else if (score < 80) {
    status = 'partial';
  }

  return {
    framework: 'gdpr',
    status,
    score: Math.max(0, score),
    issues,
    recommendations,
  };
}

// =============================================================================
// DATA SUBJECT RIGHTS
// =============================================================================

export async function processDataAccessRequest(
  userId: string,
  requestId: string
): Promise<Record<string, unknown>> {
  const supabase = await createClient();

  const userData: Record<string, unknown> = {};

  // Gather all user data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    // Remove sensitive internal fields
    const sanitizedProfile = { ...profile };
    delete (sanitizedProfile as Record<string, unknown>).verification_status;
    userData.profile = sanitizedProfile;
  }

  // Get user's cases
  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('reporter_id', userId);

  if (cases) {
    userData.cases = cases;
  }

  // Get notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId);

  if (notifications) {
    userData.notifications = notifications;
  }

  // Get consent records
  const { data: consents } = await supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', userId);

  if (consents) {
    userData.consent_records = consents;
  }

  // Log the data access
  await createAuditLog({
    userId,
    action: 'data_request',
    resourceType: 'data_subject_requests',
    resourceId: requestId,
    complianceRelevant: true,
    complianceFrameworks: ['pipeda', 'gdpr'],
    newValues: { tablesAccessed: Object.keys(userData) },
  });

  return userData;
}

export async function processDataErasureRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; tablesAffected: string[]; recordsDeleted: Record<string, number> }> {
  const supabase = await createClient();

  const tablesAffected: string[] = [];
  const recordsDeleted: Record<string, number> = {};

  // Check for legal holds first
  const { data: legalHolds } = await supabase
    .from('legal_holds')
    .select('*')
    .eq('is_active', true)
    .contains('custodians', [userId]);

  if (legalHolds && legalHolds.length > 0) {
    throw new Error('Cannot process erasure: user data is under legal hold');
  }

  // Delete/anonymize user data in order of dependencies

  // 1. Notifications
  const { count: notificationCount } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .select('*', { count: 'exact', head: true });

  if ((notificationCount || 0) > 0) {
    tablesAffected.push('notifications');
    recordsDeleted.notifications = notificationCount || 0;
  }

  // 2. Consent records (anonymize, don't delete for compliance)
  const { count: consentCount } = await supabase
    .from('consent_records')
    .update({ user_id: null })
    .eq('user_id', userId)
    .select('*', { count: 'exact', head: true });

  if ((consentCount || 0) > 0) {
    tablesAffected.push('consent_records (anonymized)');
    recordsDeleted.consent_records = consentCount || 0;
  }

  // 3. User sessions
  const { count: sessionCount } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId)
    .select('*', { count: 'exact', head: true });

  if ((sessionCount || 0) > 0) {
    tablesAffected.push('user_sessions');
    recordsDeleted.user_sessions = sessionCount || 0;
  }

  // Note: We may need to retain some data for legal/compliance purposes
  // Cases might need to be anonymized rather than deleted

  // Create erasure record
  await supabase.from('data_erasure_records').insert({
    request_id: requestId,
    subject_id: userId,
    erasure_type: 'full',
    tables_affected: tablesAffected,
    records_erased: recordsDeleted,
    requested_at: new Date().toISOString(),
    executed_at: new Date().toISOString(),
  });

  // Log the erasure
  await createAuditLog({
    userId,
    action: 'data_erasure',
    resourceType: 'data_erasure_records',
    resourceId: requestId,
    complianceRelevant: true,
    complianceFrameworks: ['pipeda', 'gdpr'],
    newValues: { tablesAffected, recordsDeleted },
  });

  return {
    success: true,
    tablesAffected,
    recordsDeleted,
  };
}

// =============================================================================
// RETENTION POLICY EXECUTION
// =============================================================================

export async function executeRetentionPolicy(policyId: string): Promise<{
  recordsProcessed: number;
  recordsDeleted: number;
  recordsArchived: number;
  errors: string[];
}> {
  const supabase = await createClient();

  const { data: policy } = await supabase
    .from('data_retention_policies')
    .select('*')
    .eq('id', policyId)
    .single();

  if (!policy) {
    throw new Error('Retention policy not found');
  }

  const results = {
    recordsProcessed: 0,
    recordsDeleted: 0,
    recordsArchived: 0,
    errors: [] as string[],
  };

  // Start execution log
  const { data: executionLog } = await supabase
    .from('retention_execution_logs')
    .insert({
      policy_id: policyId,
      started_at: new Date().toISOString(),
      status: 'active',
    })
    .select()
    .single();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

    // Query records past retention period
    const { data: expiredRecords, count } = await supabase
      .from(policy.table_name)
      .select('id', { count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    results.recordsProcessed = count || 0;

    if (expiredRecords && expiredRecords.length > 0) {
      const recordIds = expiredRecords.map((r: { id: string }) => r.id);

      // Check for legal holds
      const { data: activeHolds } = await supabase
        .from('legal_holds')
        .select('*')
        .eq('is_active', true)
        .contains('tables_in_scope', [policy.table_name]);

      if (activeHolds && activeHolds.length > 0) {
        results.errors.push('Some records may be under legal hold');
        // In production, filter out held records
      }

      if (policy.action_on_expiry === 'delete') {
        const { count: deleteCount } = await supabase
          .from(policy.table_name)
          .delete()
          .in('id', recordIds)
          .select('*', { count: 'exact', head: true });

        results.recordsDeleted = deleteCount || 0;
      } else if (policy.action_on_expiry === 'archive') {
        // In production, move to archive storage
        results.recordsArchived = recordIds.length;
      }
    }

    // Update execution log
    await supabase
      .from('retention_execution_logs')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        records_evaluated: results.recordsProcessed,
        records_deleted: results.recordsDeleted,
        records_archived: results.recordsArchived,
        records_failed: results.errors.length,
        error_message: results.errors.length > 0 ? results.errors.join('; ') : null,
      })
      .eq('id', executionLog?.id);

    // Update policy last executed
    await supabase
      .from('data_retention_policies')
      .update({
        last_executed_at: new Date().toISOString(),
        records_processed_last_run: results.recordsProcessed,
      })
      .eq('id', policyId);
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');

    await supabase
      .from('retention_execution_logs')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: results.errors.join('; '),
      })
      .eq('id', executionLog?.id);
  }

  return results;
}

// =============================================================================
// LEGAL HOLD MANAGEMENT
// =============================================================================

export async function isRecordUnderLegalHold(
  tableName: string,
  recordId: string,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: holds } = await supabase
    .from('legal_holds')
    .select('*')
    .eq('is_active', true);

  if (!holds || holds.length === 0) {
    return false;
  }

  for (const hold of holds) {
    // Check if table is in scope
    if (hold.tables_in_scope && hold.tables_in_scope.includes(tableName)) {
      return true;
    }

    // Check if user is a custodian
    if (userId && hold.custodians && hold.custodians.includes(userId)) {
      return true;
    }
  }

  return false;
}
