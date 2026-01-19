/**
 * Tests for Credentials Vault Service
 *
 * Note: These tests focus on the service logic that can be tested without
 * complex Supabase mocking. Full integration tests would use a test database.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CredentialsVaultService, getCredentialsVault } from './vault-service';
import type { AccessControlContext } from './access-control';
import type { CredentialInput } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('CredentialsVaultService', () => {
  let vaultService: CredentialsVaultService;

  const createAdminContext = (): AccessControlContext => ({
    userId: 'admin-123',
    userRole: 'admin',
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent/1.0',
    sessionId: 'session-abc',
  });

  const createSuperAdminContext = (): AccessControlContext => ({
    userId: 'super-admin-123',
    userRole: 'super_admin',
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent/1.0',
  });

  const createUserContext = (): AccessControlContext => ({
    userId: 'user-123',
    userRole: 'user',
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent/1.0',
  });

  const createViewerContext = (): AccessControlContext => ({
    userId: 'viewer-123',
    userRole: 'viewer',
  });

  const createCredentialInput = (overrides: Partial<CredentialInput> = {}): CredentialInput => ({
    name: 'Test API Key',
    type: 'api_key',
    data: { api_key: 'sk-test-12345' },
    ...overrides,
  });

  const createMockRow = (overrides: any = {}) => ({
    id: 'cred-123',
    name: 'Test Credential',
    type: 'api_key',
    integration_id: null,
    encrypted_data: 'encrypted-data',
    encryption_key_id: 'key-1',
    iv: 'mock-iv',
    auth_tag: 'mock-tag',
    allowed_users: [],
    allowed_roles: ['admin', 'super_admin'],
    expires_at: null,
    rotation_schedule: null,
    last_rotated: null,
    rotation_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'admin-123',
    last_accessed_at: null,
    last_accessed_by: null,
    status: 'active',
    revoked_at: null,
    revoked_by: null,
    revoke_reason: null,
    ...overrides,
  });

  // Helper to create mock chain that returns properly
  const createMockChain = (singleResult?: { data: any; error: any }) => {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.insert = vi.fn(() => Promise.resolve({ error: null }));
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.lt = vi.fn(() => chain);
    chain.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    chain.single = vi.fn(() => Promise.resolve(singleResult || { data: null, error: null }));
    return chain;
  };

  beforeEach(() => {
    vi.stubEnv('CREDENTIALS_MASTER_KEY', 'test-master-key');
    vaultService = new CredentialsVaultService({ enableAuditLogging: false });
  });

  describe('store', () => {
    it('should store a new credential successfully', async () => {
      const context = createAdminContext();
      const input = createCredentialInput();
      const mockChain = createMockChain();
      (createClient as Mock).mockResolvedValue(mockChain);

      const result = await vaultService.store(context, input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.type).toBe(input.type);
      expect(result.encryptedData).toBeDefined();
      expect(result.status).toBe('active');
      expect(result.createdBy).toBe(context.userId);
    });

    it('should reject if user lacks create permission', async () => {
      const context = createUserContext();
      const input = createCredentialInput();

      await expect(vaultService.store(context, input)).rejects.toThrow();
    });

    it('should set default allowed roles', async () => {
      const context = createAdminContext();
      const input = createCredentialInput();
      const mockChain = createMockChain();
      (createClient as Mock).mockResolvedValue(mockChain);

      const result = await vaultService.store(context, input);

      expect(result.allowedRoles).toContain('admin');
      expect(result.allowedRoles).toContain('super_admin');
    });

    it('should use provided allowed users and roles', async () => {
      const context = createAdminContext();
      const input = createCredentialInput({
        allowedUsers: ['user-1', 'user-2'],
        allowedRoles: ['investigator'],
      });
      const mockChain = createMockChain();
      (createClient as Mock).mockResolvedValue(mockChain);

      const result = await vaultService.store(context, input);

      expect(result.allowedUsers).toEqual(['user-1', 'user-2']);
      expect(result.allowedRoles).toEqual(['investigator']);
    });

    it('should encrypt credential data', async () => {
      const context = createAdminContext();
      const input = createCredentialInput({
        data: { api_key: 'secret-key', api_secret: 'secret-value' },
      });
      const mockChain = createMockChain();
      (createClient as Mock).mockResolvedValue(mockChain);

      const result = await vaultService.store(context, input);

      expect(result.encryptedData).not.toContain('secret-key');
      expect(result.encryptedData).not.toContain('secret-value');
      expect(result.iv).toBeDefined();
      expect(result.authTag).toBeDefined();
    });

    it('should throw if database insert fails', async () => {
      const context = createAdminContext();
      const input = createCredentialInput();
      const mockChain = createMockChain();
      mockChain.insert = vi.fn(() => Promise.resolve({ error: { message: 'DB error' } }));
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.store(context, input)).rejects.toThrow('Failed to store credential');
    });

    it('should store expiration and rotation settings', async () => {
      const context = createAdminContext();
      const expiresAt = '2025-12-31T23:59:59Z';
      const input = createCredentialInput({
        expiresAt,
        rotationSchedule: 'monthly',
      });
      const mockChain = createMockChain();
      (createClient as Mock).mockResolvedValue(mockChain);

      const result = await vaultService.store(context, input);

      expect(result.expiresAt).toBe(expiresAt);
      expect(result.rotationSchedule).toBe('monthly');
    });
  });

  describe('retrieve', () => {
    it('should throw if credential not found', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.retrieve(context, 'nonexistent')).rejects.toThrow('Credential not found');
    });

    it('should throw if credential is revoked', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({
        data: createMockRow({ status: 'revoked' }),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.retrieve(context, 'cred-123')).rejects.toThrow('Credential has been revoked');
    });

    it('should throw if credential is expired', async () => {
      const context = createAdminContext();
      const pastDate = new Date('2020-01-01').toISOString();
      const mockChain = createMockChain({
        data: createMockRow({ status: 'active', expires_at: pastDate }),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.retrieve(context, 'cred-123')).rejects.toThrow('Credential has expired');
    });

    it('should throw if user lacks access', async () => {
      const context = createUserContext();
      const mockChain = createMockChain({
        data: createMockRow({
          allowed_users: ['other-user'],
          allowed_roles: ['admin'],
        }),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.retrieve(context, 'cred-123')).rejects.toThrow();
    });
  });

  describe('rotate', () => {
    it('should throw if credential not found', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.rotate(context, 'nonexistent', { api_key: 'new' })
      ).rejects.toThrow('Credential not found');
    });

    it('should throw if user lacks rotate permission', async () => {
      const context = createUserContext();
      const mockChain = createMockChain({
        data: createMockRow(),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.rotate(context, 'cred-123', { api_key: 'new' })
      ).rejects.toThrow();
    });
  });

  describe('revoke', () => {
    it('should throw if credential not found', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.revoke(context, 'nonexistent', 'Reason')
      ).rejects.toThrow('Credential not found');
    });

    it('should throw if user lacks revoke permission', async () => {
      const context = createUserContext();
      const mockChain = createMockChain({
        data: createMockRow(),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.revoke(context, 'cred-123', 'Reason')
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should throw if credential not found', async () => {
      const context = createSuperAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.delete(context, 'nonexistent')).rejects.toThrow('Credential not found');
    });

    it('should throw if user lacks delete permission (admin cannot delete)', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({
        data: createMockRow(),
        error: null
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(vaultService.delete(context, 'cred-123')).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should list all credentials for admin', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain();
      mockChain.order = vi.fn(() => Promise.resolve({
        data: [createMockRow({ id: 'cred-1' }), createMockRow({ id: 'cred-2' })],
        error: null,
      }));
      (createClient as Mock).mockResolvedValue(mockChain);

      const credentials = await vaultService.list(context);

      expect(credentials).toHaveLength(2);
    });

    it('should return empty array if user lacks read permission', async () => {
      const context = createViewerContext();

      const credentials = await vaultService.list(context);

      expect(credentials).toEqual([]);
    });

    it('should filter credentials by access for non-admin users', async () => {
      const context = createUserContext();
      const mockChain = createMockChain();
      mockChain.order = vi.fn(() => Promise.resolve({
        data: [
          createMockRow({ id: 'cred-1', allowed_users: ['user-123'] }),
          createMockRow({ id: 'cred-2', allowed_users: ['other-user'] }),
        ],
        error: null,
      }));
      (createClient as Mock).mockResolvedValue(mockChain);

      const credentials = await vaultService.list(context);

      expect(credentials).toHaveLength(1);
      expect(credentials[0].id).toBe('cred-1');
    });
  });

  describe('getMetadata', () => {
    it('should return metadata without encrypted data', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({
        data: createMockRow(),
        error: null,
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      const metadata = await vaultService.getMetadata(context, 'cred-123');

      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe('cred-123');
      expect(metadata).not.toHaveProperty('encryptedData');
      expect(metadata).not.toHaveProperty('iv');
      expect(metadata).not.toHaveProperty('authTag');
    });

    it('should return null if credential not found', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      const metadata = await vaultService.getMetadata(context, 'nonexistent');

      expect(metadata).toBeNull();
    });

    it('should return null if user lacks access', async () => {
      const context = createUserContext();
      const mockChain = createMockChain({
        data: createMockRow({
          allowed_users: ['other-user'],
          allowed_roles: ['admin'],
        }),
        error: null,
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      const metadata = await vaultService.getMetadata(context, 'cred-123');

      expect(metadata).toBeNull();
    });
  });

  describe('updateAccessControl', () => {
    it('should throw if credential not found', async () => {
      const context = createSuperAdminContext();
      const mockChain = createMockChain({ data: null, error: { message: 'Not found' } });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.updateAccessControl(context, 'nonexistent', [], ['admin'])
      ).rejects.toThrow('Credential not found');
    });

    it('should throw if user is not super_admin', async () => {
      const context = createAdminContext();
      const mockChain = createMockChain({
        data: createMockRow(),
        error: null,
      });
      (createClient as Mock).mockResolvedValue(mockChain);

      await expect(
        vaultService.updateAccessControl(context, 'cred-123', [], ['admin'])
      ).rejects.toThrow();
    });
  });

  describe('getExpiringCredentials', () => {
    it('should return credentials expiring within specified days', async () => {
      const context = createAdminContext();
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 5);

      const mockChain = createMockChain();
      // Override order method to return expiring credentials
      const orderResult = {
        data: [
          {
            id: 'cred-1',
            name: 'Expiring Soon',
            integration_id: null,
            expires_at: expiringDate.toISOString(),
          },
        ],
        error: null,
      };
      mockChain.order = vi.fn(() => Promise.resolve(orderResult));
      (createClient as Mock).mockResolvedValue(mockChain);

      const expiring = await vaultService.getExpiringCredentials(context, 30);

      expect(expiring).toHaveLength(1);
      expect(expiring[0].name).toBe('Expiring Soon');
      expect(expiring[0].daysUntilExpiry).toBeLessThanOrEqual(30);
    });

    it('should return empty array if user lacks permission', async () => {
      const context = createViewerContext();

      const expiring = await vaultService.getExpiringCredentials(context);

      expect(expiring).toEqual([]);
    });

    it('should calculate days until expiry correctly', async () => {
      const context = createAdminContext();
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 10);

      const mockChain = createMockChain();
      const orderResult = {
        data: [
          {
            id: 'cred-1',
            name: 'Test',
            integration_id: null,
            expires_at: expiringDate.toISOString(),
          },
        ],
        error: null,
      };
      mockChain.order = vi.fn(() => Promise.resolve(orderResult));
      (createClient as Mock).mockResolvedValue(mockChain);

      const expiring = await vaultService.getExpiringCredentials(context, 30);

      expect(expiring[0].daysUntilExpiry).toBe(10);
    });
  });

  describe('processExpiredCredentials', () => {
    it('should mark expired credentials as expired', async () => {
      const mockChain = createMockChain();
      mockChain.update = vi.fn(() => mockChain);
      mockChain.eq = vi.fn(() => mockChain);
      mockChain.lt = vi.fn(() => mockChain);
      mockChain.select = vi.fn(() => Promise.resolve({
        data: [{ id: 'cred-1' }, { id: 'cred-2' }],
        error: null,
      }));
      (createClient as Mock).mockResolvedValue(mockChain);

      const count = await vaultService.processExpiredCredentials();

      expect(count).toBe(2);
    });

    it('should return 0 if no expired credentials', async () => {
      const mockChain = createMockChain();
      mockChain.update = vi.fn(() => mockChain);
      mockChain.eq = vi.fn(() => mockChain);
      mockChain.lt = vi.fn(() => mockChain);
      mockChain.select = vi.fn(() => Promise.resolve({
        data: [],
        error: null,
      }));
      (createClient as Mock).mockResolvedValue(mockChain);

      const count = await vaultService.processExpiredCredentials();

      expect(count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockChain = createMockChain();
      mockChain.update = vi.fn(() => mockChain);
      mockChain.eq = vi.fn(() => mockChain);
      mockChain.lt = vi.fn(() => mockChain);
      mockChain.select = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'DB error' },
      }));
      (createClient as Mock).mockResolvedValue(mockChain);

      const count = await vaultService.processExpiredCredentials();

      expect(count).toBe(0);
    });
  });

  describe('clearExpiredCache', () => {
    it('should clear expired cache entries', () => {
      const service = new CredentialsVaultService({
        enableCaching: true,
        cacheTTLMs: 1,
        enableAuditLogging: false,
      });

      // Just ensure method doesn't throw
      service.clearExpiredCache();
    });
  });
});

describe('getCredentialsVault singleton', () => {
  beforeEach(() => {
    vi.stubEnv('CREDENTIALS_MASTER_KEY', 'test-key');
  });

  it('should return the same instance', () => {
    const instance1 = getCredentialsVault();
    const instance2 = getCredentialsVault();
    expect(instance1).toBe(instance2);
  });
});
