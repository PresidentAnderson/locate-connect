/**
 * Tests for Credentials Vault - Audit Logger Module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AuditLoggerService,
  getAuditLogger,
  type AuditAction,
  type AuditLogEntry,
} from './audit-logger';
import type { AccessControlContext } from './access-control';

describe('AuditLoggerService', () => {
  let auditLogger: AuditLoggerService;

  const createContext = (userId: string = 'user-123'): AccessControlContext => ({
    userId,
    userRole: 'admin',
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent/1.0',
    sessionId: 'session-abc',
  });

  beforeEach(() => {
    auditLogger = new AuditLoggerService();
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('log', () => {
    it('should log an event with all required fields', async () => {
      const context = createContext();

      await auditLogger.log(context, 'retrieve', 'cred-123', true, {
        credentialName: 'API Key',
        integrationId: 'int-456',
      });

      const logs = await auditLogger.getLogs({ credentialId: 'cred-123' });
      expect(logs).toHaveLength(1);
      expect(logs[0].credentialId).toBe('cred-123');
      expect(logs[0].userId).toBe('user-123');
      expect(logs[0].action).toBe('retrieve');
      expect(logs[0].success).toBe(true);
      expect(logs[0].ipAddress).toBe('192.168.1.1');
      expect(logs[0].userAgent).toBe('test-agent/1.0');
      expect(logs[0].credentialName).toBe('API Key');
      expect(logs[0].integrationId).toBe('int-456');
      expect(logs[0].timestamp).toBeDefined();
    });

    it('should include metadata with session and role', async () => {
      const context = createContext();

      await auditLogger.log(context, 'create', 'cred-123', true, {
        metadata: { custom: 'value' },
      });

      const logs = await auditLogger.getLogs({ credentialId: 'cred-123' });
      expect(logs[0].metadata).toEqual({
        custom: 'value',
        sessionId: 'session-abc',
        userRole: 'admin',
      });
    });

    it('should log failed operations', async () => {
      const context = createContext();

      await auditLogger.log(context, 'retrieve', 'cred-123', false, {
        reason: 'Access denied',
      });

      const logs = await auditLogger.getLogs({ success: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].reason).toBe('Access denied');
    });
  });

  describe('convenience logging methods', () => {
    it('logRetrieve should log successful retrieve', async () => {
      const context = createContext();

      await auditLogger.logRetrieve(context, 'cred-123', 'API Key', 'int-456');

      const logs = await auditLogger.getLogs({ action: 'retrieve' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('retrieve');
      expect(logs[0].success).toBe(true);
    });

    it('logCreate should log credential creation', async () => {
      const context = createContext();

      await auditLogger.logCreate(context, 'cred-123', 'New Key', 'int-789');

      const logs = await auditLogger.getLogs({ action: 'create' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('create');
      expect(logs[0].credentialName).toBe('New Key');
    });

    it('logUpdate should log credential update', async () => {
      const context = createContext();

      await auditLogger.logUpdate(context, 'cred-123', 'API Key', ['name', 'type']);

      const logs = await auditLogger.getLogs({ action: 'update' });
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata?.changedFields).toEqual(['name', 'type']);
    });

    it('logRotate should log credential rotation', async () => {
      const context = createContext();

      await auditLogger.logRotate(context, 'cred-123', 'API Key', 'Scheduled rotation');

      const logs = await auditLogger.getLogs({ action: 'rotate' });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('Scheduled rotation');
    });

    it('logRevoke should log credential revocation', async () => {
      const context = createContext();

      await auditLogger.logRevoke(context, 'cred-123', 'Security incident', 'API Key');

      const logs = await auditLogger.getLogs({ action: 'revoke' });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('Security incident');
    });

    it('logAccessDenied should log failed access attempt', async () => {
      const context = createContext();

      await auditLogger.logAccessDenied(
        context,
        'cred-123',
        'User not in access list',
        'Secret Key'
      );

      const logs = await auditLogger.getLogs({ action: 'access_denied' });
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].reason).toBe('User not in access list');
    });

    it('logDelete should log credential deletion', async () => {
      const context = createContext();

      await auditLogger.logDelete(context, 'cred-123', 'Old Key', 'No longer needed');

      const logs = await auditLogger.getLogs({ action: 'delete' });
      expect(logs).toHaveLength(1);
      expect(logs[0].reason).toBe('No longer needed');
    });
  });

  describe('getLogs filtering', () => {
    beforeEach(async () => {
      // Populate some test logs
      const context1 = createContext('user-1');
      const context2 = createContext('user-2');

      await auditLogger.logRetrieve(context1, 'cred-1', 'Key 1');
      await auditLogger.logCreate(context1, 'cred-2', 'Key 2');
      await auditLogger.logAccessDenied(context2, 'cred-1', 'Denied');
      await auditLogger.logRotate(context2, 'cred-2', 'Key 2');
    });

    it('should filter by credentialId', async () => {
      const logs = await auditLogger.getLogs({ credentialId: 'cred-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.credentialId === 'cred-1')).toBe(true);
    });

    it('should filter by userId', async () => {
      const logs = await auditLogger.getLogs({ userId: 'user-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.userId === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const logs = await auditLogger.getLogs({ action: 'retrieve' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('retrieve');
    });

    it('should filter by success', async () => {
      const successLogs = await auditLogger.getLogs({ success: true });
      const failedLogs = await auditLogger.getLogs({ success: false });

      expect(successLogs.every((l) => l.success === true)).toBe(true);
      expect(failedLogs.every((l) => l.success === false)).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
      const future = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

      const logs = await auditLogger.getLogs({
        startDate: past,
        endDate: future,
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should apply pagination', async () => {
      const page1 = await auditLogger.getLogs({ limit: 2, offset: 0 });
      const page2 = await auditLogger.getLogs({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);

      // Verify that we got different entries (by checking the full log set)
      const allLogs = await auditLogger.getLogs({ limit: 10 });
      expect(allLogs.length).toBe(4);
      // Page 1 and 2 should be different segments of the sorted logs
      expect(page1[0]).toEqual(allLogs[0]);
      expect(page2[0]).toEqual(allLogs[2]);
    });

    it('should sort by timestamp descending', async () => {
      const logs = await auditLogger.getLogs({});
      for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].timestamp).getTime();
        const curr = new Date(logs[i].timestamp).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('getCredentialLogs', () => {
    it('should return logs for specific credential', async () => {
      const context = createContext();
      await auditLogger.logRetrieve(context, 'cred-specific', 'Key');
      await auditLogger.logRotate(context, 'cred-specific', 'Key');
      await auditLogger.logRetrieve(context, 'cred-other', 'Other');

      const logs = await auditLogger.getCredentialLogs('cred-specific');
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.credentialId === 'cred-specific')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const context = createContext();
      for (let i = 0; i < 10; i++) {
        await auditLogger.logRetrieve(context, 'cred-many', 'Key');
      }

      const logs = await auditLogger.getCredentialLogs('cred-many', 5);
      expect(logs).toHaveLength(5);
    });
  });

  describe('getUserLogs', () => {
    it('should return logs for specific user', async () => {
      await auditLogger.logRetrieve(createContext('user-a'), 'cred-1', 'Key');
      await auditLogger.logCreate(createContext('user-a'), 'cred-2', 'Key');
      await auditLogger.logRetrieve(createContext('user-b'), 'cred-1', 'Key');

      const logs = await auditLogger.getUserLogs('user-a');
      expect(logs).toHaveLength(2);
      expect(logs.every((l) => l.userId === 'user-a')).toBe(true);
    });
  });

  describe('getFailedAttempts', () => {
    it('should return only failed attempts', async () => {
      const context = createContext();
      await auditLogger.logRetrieve(context, 'cred-1', 'Key'); // success
      await auditLogger.logAccessDenied(context, 'cred-2', 'Denied'); // failed

      const failed = await auditLogger.getFailedAttempts();
      expect(failed).toHaveLength(1);
      expect(failed[0].success).toBe(false);
    });
  });

  describe('getAccessDeniedEvents', () => {
    it('should return only access_denied events', async () => {
      const context = createContext();
      await auditLogger.logRetrieve(context, 'cred-1', 'Key');
      await auditLogger.logAccessDenied(context, 'cred-2', 'No permission');
      await auditLogger.logAccessDenied(context, 'cred-3', 'Not in list');

      const denied = await auditLogger.getAccessDeniedEvents();
      expect(denied).toHaveLength(2);
      expect(denied.every((l) => l.action === 'access_denied')).toBe(true);
    });
  });

  describe('generateReport', () => {
    beforeEach(async () => {
      const context1 = createContext('user-1');
      const context2 = createContext('user-2');

      await auditLogger.logRetrieve(context1, 'cred-1', 'Key 1');
      await auditLogger.logRetrieve(context1, 'cred-1', 'Key 1');
      await auditLogger.logCreate(context1, 'cred-2', 'Key 2');
      await auditLogger.logAccessDenied(context2, 'cred-1', 'Denied');
      await auditLogger.logRotate(context2, 'cred-2', 'Key 2');
    });

    it('should generate report with correct totals', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      expect(report.totalOperations).toBe(5);
    });

    it('should count operations by action', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      expect(report.byAction['retrieve']).toBe(2);
      expect(report.byAction['create']).toBe(1);
      expect(report.byAction['access_denied']).toBe(1);
      expect(report.byAction['rotate']).toBe(1);
    });

    it('should count operations by user', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      expect(report.byUser['user-1']).toBe(3);
      expect(report.byUser['user-2']).toBe(2);
    });

    it('should calculate success rate', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      // 4 success, 1 failed = 80%
      expect(report.successRate).toBe(80);
    });

    it('should count access denied events', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      expect(report.accessDeniedCount).toBe(1);
    });

    it('should count unique credentials and users', async () => {
      const past = new Date(Date.now() - 1000 * 60 * 60);
      const future = new Date(Date.now() + 1000 * 60 * 60);

      const report = await auditLogger.generateReport(past, future);

      expect(report.uniqueCredentialsAccessed).toBe(2); // cred-1 and cred-2
      expect(report.uniqueUsers).toBe(2); // user-1 and user-2
    });

    it('should handle empty date range', async () => {
      const past = new Date('2020-01-01');
      const future = new Date('2020-01-02');

      const report = await auditLogger.generateReport(past, future);

      expect(report.totalOperations).toBe(0);
      expect(report.successRate).toBe(100); // Default when no operations
    });
  });

  describe('log trimming', () => {
    it('should trim logs when exceeding max', async () => {
      const logger = new AuditLoggerService();
      const context = createContext();

      // Log more than maxInMemoryLogs (1000)
      for (let i = 0; i < 1100; i++) {
        await logger.log(context, 'retrieve', `cred-${i}`, true);
      }

      const logs = await logger.getLogs({ limit: 2000 });
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getAuditLogger singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getAuditLogger();
      const instance2 = getAuditLogger();
      expect(instance1).toBe(instance2);
    });
  });
});
