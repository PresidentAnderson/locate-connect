/**
 * Data Subject Requests Page (LC-FEAT-037)
 * Admin page for managing GDPR/PIPEDA data subject requests
 */

import { DataRequestManager } from '@/components/compliance';

export default function DataRequestsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Subject Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage data access, portability, rectification, and erasure requests
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Compliance Deadline
            </h3>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                Under PIPEDA and GDPR, data subject requests must be responded to within
                30 days. Ensure all pending requests are processed before their due dates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Request Manager */}
      <DataRequestManager />
    </div>
  );
}
