/**
 * Data Portability Export API Routes (LC-FEAT-037)
 * Handle data portability requests (GDPR Article 20 / PIPEDA)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ExportRequestInput {
  format: 'json' | 'csv' | 'xml';
  tablesIncluded?: string[];
}

/**
 * GET /api/compliance/data-portability
 * List data portability exports for the current user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Get user profile to check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

  let query = supabase
    .from('data_portability_exports')
    .select('*', { count: 'exact' });

  // Non-admin users can only see their own exports
  if (!isAdmin) {
    query = query.eq('subject_id', user.id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching data exports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/compliance/data-portability
 * Request a data portability export
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

  const body: ExportRequestInput = await request.json();

  // Check for existing pending/processing exports
  const { data: existingExport } = await supabase
    .from('data_portability_exports')
    .select('id')
    .eq('subject_id', user.id)
    .in('status', ['pending', 'processing'])
    .single();

  if (existingExport) {
    return NextResponse.json(
      { error: 'You already have a pending export request' },
      { status: 400 }
    );
  }

  // Set expiration for download link (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const exportData = {
    subject_id: user.id,
    export_format: body.format || 'json',
    tables_included: body.tablesIncluded || [
      'profiles',
      'cases',
      'leads',
      'tips',
      'notifications',
      'consent_records',
    ],
    status: 'pending',
    requested_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const { data, error } = await supabase
    .from('data_portability_exports')
    .insert(exportData)
    .select()
    .single();

  if (error) {
    console.error('Error creating data export request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger async export generation
  await generateDataExport(supabase, data.id, user.id, body.format || 'json');

  return NextResponse.json(data, { status: 201 });
}

/**
 * Generate the data export (would be async in production)
 */
async function generateDataExport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exportId: string,
  userId: string,
  format: string
) {
  try {
    // Update status to processing
    await supabase
      .from('data_portability_exports')
      .update({ status: 'processing' })
      .eq('id', exportId);

    // Gather all user data
    const userData: Record<string, unknown> = {};
    let totalRecords = 0;

    // Profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      // Remove sensitive fields
      const sanitizedProfile = { ...profile };
      delete (sanitizedProfile as Record<string, unknown>).verification_status;
      delete (sanitizedProfile as Record<string, unknown>).verified_by;
      userData.profile = sanitizedProfile;
      totalRecords++;
    }

    // Cases (reported by user)
    const { data: cases } = await supabase
      .from('cases')
      .select('*')
      .eq('reporter_id', userId);

    if (cases && cases.length > 0) {
      userData.cases = cases;
      totalRecords += cases.length;
    }

    // Leads (created by user for LE users)
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('assigned_to', userId);

    if (leads && leads.length > 0) {
      userData.leads = leads;
      totalRecords += leads.length;
    }

    // Tips (submitted by user)
    const { data: tips } = await supabase
      .from('tips')
      .select('*')
      .eq('tipster_id', userId);

    if (tips && tips.length > 0) {
      userData.tips = tips;
      totalRecords += tips.length;
    }

    // Notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (notifications && notifications.length > 0) {
      userData.notifications = notifications;
      totalRecords += notifications.length;
    }

    // Consent records
    const { data: consents } = await supabase
      .from('consent_records')
      .select('*')
      .eq('user_id', userId);

    if (consents && consents.length > 0) {
      userData.consent_records = consents;
      totalRecords += consents.length;
    }

    // Sessions (limited to last 100)
    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(100);

    if (sessions && sessions.length > 0) {
      // Remove sensitive session data
      userData.sessions = sessions.map((s) => ({
        login_at: s.login_at,
        logout_at: s.logout_at,
        device_type: s.device_type,
        browser: s.browser,
        os: s.os,
        geo_country: s.geo_country,
        geo_city: s.geo_city,
      }));
      totalRecords += sessions.length;
    }

    // Format the data
    let fileContent: string;
    if (format === 'csv') {
      fileContent = convertToCSV(userData);
    } else if (format === 'xml') {
      fileContent = convertToXML(userData);
    } else {
      fileContent = JSON.stringify(userData, null, 2);
    }

    const fileSizeBytes = Buffer.byteLength(fileContent, 'utf8');

    // Calculate record counts
    const recordCounts: Record<string, number> = {};
    for (const [key, value] of Object.entries(userData)) {
      if (Array.isArray(value)) {
        recordCounts[key] = value.length;
      } else {
        recordCounts[key] = 1;
      }
    }

    // Determine file extension
    const extension = format === 'csv' ? 'csv' : format === 'xml' ? 'xml' : 'json';
    const filename = `data-export-${userId}-${exportId}.${extension}`;
    const storagePath = `exports/${userId}/${filename}`;

    // Store file to Supabase Storage
    const fileBlob = new Blob([fileContent], {
      type: format === 'csv' ? 'text/csv' : format === 'xml' ? 'application/xml' : 'application/json',
    });

    const { error: uploadError } = await supabase.storage
      .from('data-portability')
      .upload(storagePath, fileBlob, {
        contentType: format === 'csv' ? 'text/csv' : format === 'xml' ? 'application/xml' : 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading export file:', uploadError);
      throw new Error('Failed to store export file');
    }

    // Generate signed URL for download (valid for 7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('data-portability')
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60); // 7 days in seconds

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      // Fall back to API download route
    }

    // Update export record with file info
    await supabase
      .from('data_portability_exports')
      .update({
        status: 'ready',
        generated_at: new Date().toISOString(),
        total_records: totalRecords,
        record_counts: recordCounts,
        file_size_bytes: fileSizeBytes,
        file_path: storagePath,
        download_url: signedUrlData?.signedUrl || `/api/compliance/data-portability/${exportId}/download`,
      })
      .eq('id', exportId);

    // Log the export generation for audit
    await supabase.from('user_activity_log').insert({
      user_id: userId,
      action: 'data_export_generated',
      resource_type: 'data_portability_export',
      resource_id: exportId,
      details: {
        format,
        total_records: totalRecords,
        file_size_bytes: fileSizeBytes,
        tables: Object.keys(userData),
      },
    });
  } catch (error) {
    console.error('Error generating data export:', error);
    await supabase
      .from('data_portability_exports')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', exportId);
  }
}

