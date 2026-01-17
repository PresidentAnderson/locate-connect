/**
 * Compliance Dashboard Page (LC-FEAT-037)
 * Admin page for compliance monitoring and management
 */

import { ComplianceDashboard } from '@/components/compliance';

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage compliance with PIPEDA, GDPR, and other regulatory frameworks
        </p>
      </div>

      {/* Compliance Dashboard */}
      <ComplianceDashboard />
    </div>
  );
}
