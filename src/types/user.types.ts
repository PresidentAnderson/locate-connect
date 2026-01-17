/**
 * User and Role Types
 */

export type UserRole = "admin" | "developer" | "law_enforcement" | "journalist" | "user";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  organization?: string;
  badgeNumber?: string; // For law enforcement
  pressCredentials?: string; // For journalists
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export type Permission =
  | "cases:read"
  | "cases:write"
  | "cases:delete"
  | "cases:assign"
  | "leads:read"
  | "leads:write"
  | "leads:verify"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "admin:settings"
  | "admin:logs"
  | "admin:analytics"
  | "api:access"
  | "realtime:access"
  | "media:read"
  | "media:limited" // Journalists get limited access
  | "morgue:read"
  | "morgue:write"
  | "morgue:notify"; // Sensitive notification handling

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "cases:read", "cases:write", "cases:delete", "cases:assign",
    "leads:read", "leads:write", "leads:verify",
    "users:read", "users:write", "users:delete",
    "admin:settings", "admin:logs", "admin:analytics",
    "api:access", "realtime:access",
    "media:read",
    "morgue:read", "morgue:write", "morgue:notify",
  ],
  developer: [
    "cases:read", "cases:write",
    "leads:read", "leads:write",
    "users:read",
    "admin:settings", "admin:logs", "admin:analytics",
    "api:access",
    "morgue:read", "morgue:write", "morgue:notify",
  ],
  law_enforcement: [
    "cases:read", "cases:write", "cases:assign",
    "leads:read", "leads:write", "leads:verify",
    "realtime:access",
    "morgue:read", "morgue:write", "morgue:notify",
  ],
  journalist: [
    "cases:read",
    "media:read", "media:limited",
  ],
  user: [
    "cases:read", "cases:write",
    "leads:read",
  ],
};

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}
