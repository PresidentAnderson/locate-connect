/**
 * User session and authentication utilities
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";
import type { UserRole, Permission } from "@/types";
import { ROLE_PERMISSIONS_MAP } from "./constants";

export interface UserProfile extends User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  organization?: string;
  badgeNumber?: string;
  pressCredentials?: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

/**
 * Get current user session and profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user profile from database
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  const userRole = profile.role as UserRole;
  const permissions = ROLE_PERMISSIONS_MAP[userRole] || [];

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name || "",
    lastName: profile.last_name || "",
    role: userRole,
    permissions,
    organization: profile.organization,
    badgeNumber: profile.badge_number,
    pressCredentials: profile.press_credentials,
    isVerified: profile.is_verified,
    createdAt: profile.created_at,
    lastLoginAt: profile.updated_at,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get user role
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}
