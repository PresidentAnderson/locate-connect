/**
 * Tests for Credentials Vault - Access Control Module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AccessControlService,
  getAccessControlService,
  type AccessControlContext,
  type Role,
  type CredentialPermission,
} from './access-control';
import type { VaultCredential } from '@/types';

describe('AccessControlService', () => {
  let accessControl: AccessControlService;

  beforeEach(() => {
    accessControl = new AccessControlService();
  });

  const createContext = (
    role: Role,
    userId: string = 'user-123',
    additionalRoles?: Role[]
  ): AccessControlContext => ({
    userId,
    userRole: role,
    userRoles: additionalRoles,
    ipAddress: '192.168.1.1',
    userAgent: 'test-agent',
    sessionId: 'session-123',
  });

  const createCredential = (
    allowedUsers: string[] = [],
    allowedRoles: string[] = ['admin']
  ): VaultCredential => ({
    id: 'cred-123',
    name: 'Test Credential',
    type: 'api_key',
    encryptedData: 'encrypted',
    encryptionKeyId: 'key-1',
    iv: 'iv',
    authTag: 'tag',
    allowedUsers,
    allowedRoles,
    rotationCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'creator-123',
    status: 'active',
  });

  describe('checkPermission', () => {
    describe('viewer role', () => {
      it('should deny all credential permissions', () => {
        const context = createContext('viewer');

        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:create').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:update').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:delete').allowed).toBe(false);
      });
    });

    describe('user role', () => {
      it('should allow read permission', () => {
        const context = createContext('user');
        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(true);
      });

      it('should deny create permission', () => {
        const context = createContext('user');
        expect(accessControl.checkPermission(context, 'credential:create').allowed).toBe(false);
      });
    });

    describe('coordinator role', () => {
      it('should allow read permission', () => {
        const context = createContext('coordinator');
        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(true);
      });

      it('should deny create, update, delete', () => {
        const context = createContext('coordinator');
        expect(accessControl.checkPermission(context, 'credential:create').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:update').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:delete').allowed).toBe(false);
      });
    });

    describe('investigator role', () => {
      it('should allow read permission', () => {
        const context = createContext('investigator');
        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(true);
      });
    });

    describe('admin role', () => {
      it('should allow read, create, update, rotate, revoke', () => {
        const context = createContext('admin');

        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:create').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:update').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:rotate').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:revoke').allowed).toBe(true);
      });

      it('should deny delete and manage_access', () => {
        const context = createContext('admin');

        expect(accessControl.checkPermission(context, 'credential:delete').allowed).toBe(false);
        expect(accessControl.checkPermission(context, 'credential:manage_access').allowed).toBe(false);
      });
    });

    describe('super_admin role', () => {
      it('should allow all permissions', () => {
        const context = createContext('super_admin');

        expect(accessControl.checkPermission(context, 'credential:read').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:create').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:update').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:delete').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:rotate').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:revoke').allowed).toBe(true);
        expect(accessControl.checkPermission(context, 'credential:manage_access').allowed).toBe(true);
      });
    });

    it('should include reason when permission denied', () => {
      const context = createContext('user');
      const result = accessControl.checkPermission(context, 'credential:delete');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('credential:delete');
    });

    it('should include user permissions in denied result', () => {
      const context = createContext('user');
      const result = accessControl.checkPermission(context, 'credential:delete');

      expect(result.userPermissions).toContain('credential:read');
      expect(result.requiredPermissions).toContain('credential:delete');
    });
  });

  describe('canAccessCredential', () => {
    describe('super_admin', () => {
      it('should access any credential for any permission', () => {
        const context = createContext('super_admin');
        const credential = createCredential([], []);

        expect(
          accessControl.canAccessCredential(context, credential, 'credential:read').allowed
        ).toBe(true);
        expect(
          accessControl.canAccessCredential(context, credential, 'credential:delete').allowed
        ).toBe(true);
        expect(
          accessControl.canAccessCredential(context, credential, 'credential:manage_access').allowed
        ).toBe(true);
      });
    });

    describe('admin', () => {
      it('should access credentials for most operations', () => {
        const context = createContext('admin');
        const credential = createCredential();

        expect(
          accessControl.canAccessCredential(context, credential, 'credential:read').allowed
        ).toBe(true);
        expect(
          accessControl.canAccessCredential(context, credential, 'credential:rotate').allowed
        ).toBe(true);
      });

      it('should deny manage_access permission', () => {
        const context = createContext('admin');
        const credential = createCredential();

        const result = accessControl.canAccessCredential(
          context,
          credential,
          'credential:manage_access'
        );
        expect(result.allowed).toBe(false);
        // Admin doesn't have manage_access permission at all
        expect(result.reason).toContain('credential:manage_access');
      });
    });

    describe('regular users', () => {
      it('should allow access when user is in allowedUsers', () => {
        const context = createContext('user', 'user-123');
        const credential = createCredential(['user-123', 'user-456']);

        const result = accessControl.canAccessCredential(
          context,
          credential,
          'credential:read'
        );
        expect(result.allowed).toBe(true);
      });

      it('should allow access when user role is in allowedRoles', () => {
        const context = createContext('investigator', 'user-123');
        const credential = createCredential([], ['investigator']);

        const result = accessControl.canAccessCredential(
          context,
          credential,
          'credential:read'
        );
        expect(result.allowed).toBe(true);
      });

      it('should deny access when user not in access list', () => {
        const context = createContext('user', 'user-999');
        const credential = createCredential(['user-123'], ['admin']);

        const result = accessControl.canAccessCredential(
          context,
          credential,
          'credential:read'
        );
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('access list');
      });

      it('should deny if user lacks base permission', () => {
        const context = createContext('viewer');
        const credential = createCredential(['viewer-user']);

        const result = accessControl.canAccessCredential(
          context,
          credential,
          'credential:read'
        );
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for super_admin', () => {
      const context = createContext('super_admin');
      const permissions = accessControl.getUserPermissions(context);

      expect(permissions).toContain('credential:read');
      expect(permissions).toContain('credential:create');
      expect(permissions).toContain('credential:update');
      expect(permissions).toContain('credential:delete');
      expect(permissions).toContain('credential:rotate');
      expect(permissions).toContain('credential:revoke');
      expect(permissions).toContain('credential:manage_access');
    });

    it('should combine permissions from multiple roles', () => {
      const context = createContext('user', 'user-123', ['coordinator', 'investigator']);
      const permissions = accessControl.getUserPermissions(context);

      // All these roles only have credential:read
      expect(permissions).toContain('credential:read');
      expect(permissions).toHaveLength(1);
    });

    it('should return empty array for viewer', () => {
      const context = createContext('viewer');
      const permissions = accessControl.getUserPermissions(context);

      expect(permissions).toHaveLength(0);
    });
  });

  describe('userHasRole', () => {
    it('should return true for exact role match', () => {
      const context = createContext('admin');
      expect(accessControl.userHasRole(context, 'admin')).toBe(true);
    });

    it('should return true for higher role', () => {
      const context = createContext('super_admin');
      expect(accessControl.userHasRole(context, 'admin')).toBe(true);
      expect(accessControl.userHasRole(context, 'user')).toBe(true);
      expect(accessControl.userHasRole(context, 'viewer')).toBe(true);
    });

    it('should return false for lower role checking higher', () => {
      const context = createContext('user');
      expect(accessControl.userHasRole(context, 'admin')).toBe(false);
      expect(accessControl.userHasRole(context, 'super_admin')).toBe(false);
    });

    it('should check additional roles', () => {
      const context = createContext('user', 'user-123', ['admin']);
      expect(accessControl.userHasRole(context, 'admin')).toBe(true);
    });
  });

  describe('validateAccessListUpdate', () => {
    it('should allow super_admin to update access lists', () => {
      const context = createContext('super_admin');
      const result = accessControl.validateAccessListUpdate(
        context,
        ['550e8400-e29b-41d4-a716-446655440000'],
        ['admin', 'user']
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny non-super_admin from updating access lists', () => {
      const context = createContext('admin');
      const result = accessControl.validateAccessListUpdate(context, [], ['admin']);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('super_admin');
    });

    it('should reject invalid roles', () => {
      const context = createContext('super_admin');
      const result = accessControl.validateAccessListUpdate(
        context,
        [],
        ['admin', 'invalid_role']
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('invalid_role');
    });

    it('should reject invalid user ID format', () => {
      const context = createContext('super_admin');
      const result = accessControl.validateAccessListUpdate(
        context,
        ['not-a-valid-uuid', '550e8400-e29b-41d4-a716-446655440000'],
        ['admin']
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid user ID');
    });

    it('should accept valid UUID formats', () => {
      const context = createContext('super_admin');
      const result = accessControl.validateAccessListUpdate(
        context,
        [
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ],
        ['admin']
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('getMinimumRoleForPermission', () => {
    it('should return user for credential:read', () => {
      const role = accessControl.getMinimumRoleForPermission('credential:read');
      expect(role).toBe('user');
    });

    it('should return admin for credential:create', () => {
      const role = accessControl.getMinimumRoleForPermission('credential:create');
      expect(role).toBe('admin');
    });

    it('should return super_admin for credential:delete', () => {
      const role = accessControl.getMinimumRoleForPermission('credential:delete');
      expect(role).toBe('super_admin');
    });

    it('should return super_admin for credential:manage_access', () => {
      const role = accessControl.getMinimumRoleForPermission('credential:manage_access');
      expect(role).toBe('super_admin');
    });
  });

  describe('requiresElevatedPrivileges', () => {
    it('should return true for delete, rotate, revoke, manage_access', () => {
      expect(accessControl.requiresElevatedPrivileges('credential:delete')).toBe(true);
      expect(accessControl.requiresElevatedPrivileges('credential:rotate')).toBe(true);
      expect(accessControl.requiresElevatedPrivileges('credential:revoke')).toBe(true);
      expect(accessControl.requiresElevatedPrivileges('credential:manage_access')).toBe(true);
    });

    it('should return false for read, create, update', () => {
      expect(accessControl.requiresElevatedPrivileges('credential:read')).toBe(false);
      expect(accessControl.requiresElevatedPrivileges('credential:create')).toBe(false);
      expect(accessControl.requiresElevatedPrivileges('credential:update')).toBe(false);
    });
  });

  describe('getAccessControlService singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getAccessControlService();
      const instance2 = getAccessControlService();
      expect(instance1).toBe(instance2);
    });
  });
});
