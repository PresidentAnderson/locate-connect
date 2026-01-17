// Law Enforcement AMBER Alerts Management Page
// LC-FEAT-026: AMBER Alert Integration
// Dashboard for managing AMBER alert requests and active alerts

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AmberAlertsTable } from "./AmberAlertsTable";

export default async function AmberAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is law enforcement
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["law_enforcement", "admin", "developer"].includes(profile.role)
  ) {
    redirect("/");
  }

  // Fetch alert statistics
  const { data: stats } = await supabase.rpc("get_amber_alert_stats").single();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">AMBER Alerts</h1>
        <p className="mt-2 text-gray-600">
          Manage AMBER Alert requests and active alerts
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Active Alerts</p>
              <p className="text-3xl font-bold text-blue-900">
                {stats?.active_count || 0}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">
                Pending Review
              </p>
              <p className="text-3xl font-bold text-yellow-900">
                {stats?.pending_count || 0}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">
                Total This Month
              </p>
              <p className="text-3xl font-bold text-green-900">
                {stats?.month_count || 0}
              </p>
            </div>
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">
                Recovery Rate
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {stats?.recovery_rate || 0}%
              </p>
            </div>
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <AmberAlertsTable />
    </div>
  );
}
