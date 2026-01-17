# Authentication System Documentation

This document describes the authentication and authorization system implemented in LocateConnect.

## Overview

The authentication system provides:
- Email/password authentication via Supabase Auth
- Role-based access control (RBAC)
- Protected routes with middleware
- Session management
- OAuth support (Google, Microsoft)

## User Roles

The system supports five user roles with different access levels:

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full system access | All features, users, settings, logs, analytics |
| `developer` | System configuration | Cases, API access, logs, analytics, settings |
| `law_enforcement` | Case management | Cases, leads, real-time access, verification |
| `journalist` | Limited read access | Case reading, media (limited) |
| `user` | Public user | Own cases, basic case/lead reading |

## Authentication Flow

### Sign Up

1. User navigates to `/signup`
2. Fills in registration form with:
   - Email and password
   - First name and last name
   - Role selection (user, law_enforcement, journalist)
   - Role-specific fields (organization, badge number for LE)
3. Supabase creates auth user with metadata
4. Database trigger (`handle_new_user`) creates profile record
5. Email confirmation sent (if enabled)
6. User redirected to appropriate dashboard

**File:** `src/app/(auth)/signup/page.tsx`

### Login

1. User navigates to `/login`
2. Enters email and password
3. Supabase authenticates credentials
4. Session created and stored in cookies
5. User redirected to `/cases` or original destination

**File:** `src/app/(auth)/login/page.tsx`

### Logout

1. User clicks "Sign out" in header dropdown
2. Client calls `supabase.auth.signOut()`
3. Optionally can call `/api/auth/logout` API endpoint
4. Session cleared from cookies
5. User redirected to `/login`

**Files:** 
- `src/components/dashboard/header.tsx`
- `src/app/api/auth/logout/route.ts`

## Session Management

### Middleware Protection

The middleware (`src/middleware.ts`) handles:
- Session refresh on each request
- Authentication checks for protected routes
- Role-based route access control
- Redirect logic for auth/unauth users

**Protected Routes:**
- `/cases` - Requires authentication
- `/admin` - Requires admin role
- `/law-enforcement` - Requires admin or law_enforcement role
- `/developers` - Requires admin or developer role
- All dashboard routes require authentication

**Auth Routes:**
- `/login`, `/signup`, `/forgot-password` - Redirect to `/cases` if already logged in

### Role-Based Access Control

Route access is defined in `src/lib/supabase/middleware.ts`:

```typescript
const ROUTE_ACCESS: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/developers": ["admin", "developer"],
  "/law-enforcement": ["admin", "law_enforcement"],
  "/cases": ["admin", "developer", "law_enforcement", "journalist", "user"],
  // ... more routes
};
```

When a user tries to access a route:
1. Middleware checks if user is authenticated
2. Fetches user profile from database
3. Checks if user's role is in allowed roles for route
4. Redirects to appropriate dashboard if access denied

## Utility Functions

### Session Utilities (`src/lib/auth/session.ts`)

- `getCurrentUser()` - Get current user profile with role and metadata
- `isAuthenticated()` - Check if user has valid session
- `getUserRole()` - Get current user's role

### Permission Utilities (`src/lib/auth/permissions.ts`)

- `getPermissionsForRole(role)` - Get all permissions for a role
- `hasPermission(permission)` - Check if user has specific permission
- `hasAnyPermission(permissions)` - Check if user has any of permissions
- `hasAllPermissions(permissions)` - Check if user has all permissions
- `hasRole(role)` - Check if user has specific role
- `hasAnyRole(roles)` - Check if user has any of roles
- `canAccessRoute(path)` - Check if user can access route
- `getAccessibleRoutes()` - Get all routes accessible to user

### Usage Example

