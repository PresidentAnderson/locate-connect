import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive/exports
 * List user's research exports
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

    let dbQuery = supabase
      .from('research_exports')
      .select('*', { count: 'exact' });

    // Non-admins can only see their own exports
    if (!isAdmin) {
      dbQuery = dbQuery.eq('user_id', user.id);
    }

    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Exports query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exports' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exports: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Exports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/archive/exports
 * Create a new research export
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has approved access
    const { data: accessRequest } = await supabase
      .from('research_access_requests')
      .select('*')
      .eq('requester_id', user.id)
      .eq('status', 'approved')
      .gte('access_end_date', new Date().toISOString().split('T')[0])
      .single();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile && ['admin', 'developer'].includes(profile.role);

    if (!accessRequest && !isAdmin) {
      return NextResponse.json(
        { error: 'You need an approved research access request to export data' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.exportName || !body.exportFormat || !body.includedFields?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: exportName, exportFormat, includedFields' },
        { status: 400 }
      );
    }

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('research_exports')
      .insert({
        user_id: user.id,
        access_request_id: accessRequest?.id,
        export_name: body.exportName,
        export_format: body.exportFormat,
        export_description: body.exportDescription,
        filter_criteria: body.filterCriteria || {},
        date_range_start: body.dateRangeStart,
        date_range_end: body.dateRangeEnd,
        regions: body.regions,
        case_types: body.caseTypes,
        included_fields: body.includedFields,
        excluded_fields: body.excludedFields || [],
        status: 'processing',
      })
      .select()
      .single();

    if (exportError) {
      console.error('Create export error:', exportError);
      return NextResponse.json(
        { error: 'Failed to create export' },
        { status: 500 }
      );
    }

    // Build query based on filters
    let dataQuery = supabase
      .from('archived_cases')
      .select(body.includedFields.join(','))
      .eq('archive_status', 'published')
      .eq('family_opted_out', false);

    if (body.filterCriteria?.caseCategory) {
      dataQuery = dataQuery.eq('case_category', body.filterCriteria.caseCategory);
    }

    if (body.filterCriteria?.province) {
      dataQuery = dataQuery.eq('province', body.filterCriteria.province);
    }

    if (body.filterCriteria?.disposition) {
      dataQuery = dataQuery.eq('disposition', body.filterCriteria.disposition);
    }

    if (body.dateRangeStart) {
      dataQuery = dataQuery.gte('year_reported', parseInt(body.dateRangeStart));
    }

    if (body.dateRangeEnd) {
      dataQuery = dataQuery.lte('year_reported', parseInt(body.dateRangeEnd));
    }

    if (body.regions?.length) {
      dataQuery = dataQuery.in('province', body.regions);
    }

    const { data: exportData, error: dataError } = await dataQuery;

    if (dataError) {
      console.error('Export data query error:', dataError);
      await supabase
        .from('research_exports')
        .update({ status: 'failed', error_message: 'Failed to query data' })
        .eq('id', exportRecord.id);

      return NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      );
    }

    // Format data based on export format
    let fileContent: string;
    let contentType: string;

    switch (body.exportFormat) {
      case 'csv':
        fileContent = convertToCSV((exportData || []) as unknown as Record<string, unknown>[], body.includedFields);
        contentType = 'text/csv';
        break;
      case 'json':
        fileContent = JSON.stringify(exportData || [], null, 2);
        contentType = 'application/json';
        break;
      default:
        fileContent = JSON.stringify(exportData || [], null, 2);
        contentType = 'application/json';
    }

    // Update export record with results
    await supabase
      .from('research_exports')
      .update({
        status: 'completed',
        total_records: exportData?.length || 0,
        file_size_bytes: new Blob([fileContent]).size,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .eq('id', exportRecord.id);

    // Log activity
    await supabase.from('research_activity_logs').insert({
      user_id: user.id,
      action: 'export',
      resource_type: 'export',
      resource_id: exportRecord.id,
      details: {
        format: body.exportFormat,
        recordCount: exportData?.length || 0,
        fields: body.includedFields,
      },
    });

    // Return the data directly (in production, you'd store in S3/storage and return URL)
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${body.exportName}.${body.exportFormat === 'csv' ? 'csv' : 'json'}"`,
      },
    });
  } catch (error) {
    console.error('Export creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: Record<string, unknown>[], fields: string[]): string {
  if (!data.length) return fields.join(',');

  const header = fields.join(',');
  const rows = data.map((row) =>
    fields
      .map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}
