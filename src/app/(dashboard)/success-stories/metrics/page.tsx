"use client";

import Link from "next/link";
import { SuccessMetricsDashboard } from "@/components/success-stories";

export default function SuccessMetricsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Success Metrics</h1>
          <p className="text-sm text-gray-500">
            Anonymous aggregate statistics on case resolutions and community impact
          </p>
        </div>
        <Link
          href="/success-stories/manage"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Stories
        </Link>
      </div>

      {/* Dashboard */}
      <SuccessMetricsDashboard />
    </div>
  );
}