```typescript
import { getCurrentUser, hasPermission, canAccessRoute } from "@/lib/auth";

// Get current user in server component
const user = await getCurrentUser();

if (user) {
  console.log(`User: ${user.firstName} ${user.lastName}`);
  console.log(`Role: ${user.role}`);
  console.log(`Email: ${user.email}`);
}

// Check permission
const canDelete = await hasPermission("cases:delete");

// Check route access
const canAccessAdmin = await canAccessRoute("/admin");
```

## Permissions

Each role has specific permissions:

### Admin Permissions
- `cases:read`, `cases:write`, `cases:delete`, `cases:assign`
- `leads:read`, `leads:write`, `leads:verify`
- `users:read`, `users:write`, `users:delete`
- `admin:settings`, `admin:logs`, `admin:analytics`
- `api:access`, `realtime:access`
- `media:read`

### Developer Permissions
- `cases:read`, `cases:write`
- `leads:read`, `leads:write`
- `users:read`
- `admin:settings`, `admin:logs`, `admin:analytics`
- `api:access`

### Law Enforcement Permissions
- `cases:read`, `cases:write`, `cases:assign`
- `leads:read`, `leads:write`, `leads:verify`
- `realtime:access`

### Journalist Permissions
- `cases:read`
- `media:read`, `media:limited`

### User Permissions
- `cases:read`, `cases:write`
- `leads:read`

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role user_role DEFAULT 'user',
  organization TEXT,
  badge_number TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status verification_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, 
    role, organization, badge_number
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    NEW.raw_user_meta_data->>'organization',
    NEW.raw_user_meta_data->>'badge_number'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Features

1. **Password Requirements:**
   - Minimum 8 characters
   - Validated on client and server

2. **Session Security:**
   - HTTP-only cookies for session storage
   - Automatic session refresh
   - Session expires on logout

3. **Role Verification:**
   - Law enforcement and journalist roles require verification
   - Verification status stored in profile
   - Can be managed by admins

4. **Route Protection:**
   - Middleware intercepts all requests
   - Validates session before page load
   - Redirects unauthorized access attempts

## Testing

To test the authentication system:

1. **Sign up as different roles:**
   ```
   - Regular user
   - Law enforcement (with badge number)
   - Journalist (with organization)
   ```

2. **Test login/logout:**
   ```
   - Login with valid credentials
   - Verify redirect to appropriate dashboard
   - Test logout clears session
   - Verify redirect to login page
   ```

3. **Test role-based access:**
   ```
   - Login as regular user
   - Try accessing /admin (should redirect)
   - Try accessing /cases (should work)
   ```

4. **Test session management:**
   ```
   - Login and close browser
   - Reopen and verify session persists
   - Wait for session expiry
   - Verify redirect to login
   ```

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Files Modified/Created

### Created Files:
- `src/lib/auth/session.ts` - Session management utilities
- `src/lib/auth/permissions.ts` - Permission checking utilities
- `src/lib/auth/index.ts` - Auth utilities barrel export
- `src/app/api/auth/logout/route.ts` - Logout API endpoint
- `supabase/migrations/20260117170000_enhanced_user_profile_creation.sql` - Enhanced profile creation

### Modified Files:
- `src/lib/supabase/middleware.ts` - Added role-based access control

### Existing Files (No Changes Required):
- `src/app/(auth)/login/page.tsx` - Login UI
- `src/app/(auth)/signup/page.tsx` - Signup UI
- `src/app/(auth)/forgot-password/page.tsx` - Password reset UI
- `src/components/dashboard/header.tsx` - Header with logout
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `src/types/user.types.ts` - User type definitions

## Troubleshooting

### User can't log in
- Verify email is confirmed (check Supabase auth dashboard)
- Check password meets requirements
- Verify Supabase credentials in .env.local

### User can access restricted routes
- Check role assignment in profiles table
- Verify middleware is running (check middleware.ts)
- Clear cookies and re-login

### Session expires too quickly
- Check Supabase JWT expiry settings
- Verify middleware is refreshing sessions

### Profile not created on signup
- Check database trigger is active
- Verify metadata is being passed correctly
- Check Supabase logs for errors
