/**
 * Role-based access control utilities
 */

import type { UserRole, Permission } from "@/types";
import { getCurrentUser } from "./session";
import { ROLE_PERMISSIONS_MAP, ROUTE_ACCESS } from "./constants";

// Re-export ROUTE_ACCESS for convenience
export { ROUTE_ACCESS };

/**
 * Get permissions for a given role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS_MAP[role] || [];
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
    .filter(([, roles]) => roles.includes(user.role))
    .map(([route]) => route);
}
