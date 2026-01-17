/**
 * Audit Log Export API Routes (LC-FEAT-037)
 * Export audit logs for legal requests and compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ExportRequest {
  format: 'json' | 'csv';
  startDate: string;
  endDate: string;
  includeUserInfo?: boolean;
  includePiiAccess?: boolean;
  resourceTypes?: string[];
  actions?: string[];
  userId?: string;
  legalHoldId?: string;
  purpose: string;
}

/**
 * POST /api/audit/export
 * Export audit logs for legal/compliance purposes
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const body: ExportRequest = await request.json();

  // Validate required fields
  if (!body.startDate || !body.endDate || !body.purpose) {
    return NextResponse.json(
      { error: 'Missing required fields: startDate, endDate, purpose' },
      { status: 400 }
    );
  }

  // Log this export as an audit event
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    actor_email: profile.email,
    actor_role: profile.role,
    action: 'export',
    action_description: `Audit log export: ${body.purpose}`,
    resource_type: 'audit_logs',
    is_sensitive_data: true,
    compliance_relevant: true,
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
    user_agent: request.headers.get('user-agent'),
    new_values: {
      exportParams: body,
      exportedAt: new Date().toISOString(),
    },
  });

  // Build the query for audit logs
  let query = supabase
    .from('comprehensive_audit_logs')
    .select('*')
    .gte('created_at', body.startDate)
    .lte('created_at', body.endDate)
    .order('created_at', { ascending: true });

  if (body.userId) {
    query = query.eq('user_id', body.userId);
  }

  if (body.resourceTypes && body.resourceTypes.length > 0) {
    query = query.in('resource_type', body.resourceTypes);
  }

  if (body.actions && body.actions.length > 0) {
    query = query.in('action', body.actions);
  }

  const { data: auditLogs, error } = await query;

  if (error) {
    console.error('Error fetching audit logs for export:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optionally include data access logs
  let dataAccessLogs: Record<string, unknown>[] = [];
  if (body.includePiiAccess) {
    const { data: accessLogs } = await supabase
      .from('data_access_logs')
      .select('*')
      .gte('created_at', body.startDate)
      .lte('created_at', body.endDate)
      .eq('contains_pii', true)
      .order('created_at', { ascending: true });

    dataAccessLogs = accessLogs || [];
  }

  // Format response based on requested format
  if (body.format === 'csv') {
    const csvContent = convertToCSV(auditLogs || [], dataAccessLogs);

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // Default JSON response
  const exportData = {
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      exportedBy: profile.email,
      purpose: body.purpose,
      dateRange: {
        start: body.startDate,
        end: body.endDate,
      },
      filters: {
        userId: body.userId,
        resourceTypes: body.resourceTypes,
        actions: body.actions,
        includePiiAccess: body.includePiiAccess,
      },
      recordCounts: {
        auditLogs: (auditLogs || []).length,
        dataAccessLogs: dataAccessLogs.length,
      },
    },
    auditLogs: auditLogs || [],
    dataAccessLogs: body.includePiiAccess ? dataAccessLogs : undefined,
  };

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}

function convertToCSV(auditLogs: Record<string, unknown>[], dataAccessLogs: Record<string, unknown>[]): string {
  const headers = [
    'id',
    'created_at',
    'user_id',
    'actor_email',
    'action',
    'resource_type',
    'resource_id',
    'ip_address',
    'is_sensitive_data',
    'compliance_relevant',
  ];

  let csv = headers.join(',') + '\n';

  for (const log of auditLogs) {
    const row = headers.map((header) => {
      const value = log[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      return String(value).includes(',') ? `"${value}"` : String(value);
    });
    csv += row.join(',') + '\n';
  }

  // Add data access logs section if present
  if (dataAccessLogs.length > 0) {
    csv += '\n\n--- DATA ACCESS LOGS ---\n';
    const accessHeaders = [
      'id',
      'created_at',
      'user_id',
      'resource_type',
      'resource_id',
      'access_type',
      'contains_pii',
      'pii_fields_accessed',
      'ip_address',
    ];
    csv += accessHeaders.join(',') + '\n';

    for (const log of dataAccessLogs) {
      const row = accessHeaders.map((header) => {
        const value = log[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).includes(',') ? `"${value}"` : String(value);
      });
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}