function convertToCSV(data: Record<string, unknown>): string {
  let csv = '';

  for (const [tableName, records] of Object.entries(data)) {
    csv += `\n=== ${tableName.toUpperCase()} ===\n`;

    if (Array.isArray(records) && records.length > 0) {
      const headers = Object.keys(records[0] as Record<string, unknown>);
      csv += headers.join(',') + '\n';

      for (const record of records) {
        const row = headers.map((h) => {
          const value = (record as Record<string, unknown>)[h];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          const strValue = String(value);
          return strValue.includes(',') || strValue.includes('"')
            ? `"${strValue.replace(/"/g, '""')}"`
            : strValue;
        });
        csv += row.join(',') + '\n';
      }
    } else if (records && typeof records === 'object') {
      const headers = Object.keys(records);
      csv += headers.join(',') + '\n';
      const row = headers.map((h) => {
        const value = (records as Record<string, unknown>)[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        const strValue = String(value);
        return strValue.includes(',') || strValue.includes('"')
          ? `"${strValue.replace(/"/g, '""')}"`
          : strValue;
      });
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}

function convertToXML(data: Record<string, unknown>): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data_export>\n';

  function objectToXML(obj: unknown, indent: number): string {
    const spaces = '  '.repeat(indent);
    if (Array.isArray(obj)) {
      return obj.map((item) => `${spaces}<item>\n${objectToXML(item, indent + 1)}${spaces}</item>\n`).join('');
    } else if (obj && typeof obj === 'object') {
      return Object.entries(obj)
        .map(([key, value]) => {
          const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
          if (value === null || value === undefined) {
            return `${spaces}<${sanitizedKey}/>\n`;
          } else if (typeof value === 'object') {
            return `${spaces}<${sanitizedKey}>\n${objectToXML(value, indent + 1)}${spaces}</${sanitizedKey}>\n`;
          } else {
            const escaped = String(value)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `${spaces}<${sanitizedKey}>${escaped}</${sanitizedKey}>\n`;
          }
        })
        .join('');
    }
    return `${spaces}${String(obj)}\n`;
  }

  for (const [key, value] of Object.entries(data)) {
    xml += `  <${key}>\n${objectToXML(value, 2)}  </${key}>\n`;
  }

  xml += '</data_export>';
  return xml;
}
