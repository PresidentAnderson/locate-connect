/**
 * Credentials Vault - Access Control Module
 * Implements RBAC-based access control for credential operations
 */

import type { VaultCredential } from '@/types';

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = [
  'viewer',
  'user',
  'coordinator',
  'investigator',
  'admin',
  'super_admin',
] as const;

export type Role = (typeof ROLE_HIERARCHY)[number];

// Permission types
export type CredentialPermission =
  | 'credential:read'
  | 'credential:create'
  | 'credential:update'
  | 'credential:delete'
  | 'credential:rotate'
  | 'credential:revoke'
  | 'credential:manage_access';

// Role-permission mapping
const ROLE_PERMISSIONS: Record<Role, CredentialPermission[]> = {
  viewer: [],
  user: ['credential:read'],
  coordinator: ['credential:read'],
  investigator: ['credential:read'],
  admin: [
    'credential:read',
    'credential:create',
    'credential:update',
    'credential:rotate',
    'credential:revoke',
  ],
  super_admin: [
    'credential:read',
    'credential:create',
    'credential:update',
    'credential:delete',
    'credential:rotate',
    'credential:revoke',
    'credential:manage_access',
  ],
};

export interface AccessControlContext {
  userId: string;
  userRole: Role;
  userRoles?: Role[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: CredentialPermission[];
  userPermissions?: CredentialPermission[];
}

/**
 * Access Control Service
 */
export class AccessControlService {
  /**
   * Check if user has permission for an operation
   */
  checkPermission(
    context: AccessControlContext,
    permission: CredentialPermission
  ): AccessCheckResult {
    const userPermissions = this.getUserPermissions(context);

    if (userPermissions.includes(permission)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `User does not have permission: ${permission}`,
      requiredPermissions: [permission],
      userPermissions,
    };
  }

  /**
   * Check if user can access a specific credential
   */
  canAccessCredential(
    context: AccessControlContext,
    credential: VaultCredential,
    permission: CredentialPermission
  ): AccessCheckResult {
    // First check if user has the general permission
    const permissionCheck = this.checkPermission(context, permission);
    if (!permissionCheck.allowed) {
      return permissionCheck;
    }

    // Super admin can access everything
    if (context.userRole === 'super_admin') {
      return { allowed: true };
    }

    // Admin can access most things
    if (context.userRole === 'admin') {
      // Admins can't manage access - only super_admin can
      if (permission === 'credential:manage_access') {
        return {
          allowed: false,
          reason: 'Only super_admin can manage credential access',
        };
      }
      return { allowed: true };
    }

    // For other roles, check specific access lists
    const hasUserAccess = credential.allowedUsers.includes(context.userId);
    const hasRoleAccess = credential.allowedRoles.some((role) =>
      this.userHasRole(context, role as Role)
    );

    if (!hasUserAccess && !hasRoleAccess) {
      return {
        allowed: false,
        reason: 'User not in credential access list',
      };
    }

    return { allowed: true };
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(context: AccessControlContext): CredentialPermission[] {
    const permissions = new Set<CredentialPermission>();

    // Get permissions from primary role
    const primaryRolePerms = ROLE_PERMISSIONS[context.userRole] || [];
    primaryRolePerms.forEach((p) => permissions.add(p));

    // Get permissions from additional roles
    if (context.userRoles) {
      for (const role of context.userRoles) {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Check if user has a specific role
   */
  userHasRole(context: AccessControlContext, requiredRole: Role): boolean {
    const userRoleIndex = ROLE_HIERARCHY.indexOf(context.userRole);
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);

    // Higher role index includes lower role permissions
    if (userRoleIndex >= requiredRoleIndex) {
      return true;
    }

    // Check additional roles
    if (context.userRoles) {
      for (const role of context.userRoles) {
        const roleIndex = ROLE_HIERARCHY.indexOf(role);
        if (roleIndex >= requiredRoleIndex) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate access control list update
   */
  validateAccessListUpdate(
    context: AccessControlContext,
    allowedUsers: string[],
    allowedRoles: string[]
  ): AccessCheckResult {
    // Only super_admin can manage access
    if (context.userRole !== 'super_admin') {
      return {
        allowed: false,
        reason: 'Only super_admin can manage credential access lists',
      };
    }

    // Validate roles are valid
    for (const role of allowedRoles) {
      if (!ROLE_HIERARCHY.includes(role as Role)) {
        return {
          allowed: false,
          reason: `Invalid role: ${role}`,
        };
      }
    }

    // Validate user IDs format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const userId of allowedUsers) {
      if (!uuidRegex.test(userId)) {
        return {
          allowed: false,
          reason: `Invalid user ID format: ${userId}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get minimum role required for a permission
   */
  getMinimumRoleForPermission(permission: CredentialPermission): Role | null {
    for (const role of ROLE_HIERARCHY) {
      if (ROLE_PERMISSIONS[role].includes(permission)) {
        return role;
      }
    }
    return null;
  }

  /**
   * Check if an operation requires elevated privileges
   */
  requiresElevatedPrivileges(permission: CredentialPermission): boolean {
    const elevatedPermissions: CredentialPermission[] = [
      'credential:delete',
      'credential:rotate',
      'credential:revoke',
      'credential:manage_access',
    ];
    return elevatedPermissions.includes(permission);
  }
}

// Singleton instance
let accessControlServiceInstance: AccessControlService | null = null;

export function getAccessControlService(): AccessControlService {
  if (!accessControlServiceInstance) {
    accessControlServiceInstance = new AccessControlService();
  }
  return accessControlServiceInstance;
}
