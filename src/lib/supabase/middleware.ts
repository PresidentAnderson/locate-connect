import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types";

// Routes that require authentication
const protectedRoutes = ["/cases", "/admin", "/law-enforcement", "/settings", "/profile"];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ["/login", "/signup", "/forgot-password"];

// Route access mapping - defines which roles can access which routes
const ROUTE_ACCESS: Record<string, UserRole[]> = {
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  // Check if the path is an auth route
  const isAuthRoute = authRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/cases", request.url));
  }

  // Role-based access control for authenticated users
  if (user) {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      const userRole = profile.role as UserRole;

      // Check if user has access to the requested route
      const routeKey = Object.keys(ROUTE_ACCESS).find(route => 
        path === route || path.startsWith(`${route}/`)
      );

      if (routeKey) {
        const allowedRoles = ROUTE_ACCESS[routeKey];
        
        if (!allowedRoles.includes(userRole)) {
          // User doesn't have access to this route
          // Redirect to an appropriate page based on role
          const redirectMap: Record<UserRole, string> = {
            admin: "/admin",
            developer: "/developers",
            law_enforcement: "/law-enforcement",
            journalist: "/cases",
            user: "/cases",
          };

          return NextResponse.redirect(
            new URL(redirectMap[userRole] || "/cases", request.url)
          );
        }
      }
    }
  }

  return supabaseResponse;
}
