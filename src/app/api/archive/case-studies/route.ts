import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/archive/case-studies
 * List published case studies
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const query = searchParams.get('query');

    let dbQuery = supabase
      .from('case_studies')
      .select(
        `
        *,
        archived_cases!inner (
          archive_number,
          case_category,
          province,
          disposition,
          year_reported
        )
      `,
        { count: 'exact' }
      )
      .eq('is_published', true)
      .eq('access_level', 'public');

    if (category) {
      dbQuery = dbQuery.eq('category', category);
    }

    if (tags && tags.length > 0) {
      dbQuery = dbQuery.overlaps('tags', tags);
    }

    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,abstract.ilike.%${query}%`);
    }

    const offset = (page - 1) * pageSize;
    dbQuery = dbQuery
      .range(offset, offset + pageSize - 1)
      .order('published_at', { ascending: false });

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Case studies query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch case studies' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      caseStudies: data || [],
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Case studies API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/archive/case-studies
 * Create a new case study (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'developer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from('case_studies')
      .insert({
        archived_case_id: body.archivedCaseId,
        title: body.title,
        subtitle: body.subtitle,
        abstract: body.abstract,
        introduction: body.introduction,
        background: body.background,
        methodology_applied: body.methodologyApplied,
        timeline_summary: body.timelineSummary,
        key_decisions: body.keyDecisions,
        challenges_section: body.challengesSection,
        resolution_details: body.resolutionDetails,
        lessons_learned: body.lessonsLearned,
        recommendations: body.recommendations,
        conclusion: body.conclusion,
        category: body.category,
        tags: body.tags || [],
        difficulty_level: body.difficultyLevel || 'intermediate',
        target_audience: body.targetAudience || [],
        access_level: body.accessLevel || 'academic',
        requires_agreement: body.requiresAgreement ?? true,
        author_id: user.id,
        contributing_authors: body.contributingAuthors,
        external_reviewers: body.externalReviewers,
      })
      .select()
      .single();

    if (error) {
      console.error('Create case study error:', error);
      return NextResponse.json(
        { error: 'Failed to create case study' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('research_activity_logs').insert({
      user_id: user.id,
      action: 'create',
      resource_type: 'case_study',
      resource_id: data.id,
      details: { title: body.title },
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Case study creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
