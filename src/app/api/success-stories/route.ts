/**
 * Success Stories API Routes (LC-FEAT-022)
 * GET /api/success-stories - List stories
 * POST /api/success-stories - Create new story
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  CreateStoryInput,
  StoryFilters,
  StoryStatus,
  StoryVisibility,
} from '@/types/success-story.types';

/**
 * GET /api/success-stories
 * List success stories with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;

  // Parse filters
  const filters: StoryFilters = {
    status: searchParams.get('status') as StoryStatus | undefined,
    visibility: searchParams.get('visibility') as StoryVisibility | undefined,
    caseId: searchParams.get('caseId') || undefined,
    outcomeCategory: searchParams.get('outcomeCategory') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    featuredOnly: searchParams.get('featuredOnly') === 'true',
    publishedAfter: searchParams.get('publishedAfter') || undefined,
    publishedBefore: searchParams.get('publishedBefore') || undefined,
  };

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '12', 10), 50);
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('success_stories')
    .select('*, cases(id, case_number, first_name, last_name, disposition, resolution_date)', { count: 'exact' });

  // Apply visibility filter based on auth status
  if (!user) {
    // Public users can only see published public stories
    query = query.eq('status', 'published').eq('visibility', 'public');
  } else {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'law_enforcement') {
      // Staff can see all stories
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.visibility) {
        query = query.eq('visibility', filters.visibility);
      }
    } else {
      // Regular users see published stories and their own drafts
      query = query.or(`status.eq.published,created_by.eq.${user.id}`);
    }
  }

  // Apply additional filters
  if (filters.caseId) {
    query = query.eq('case_id', filters.caseId);
  }

  if (filters.outcomeCategory) {
    query = query.eq('outcome_category', filters.outcomeCategory);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters.featuredOnly) {
    query = query.eq('featured_on_homepage', true);
  }

  if (filters.publishedAfter) {
    query = query.gte('published_at', filters.publishedAfter);
  }

  if (filters.publishedBefore) {
    query = query.lte('published_at', filters.publishedBefore);
  }

  // Apply pagination and ordering
  query = query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching success stories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to camelCase
  const stories = (data || []).map(transformStoryFromDB);

  return NextResponse.json({
    stories,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  });
}

/**
 * POST /api/success-stories
 * Create a new success story
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

  const body: CreateStoryInput = await request.json();

  // Validate required fields
  if (!body.caseId || !body.title || !body.summary) {
    return NextResponse.json(
      { error: 'Missing required fields: caseId, title, summary' },
      { status: 400 }
    );
  }

  // Verify the case exists and user has access
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, reporter_id, status, disposition')
    .eq('id', body.caseId)
    .single();

  if (caseError || !caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Check if user can create story for this case
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCaseOwner = caseData.reporter_id === user.id;

  if (!isStaff && !isCaseOwner) {
    return NextResponse.json(
      { error: 'You do not have permission to create a story for this case' },
      { status: 403 }
    );
  }

  // Only allow stories for resolved cases
  if (caseData.status !== 'resolved' && caseData.status !== 'closed') {
    return NextResponse.json(
      { error: 'Stories can only be created for resolved or closed cases' },
      { status: 400 }
    );
  }

  // Create the story
  const storyData = {
    case_id: body.caseId,
    title: body.title,
    title_fr: body.titleFr,
    summary: body.summary,
    summary_fr: body.summaryFr,
    full_story: body.fullStory,
    full_story_fr: body.fullStoryFr,
    anonymization_level: body.anonymizationLevel || 'partial',
    display_name: body.displayName,
    display_location: body.displayLocation,
    featured_image_url: body.featuredImageUrl,
    gallery_images: body.galleryImages || [],
    video_url: body.videoUrl,
    family_quote: body.familyQuote,
    family_quote_fr: body.familyQuoteFr,
    investigator_quote: body.investigatorQuote,
    investigator_quote_fr: body.investigatorQuoteFr,
    volunteer_quote: body.volunteerQuote,
    volunteer_quote_fr: body.volunteerQuoteFr,
    tags: body.tags || [],
    outcome_category: body.outcomeCategory,
    visibility: body.visibility || 'private',
    status: 'draft' as const,
    created_by: user.id,
  };

  const { data: story, error: createError } = await supabase
    .from('success_stories')
    .insert(storyData)
    .select()
    .single();

  if (createError) {
    console.error('Error creating success story:', createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Log the creation
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'create',
    action_description: `Created success story for case ${body.caseId}`,
    resource_type: 'success_stories',
    resource_id: story.id,
    new_values: storyData,
  });

  return NextResponse.json(transformStoryFromDB(story), { status: 201 });
}

// Helper function to transform database record to camelCase
function transformStoryFromDB(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    caseId: record.case_id,
    title: record.title,
    titleFr: record.title_fr,
    summary: record.summary,
    summaryFr: record.summary_fr,
    fullStory: record.full_story,
    fullStoryFr: record.full_story_fr,
    anonymizationLevel: record.anonymization_level,
    displayName: record.display_name,
    displayLocation: record.display_location,
    redactedFields: record.redacted_fields,
    originalContentHash: record.original_content_hash,
    featuredImageUrl: record.featured_image_url,
    galleryImages: record.gallery_images,
    videoUrl: record.video_url,
    familyQuote: record.family_quote,
    familyQuoteFr: record.family_quote_fr,
    investigatorQuote: record.investigator_quote,
    investigatorQuoteFr: record.investigator_quote_fr,
    volunteerQuote: record.volunteer_quote,
    volunteerQuoteFr: record.volunteer_quote_fr,
    tags: record.tags,
    outcomeCategory: record.outcome_category,
    daysUntilResolution: record.days_until_resolution,
    tipCount: record.tip_count,
    volunteerCount: record.volunteer_count,
    agencyCount: record.agency_count,
    status: record.status,
    visibility: record.visibility,
    publishedAt: record.published_at,
    publishedBy: record.published_by,
    featuredOnHomepage: record.featured_on_homepage,
    featuredUntil: record.featured_until,
    slug: record.slug,
    metaDescription: record.meta_description,
    metaKeywords: record.meta_keywords,
    viewCount: record.view_count,
    shareCount: record.share_count,
    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    case: record.cases ? {
      id: (record.cases as Record<string, unknown>).id,
      caseNumber: (record.cases as Record<string, unknown>).case_number,
      firstName: (record.cases as Record<string, unknown>).first_name,
      lastName: (record.cases as Record<string, unknown>).last_name,
      disposition: (record.cases as Record<string, unknown>).disposition,
      resolutionDate: (record.cases as Record<string, unknown>).resolution_date,
    } : undefined,
  };
}
