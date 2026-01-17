"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "user" as UserRole,
    organization: "",
    badgeNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Validate LE fields
    if (formData.role === "law_enforcement") {
      if (!formData.organization.trim()) {
        setError("Organization is required for Law Enforcement accounts");
        return;
      }
      if (!formData.badgeNumber.trim()) {
        setError("Badge number is required for Law Enforcement accounts");
        return;
      }
    }

    setLoading(true);

    try {
      // Create auth user with metadata
      // The database trigger will auto-create the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: formData.role,
            organization: formData.organization || null,
            badge_number: formData.badgeNumber || null,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        // Email confirmation required
        router.push("/login?message=Check your email to confirm your account");
      } else if (authData.session) {
        // Auto-confirmed (e.g., in development)
        router.push("/cases");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const showLEFields = formData.role === "law_enforcement";
  const showJournalistFields = formData.role === "journalist";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Join LocateConnect to report and track missing persons cases
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSignup} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="you@example.com"
          />
        </div>

        {/* Account Type */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Account type
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="user">Public User - Report and track cases</option>
            <option value="law_enforcement">Law Enforcement - Requires verification</option>
            <option value="journalist">Journalist - Limited access, requires credentials</option>
          </select>
        </div>

        {/* Law Enforcement Fields */}
        {showLEFields && (
          <div className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-medium text-cyan-800">
              Law Enforcement Verification Required
            </p>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Organization / Department
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                value={formData.organization}
                onChange={handleChange}
                required={showLEFields}
                placeholder="e.g., SPVM, SQ, RCMP"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label htmlFor="badgeNumber" className="block text-sm font-medium text-gray-700">
                Badge / ID Number
              </label>
              <input
                id="badgeNumber"
                name="badgeNumber"
                type="text"
                value={formData.badgeNumber}
                onChange={handleChange}
                required={showLEFields}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <p className="text-xs text-cyan-700">
              Your credentials will be verified before full access is granted.
            </p>
          </div>
        )}

        {/* Journalist Fields */}
        {showJournalistFields && (
          <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              Journalist Credential Verification
            </p>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                Media Organization
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                value={formData.organization}
                onChange={handleChange}
                required={showJournalistFields}
                placeholder="e.g., CBC, La Presse, Globe and Mail"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <p className="text-xs text-amber-700">
              Journalists have limited access and must follow media guidelines.
            </p>
          </div>
        )}

        {/* Password Fields */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={8}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <input
            id="terms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            I agree to the{" "}
            <Link href="/terms" className="text-cyan-600 hover:text-cyan-700">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-cyan-600 hover:text-cyan-700">
              Privacy Policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {/* Sign In Link */}
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-cyan-600 hover:text-cyan-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
