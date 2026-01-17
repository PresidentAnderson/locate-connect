/**
 * Public Success Story Gallery API (LC-FEAT-022)
 * GET /api/success-stories/gallery - Public gallery with anonymized metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { StoryGalleryItem, SuccessMetrics } from '@/types/success-story.types';

/**
 * GET /api/success-stories/gallery
 * Public endpoint for the success story gallery
 * Returns published stories and aggregate metrics
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const searchParams = request.nextUrl.searchParams;

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '12', 10), 24);
  const offset = (page - 1) * pageSize;

  // Filters
  const outcomeCategory = searchParams.get('outcomeCategory');
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);
  const featured = searchParams.get('featured') === 'true';

  // Build query for published public stories
  let query = supabase
    .from('success_stories')
    .select('id, title, title_fr, summary, summary_fr, featured_image_url, slug, published_at, outcome_category, tags, view_count, display_name, display_location, days_until_resolution', { count: 'exact' })
    .eq('status', 'published')
    .eq('visibility', 'public');

  if (outcomeCategory) {
    query = query.eq('outcome_category', outcomeCategory);
  }

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags);
  }

  if (featured) {
    query = query.eq('featured_on_homepage', true);
  }

  query = query
    .order('published_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: stories, error, count } = await query;

  if (error) {
    console.error('Error fetching gallery stories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform stories for gallery display
  const galleryItems: StoryGalleryItem[] = (stories || []).map(story => ({
    id: story.id,
    title: story.title,
    titleFr: story.title_fr,
    summary: story.summary,
    summaryFr: story.summary_fr,
    featuredImageUrl: story.featured_image_url,
    slug: story.slug,
    publishedAt: story.published_at,
    outcomeCategory: story.outcome_category,
    tags: story.tags || [],
    viewCount: story.view_count || 0,
    displayName: story.display_name,
    displayLocation: story.display_location,
    daysUntilResolution: story.days_until_resolution,
  }));

  // Fetch latest aggregate metrics (public, anonymized)
  const { data: metricsData } = await supabase
    .from('success_metrics')
    .select('*')
    .eq('metric_period', 'all_time')
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  // If no all_time metrics, calculate from database
  let metrics: Partial<SuccessMetrics>;

  if (metricsData) {
    metrics = {
      totalCasesResolved: metricsData.total_cases_resolved,
      foundAliveSafe: metricsData.found_alive_safe,
      reunitedWithFamily: metricsData.reunited_with_family,
      storiesPublished: metricsData.stories_published,
      totalStoryViews: metricsData.total_story_views,
      totalVolunteers: metricsData.total_volunteers,
      averageResolutionDays: metricsData.average_resolution_days,
    };
  } else {
    // Fallback: calculate basic metrics
    const { count: publishedCount } = await supabase
      .from('success_stories')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('visibility', 'public');

    const { data: resolvedCases } = await supabase
      .from('cases')
      .select('disposition')
      .in('status', ['resolved', 'closed'])
      .not('disposition', 'is', null);

    const foundSafe = resolvedCases?.filter(c =>
      c.disposition === 'found_alive_safe' || c.disposition === 'returned_voluntarily'
    ).length || 0;

    metrics = {
      totalCasesResolved: resolvedCases?.length || 0,
      foundAliveSafe: foundSafe,
      reunitedWithFamily: foundSafe,
      storiesPublished: publishedCount || 0,
    };
  }

  // Get outcome categories for filtering
  const { data: categories } = await supabase
    .from('success_stories')
    .select('outcome_category')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .not('outcome_category', 'is', null);

  const uniqueCategories = [...new Set(categories?.map(c => c.outcome_category) || [])];

  // Get popular tags
  const { data: allTags } = await supabase
    .from('success_stories')
    .select('tags')
    .eq('status', 'published')
    .eq('visibility', 'public');

  const tagCounts: Record<string, number> = {};
  allTags?.forEach(story => {
    (story.tags || []).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const popularTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return NextResponse.json({
    stories: galleryItems,
    metrics,
    filters: {
      categories: uniqueCategories,
      popularTags,
    },
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  });
}
