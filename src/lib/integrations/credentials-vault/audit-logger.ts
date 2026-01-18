/**
 * Credentials Vault - Audit Logger
 * Comprehensive audit logging for all credential operations
 */

import type { CredentialAccessLog } from '@/types';
import type { AccessControlContext } from './access-control';

export type AuditAction =
  | 'retrieve'
  | 'create'
  | 'update'
  | 'delete'
  | 'rotate'
  | 'revoke'
  | 'access_denied'
  | 'decrypt'
  | 'health_check'
  | 'list';

export interface AuditLogEntry extends Omit<CredentialAccessLog, 'id'> {
  action: AuditAction;
  credentialName?: string;
  integrationId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  credentialId?: string;
  userId?: string;
  action?: AuditAction;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit Logger Service
 */
export class AuditLoggerService {
  private logs: AuditLogEntry[] = [];
  private maxInMemoryLogs = 1000;

  /**
   * Log a credential access event
   */
  async log(
    context: AccessControlContext,
    action: AuditAction,
    credentialId: string,
    success: boolean,
    options?: {
      credentialName?: string;
      integrationId?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const entry: AuditLogEntry = {
      credentialId,
      userId: context.userId,
      action,
      success,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: options?.reason,
      timestamp: new Date().toISOString(),
      credentialName: options?.credentialName,
      integrationId: options?.integrationId,
      metadata: {
        ...options?.metadata,
        sessionId: context.sessionId,
        userRole: context.userRole,
      },
    };

    // Store in memory for now (would be persisted to database in production)
    this.logs.push(entry);

    // Trim if exceeds max
    if (this.logs.length > this.maxInMemoryLogs) {
      this.logs = this.logs.slice(-this.maxInMemoryLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry);
    }

    // In production, this would be persisted to database
    // await this.persistToDatabase(entry);
  }

  /**
   * Log a successful retrieve operation
   */
  async logRetrieve(
    context: AccessControlContext,
    credentialId: string,
    credentialName?: string,
    integrationId?: string
  ): Promise<void> {
    await this.log(context, 'retrieve', credentialId, true, {
      credentialName,
      integrationId,
    });
  }

  /**
   * Log a credential creation
   */
  async logCreate(
    context: AccessControlContext,
    credentialId: string,
    credentialName: string,
    integrationId?: string
  ): Promise<void> {
    await this.log(context, 'create', credentialId, true, {
      credentialName,
      integrationId,
    });
  }

  /**
   * Log a credential update
   */
  async logUpdate(
    context: AccessControlContext,
    credentialId: string,
    credentialName?: string,
    changes?: string[]
  ): Promise<void> {
    await this.log(context, 'update', credentialId, true, {
      credentialName,
      metadata: { changedFields: changes },
    });
  }

  /**
   * Log a credential rotation
   */
  async logRotate(
    context: AccessControlContext,
    credentialId: string,
    credentialName?: string,
    reason?: string
  ): Promise<void> {
    await this.log(context, 'rotate', credentialId, true, {
      credentialName,
      reason,
    });
  }

  /**
   * Log a credential revocation
   */
  async logRevoke(
    context: AccessControlContext,
    credentialId: string,
    credentialName?: string,
    reason: string
  ): Promise<void> {
    await this.log(context, 'revoke', credentialId, true, {
      credentialName,
      reason,
    });
  }

  /**
   * Log an access denied event
   */
  async logAccessDenied(
    context: AccessControlContext,
    credentialId: string,
    reason: string,
    credentialName?: string
  ): Promise<void> {
    await this.log(context, 'access_denied', credentialId, false, {
      credentialName,
      reason,
    });
  }

  /**
   * Log a deletion
   */
  async logDelete(
    context: AccessControlContext,
    credentialId: string,
    credentialName?: string,
    reason?: string
  ): Promise<void> {
    await this.log(context, 'delete', credentialId, true, {
      credentialName,
      reason,
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let filtered = [...this.logs];

    if (filter.credentialId) {
      filtered = filtered.filter((l) => l.credentialId === filter.credentialId);
    }

    if (filter.userId) {
      filtered = filtered.filter((l) => l.userId === filter.userId);
    }

    if (filter.action) {
      filtered = filtered.filter((l) => l.action === filter.action);
    }

    if (filter.success !== undefined) {
      filtered = filtered.filter((l) => l.success === filter.success);
    }

    if (filter.startDate) {
      filtered = filtered.filter(
        (l) => new Date(l.timestamp) >= filter.startDate!
      );
    }

    if (filter.endDate) {
      filtered = filtered.filter(
        (l) => new Date(l.timestamp) <= filter.endDate!
      );
    }

    // Sort by timestamp descending
    filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get logs for a specific credential
   */
  async getCredentialLogs(
    credentialId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.getLogs({ credentialId, limit });
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getLogs({ userId, limit });
  }

  /**
   * Get failed access attempts
   */
  async getFailedAttempts(
    startDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.getLogs({
      success: false,
      startDate,
      limit,
    });
  }

  /**
   * Get access denied events for security monitoring
   */
  async getAccessDeniedEvents(
    startDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.getLogs({
      action: 'access_denied',
      startDate,
      limit,
    });
  }

  /**
   * Generate audit report
   */
  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalOperations: number;
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    successRate: number;
    accessDeniedCount: number;
    uniqueCredentialsAccessed: number;
    uniqueUsers: number;
  }> {
    const logs = await this.getLogs({
      startDate,
      endDate,
      limit: 10000, // Get all logs in range
    });

    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const credentialIds = new Set<string>();
    const userIds = new Set<string>();
    let successCount = 0;
    let accessDeniedCount = 0;

    for (const log of logs) {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by user
      byUser[log.userId] = (byUser[log.userId] || 0) + 1;

      // Track unique credentials and users
      credentialIds.add(log.credentialId);
      userIds.add(log.userId);

      // Count successes
      if (log.success) {
        successCount++;
      }

      // Count access denied
      if (log.action === 'access_denied') {
        accessDeniedCount++;
      }
    }

    return {
      totalOperations: logs.length,
      byAction,
      byUser,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 100,
      accessDeniedCount,
      uniqueCredentialsAccessed: credentialIds.size,
      uniqueUsers: userIds.size,
    };
  }

  /**
   * Console log for development
   */
  private consoleLog(entry: AuditLogEntry): void {
    const status = entry.success ? 'SUCCESS' : 'FAILED';
    const message = `[CredentialsAudit] ${status} - ${entry.action} - User: ${entry.userId} - Credential: ${entry.credentialId}`;

    if (entry.success) {
      console.log(message);
    } else {
      console.warn(message, entry.reason);
    }
  }
}

// Singleton instance
let auditLoggerInstance: AuditLoggerService | null = null;

export function getAuditLogger(): AuditLoggerService {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLoggerService();
  }
  return auditLoggerInstance;
}
