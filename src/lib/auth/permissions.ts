/**
 * Role-based access control utilities
 */

import type { UserRole, Permission, ROLE_PERMISSIONS } from "@/types";
import { getCurrentUser } from "./session";

/**
 * Get permissions for a given role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  const rolePermissions: Record<UserRole, Permission[]> = {
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

  return rolePermissions[role] || [];
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permissions = getPermissionsForRole(user.role);
  return permissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 */
export async function hasAnyPermission(permissions: Permission[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const userPermissions = getPermissionsForRole(user.role);
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all of the given permissions
 */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const userPermissions = getPermissionsForRole(user.role);
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if user has any of the given roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  return roles.includes(user.role);
}

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
 * Check if user can access a specific route
 */
export async function canAccessRoute(path: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Find the route that matches the path
  const routeKey = Object.keys(ROUTE_ACCESS).find(route => 
    path === route || path.startsWith(`${route}/`)
  );

  if (!routeKey) {
    // Route not in access map, allow access if authenticated
    return true;
  }

  const allowedRoles = ROUTE_ACCESS[routeKey];
  return allowedRoles.includes(user.role);
}

/**
 * Get accessible routes for current user
 */
export async function getAccessibleRoutes(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return Object.entries(ROUTE_ACCESS)
    .filter(([_, roles]) => roles.includes(user.role))
    .map(([route]) => route);
}
