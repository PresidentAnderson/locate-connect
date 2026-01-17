/**
 * Audit Logs Page (LC-FEAT-037)
 * Admin page for viewing and managing audit logs
 */

import { AuditLogViewer } from '@/components/compliance';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprehensive audit trail of all system actions and data access
        </p>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}
