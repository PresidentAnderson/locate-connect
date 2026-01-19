/**
 * Data Portability Export Download API Route
 * Handles secure download of data portability export files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/compliance/data-portability/[id]/download
 * Download a data portability export file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: exportId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get export record
  const { data: exportRecord, error: fetchError } = await supabase
    .from('data_portability_exports')
    .select('*')
    .eq('id', exportId)
    .single();

  if (fetchError || !exportRecord) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 });
  }

  // Check authorization - only the subject or admin can download
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile && ['admin', 'developer', 'super_admin'].includes(profile.role);
  const isOwner = exportRecord.subject_id === user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Check if export is ready
  if (exportRecord.status !== 'ready') {
    return NextResponse.json(
      { error: `Export is not ready. Current status: ${exportRecord.status}` },
      { status: 400 }
    );
  }

  // Check if export has expired
  if (exportRecord.expires_at && new Date(exportRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Export has expired' }, { status: 410 });
  }

  // Get file from storage
  if (!exportRecord.file_path) {
    return NextResponse.json({ error: 'Export file not found' }, { status: 404 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('data-portability')
    .download(exportRecord.file_path);

  if (downloadError || !fileData) {
    console.error('Error downloading export file:', downloadError);
    return NextResponse.json({ error: 'Failed to download export file' }, { status: 500 });
  }

  // Determine content type
  const format = exportRecord.export_format || 'json';
  const contentType =
    format === 'csv'
      ? 'text/csv'
      : format === 'xml'
        ? 'application/xml'
        : 'application/json';

  const filename = exportRecord.file_path.split('/').pop() || `data-export.${format}`;

  // Log download for audit
  await supabase.from('user_activity_log').insert({
    user_id: user.id,
    action: 'data_export_downloaded',
    resource_type: 'data_portability_export',
    resource_id: exportId,
    details: {
      format,
      file_size_bytes: exportRecord.file_size_bytes,
      downloaded_by: isOwner ? 'owner' : 'admin',
    },
  });

  // Update download count
  await supabase
    .from('data_portability_exports')
    .update({
      download_count: (exportRecord.download_count || 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', exportId);

  // Return file with appropriate headers
  const arrayBuffer = await fileData.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(arrayBuffer.byteLength),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
