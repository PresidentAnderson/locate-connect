/**
 * Authentication and authorization constants
 */

import type { UserRole, Permission } from "@/types";

/**
 * Route access mapping - defines which roles can access which routes
 */
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/developers": ["admin", "developer"],
  "/law-enforcement": ["admin", "law_enforcement"],
  "/analytics": ["admin", "developer"],
  "/cases": ["admin", "developer", "law_enforcement", "journalist", "user"],
  "/settings": ["admin", "developer", "law_enforcement", "journalist", "user"],
  "/profile": ["admin", "developer", "law_enforcement", "journalist", "user"],
  "/dashboards": ["admin", "developer", "law_enforcement"],
  "/reports": ["admin", "developer", "law_enforcement"],
  "/cold-cases": ["admin", "developer", "law_enforcement"],
  "/facial-recognition": ["admin", "law_enforcement"],
  "/family-support": ["admin", "law_enforcement"],
  "/indigenous-liaison": ["admin", "law_enforcement"],
  "/success-stories": ["admin", "developer", "law_enforcement", "journalist"],
  "/tip-verification": ["admin", "law_enforcement"],
  "/training": ["admin", "developer", "law_enforcement"],
  "/archive": ["admin", "developer", "law_enforcement", "journalist"],
  "/research-portal": ["admin", "developer", "journalist"],
};

/**
 * Permission mapping for each role
 */
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  admin: [
    "cases:read", "cases:write", "cases:delete", "cases:assign",
    "leads:read", "leads:write", "leads:verify",
    "users:read", "users:write", "users:delete",
    "admin:settings", "admin:logs", "admin:analytics",
    "api:access", "realtime:access",
    "media:read",
  ],
  developer: [
    "cases:read", "cases:write",
    "leads:read", "leads:write",
    "users:read",
    "admin:settings", "admin:logs", "admin:analytics",
    "api:access",
  ],
  law_enforcement: [
    "cases:read", "cases:write", "cases:assign",
    "leads:read", "leads:write", "leads:verify",
    "realtime:access",
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
