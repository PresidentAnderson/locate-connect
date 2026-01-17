'use client';

/**
 * Compliance Dashboard Component (LC-FEAT-037)
 * Comprehensive view of compliance status across frameworks
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib';
import {
  ComplianceFramework,
  ComplianceStatus,
  ViolationSeverity,
  COMPLIANCE_FRAMEWORK_LABELS,
  COMPLIANCE_STATUS_CONFIG,
  VIOLATION_SEVERITY_CONFIG,
} from '@/types/audit.types';

interface ComplianceScore {
  framework: ComplianceFramework;
  score: number;
  status: ComplianceStatus;
  lastAssessment?: string;
}

interface ViolationSummary {
  total: number;
  bySeverity: Record<ViolationSeverity, number>;
  open: number;
}

interface DataRequestSummary {
  total: number;
  pending: number;
  overdue: number;
}

interface DashboardData {
  complianceScores: ComplianceScore[];
  violations: ViolationSummary;
  dataRequests: DataRequestSummary;
  retentionPolicies: { active: number; total: number };
  legalHolds: { active: number };
}

export function ComplianceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework>('pipeda');
  const [runningCheck, setRunningCheck] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // In production, this would fetch from the API
      // For now, we'll use mock data
      const mockData: DashboardData = {
        complianceScores: [
          { framework: 'pipeda', score: 85, status: 'compliant', lastAssessment: '2024-01-15' },
          { framework: 'gdpr', score: 78, status: 'partial', lastAssessment: '2024-01-10' },
        ],
        violations: {
          total: 5,
          bySeverity: { critical: 0, high: 1, medium: 2, low: 2, info: 0 },
          open: 3,
        },
        dataRequests: {
          total: 12,
          pending: 3,
          overdue: 1,
        },
        retentionPolicies: { active: 4, total: 6 },
        legalHolds: { active: 2 },
      };
      setData(mockData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function runComplianceCheck() {
    setRunningCheck(true);
    try {
      const response = await fetch('/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameworks: [selectedFramework] }),
      });

      if (response.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error running compliance check:', error);
    } finally {
      setRunningCheck(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500">
        Failed to load compliance data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Compliance Overview</h2>
          <p className="text-sm text-gray-500">
            Monitor compliance status across regulatory frameworks
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value as ComplianceFramework)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
          >
            {Object.entries(COMPLIANCE_FRAMEWORK_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label.name}
              </option>
            ))}
          </select>
          <button
            onClick={runComplianceCheck}
            disabled={runningCheck}
            className={cn(
              'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white',
              'hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {runningCheck ? 'Running Check...' : 'Run Compliance Check'}
          </button>
        </div>
      </div>

      {/* Compliance Scores */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.complianceScores.map((score) => (
          <ComplianceScoreCard key={score.framework} score={score} />
        ))}
        <ViolationSummaryCard violations={data.violations} />
        <DataRequestCard requests={data.dataRequests} />
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Violations by Severity */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Violations by Severity</h3>
          <div className="mt-4 space-y-3">
            {(Object.entries(data.violations.bySeverity) as [ViolationSeverity, number][]).map(
              ([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        VIOLATION_SEVERITY_CONFIG[severity].bgColor,
                        VIOLATION_SEVERITY_CONFIG[severity].color
                      )}
                    >
                      {VIOLATION_SEVERITY_CONFIG[severity].label}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <QuickActionButton
              label="View Audit Logs"
              href="/admin/audit/logs"
            />
            <QuickActionButton
              label="Data Requests"
              href="/admin/compliance/data-requests"
            />
            <QuickActionButton
              label="Retention Policies"
              href="/admin/compliance/retention"
            />
            <QuickActionButton
              label="Legal Holds"
              href="/admin/compliance/legal-holds"
            />
            <QuickActionButton
              label="Export Audit Report"
              href="/admin/audit/reports"
            />
            <QuickActionButton
              label="Manage Consent"
              href="/admin/compliance/consent"
            />
          </div>
        </div>
      </div>

      {/* Retention Policies & Legal Holds Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Data Retention Status</h3>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Active Policies</span>
              <span className="text-sm font-medium text-gray-900">
                {data.retentionPolicies.active} / {data.retentionPolicies.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${(data.retentionPolicies.active / data.retentionPolicies.total) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Legal Holds</h3>
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <span className="text-xl">&#9878;</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.legalHolds.active}</p>
                <p className="text-sm text-gray-500">Active legal holds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceScoreCard({ score }: { score: ComplianceScore }) {
  const statusConfig = COMPLIANCE_STATUS_CONFIG[score.status];
  const frameworkLabel = COMPLIANCE_FRAMEWORK_LABELS[score.framework];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{frameworkLabel.name}</span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            statusConfig.bgColor,
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{score.score}%</span>
          <span className="text-sm text-gray-500">compliance</span>
        </div>
        {score.lastAssessment && (
          <p className="mt-1 text-xs text-gray-400">
            Last assessed: {new Date(score.lastAssessment).toLocaleDateString()}
          </p>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={cn(
            'h-1.5 rounded-full',
            score.score >= 80 ? 'bg-green-500' : score.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${score.score}%` }}
        />
      </div>
    </div>
  );
}

function ViolationSummaryCard({ violations }: { violations: ViolationSummary }) {
  const hasIssues = violations.open > 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        hasIssues ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Open Violations</span>
        {hasIssues && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold',
              hasIssues ? 'text-red-600' : 'text-gray-900'
            )}
          >
            {violations.open}
          </span>
          <span className="text-sm text-gray-500">of {violations.total} total</span>
        </div>
      </div>
    </div>
  );
}

function DataRequestCard({ requests }: { requests: DataRequestSummary }) {
  const hasOverdue = requests.overdue > 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-5',
        hasOverdue ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Data Requests</span>
        {hasOverdue && (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              'bg-amber-100 text-amber-700'
            )}
          >
            {requests.overdue} overdue
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">{requests.pending}</span>
          <span className="text-sm text-gray-500">pending</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">{requests.total} total requests</p>
      </div>
    </div>
  );
}

function QuickActionButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-3',
        'text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors'
      )}
    >
      {label}
    </a>
  );
}

export default ComplianceDashboard;
