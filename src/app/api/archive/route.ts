import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive
 * Search and list archived cases
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const query = searchParams.get('query') || '';
    const caseCategory = searchParams.get('caseCategory');
    const province = searchParams.get('province');
    const disposition = searchParams.get('disposition');
    const yearMin = searchParams.get('yearMin');
    const yearMax = searchParams.get('yearMax');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);

    // Build query
    let dbQuery = supabase
      .from('archived_cases')
      .select('*', { count: 'exact' })
      .eq('archive_status', 'published')
      .eq('family_opted_out', false);

    // Apply filters
    if (caseCategory) {
      dbQuery = dbQuery.eq('case_category', caseCategory);
    }

    if (province) {
      dbQuery = dbQuery.eq('province', province);
    }

    if (disposition) {
      dbQuery = dbQuery.eq('disposition', disposition);
    }

    if (yearMin) {
      dbQuery = dbQuery.gte('year_reported', parseInt(yearMin));
    }

    if (yearMax) {
      dbQuery = dbQuery.lte('year_reported', parseInt(yearMax));
    }

    if (tags && tags.length > 0) {
      dbQuery = dbQuery.overlaps('research_tags', tags);
    }

    if (query) {
      dbQuery = dbQuery.or(`lessons_learned.ilike.%${query}%,region.ilike.%${query}%`);
    }

    // Pagination
    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery.range(offset, offset + pageSize - 1);

    // Order by most recent
    dbQuery = dbQuery.order('year_reported', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Archive search error:', error);
      return NextResponse.json(
        { error: 'Failed to search archived cases' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cases: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Archive API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
