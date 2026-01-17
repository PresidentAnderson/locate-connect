/**
 * Success Story Detail API Routes (LC-FEAT-022)
 * GET /api/success-stories/[id] - Get story details
 * PUT /api/success-stories/[id] - Update story
 * DELETE /api/success-stories/[id] - Delete story
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateStoryInput } from '@/types/success-story.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/success-stories/[id]
 * Get a single success story with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the story with related data
  const { data: story, error } = await supabase
    .from('success_stories')
    .select(`
      *,
      cases(id, case_number, first_name, last_name, disposition, resolution_date),
      story_consent(*),
      story_approvals(*),
      family_thank_you_messages(*),
      story_media_templates(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    console.error('Error fetching story:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check access permissions
  const isPublished = story.status === 'published';
  const isPublic = story.visibility === 'public';

  if (!isPublished || !isPublic) {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
    const isCreator = story.created_by === user.id;

    if (!isStaff && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  // Track view interaction for published stories (don't track for creators/staff viewing drafts)
  if (isPublished && isPublic) {
    const sessionHash = request.headers.get('x-session-id') ||
      Math.random().toString(36).substring(7);

    await supabase.from('story_interactions').insert({
      story_id: id,
      interaction_type: 'view',
      source: 'api',
      referrer: request.headers.get('referer'),
      session_hash: sessionHash,
      device_type: detectDeviceType(request.headers.get('user-agent')),
    });
  }

  return NextResponse.json(transformStoryFromDB(story));
}

/**
 * PUT /api/success-stories/[id]
 * Update a success story
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch existing story
  const { data: existingStory, error: fetchError } = await supabase
    .from('success_stories')
    .select('*, cases(reporter_id)')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCreator = existingStory.created_by === user.id;
  const isCaseOwner = existingStory.cases?.reporter_id === user.id;

  if (!isStaff && !isCreator && !isCaseOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body: UpdateStoryInput = await request.json();

  // Prevent non-staff from publishing
  if (body.status === 'published' && !isStaff) {
    return NextResponse.json(
      { error: 'Only staff can publish stories' },
      { status: 403 }
    );
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  // Map camelCase fields to snake_case
  const fieldMappings: Record<string, string> = {
    title: 'title',
    titleFr: 'title_fr',
    summary: 'summary',
    summaryFr: 'summary_fr',
    fullStory: 'full_story',
    fullStoryFr: 'full_story_fr',
    anonymizationLevel: 'anonymization_level',
    displayName: 'display_name',
    displayLocation: 'display_location',
    featuredImageUrl: 'featured_image_url',
    galleryImages: 'gallery_images',
    videoUrl: 'video_url',
    familyQuote: 'family_quote',
    familyQuoteFr: 'family_quote_fr',
    investigatorQuote: 'investigator_quote',
    investigatorQuoteFr: 'investigator_quote_fr',
    volunteerQuote: 'volunteer_quote',
    volunteerQuoteFr: 'volunteer_quote_fr',
    tags: 'tags',
    outcomeCategory: 'outcome_category',
    visibility: 'visibility',
    status: 'status',
    featuredOnHomepage: 'featured_on_homepage',
    featuredUntil: 'featured_until',
    metaDescription: 'meta_description',
    metaKeywords: 'meta_keywords',
  };

  for (const [camelKey, snakeKey] of Object.entries(fieldMappings)) {
    if (body[camelKey as keyof UpdateStoryInput] !== undefined) {
      updateData[snakeKey] = body[camelKey as keyof UpdateStoryInput];
    }
  }

  // Update the story
  const { data: updatedStory, error: updateError } = await supabase
    .from('success_stories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating story:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the update
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'update',
    action_description: `Updated success story ${id}`,
    resource_type: 'success_stories',
    resource_id: id,
    old_values: existingStory,
    new_values: updateData,
  });

  return NextResponse.json(transformStoryFromDB(updatedStory));
}

/**
 * DELETE /api/success-stories/[id]
 * Delete a success story (soft delete via status change)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions - only staff can delete
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only administrators can delete stories' },
      { status: 403 }
    );
  }

  // Archive instead of hard delete
  const { error: deleteError } = await supabase
    .from('success_stories')
    .update({
      status: 'archived',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (deleteError) {
    console.error('Error deleting story:', deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Log the deletion
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'delete',
    action_description: `Archived success story ${id}`,
    resource_type: 'success_stories',
    resource_id: id,
  });

  return NextResponse.json({ success: true, message: 'Story archived' });
}

// Helper function to transform database record to camelCase
function transformStoryFromDB(record: Record<string, unknown>): Record<string, unknown> {
  const transformed: Record<string, unknown> = {
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
  };

  // Transform related data if present
  if (record.cases) {
    const caseData = record.cases as Record<string, unknown>;
    transformed.case = {
      id: caseData.id,
      caseNumber: caseData.case_number,
      firstName: caseData.first_name,
      lastName: caseData.last_name,
      disposition: caseData.disposition,
      resolutionDate: caseData.resolution_date,
    };
  }

  if (Array.isArray(record.story_consent)) {
    transformed.consents = record.story_consent.map((c: Record<string, unknown>) => ({
      id: c.id,
      storyId: c.story_id,
      consenterId: c.consenter_id,
      consenterName: c.consenter_name,
      consenterEmail: c.consenter_email,
      consenterPhone: c.consenter_phone,
      consenterRelationship: c.consenter_relationship,
      consentType: c.consent_type,
      consentScope: c.consent_scope,
      isGranted: c.is_granted,
      grantedAt: c.granted_at,
      expiresAt: c.expires_at,
      consentMethod: c.consent_method,
      consentDocumentUrl: c.consent_document_url,
      verifiedAt: c.verified_at,
      verifiedBy: c.verified_by,
      withdrawnAt: c.withdrawn_at,
      withdrawalReason: c.withdrawal_reason,
      consentVersion: c.consent_version,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  if (Array.isArray(record.story_approvals)) {
    transformed.approvals = record.story_approvals.map((a: Record<string, unknown>) => ({
      id: a.id,
      storyId: a.story_id,
      approvalStage: a.approval_stage,
      approvalOrder: a.approval_order,
      reviewerType: a.reviewer_type,
      reviewerId: a.reviewer_id,
      reviewerEmail: a.reviewer_email,
      reviewerName: a.reviewer_name,
      status: a.status,
      feedback: a.feedback,
      requestedChanges: a.requested_changes,
      requestedAt: a.requested_at,
      respondedAt: a.responded_at,
      deadlineAt: a.deadline_at,
      reminderCount: a.reminder_count,
      lastReminderAt: a.last_reminder_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  }

  if (Array.isArray(record.family_thank_you_messages)) {
    transformed.thankYouMessages = record.family_thank_you_messages.map((m: Record<string, unknown>) => ({
      id: m.id,
      caseId: m.case_id,
      storyId: m.story_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRelationship: m.sender_relationship,
      recipientType: m.recipient_type,
      recipientId: m.recipient_id,
      message: m.message,
      messageFr: m.message_fr,
      isPublic: m.is_public,
      displayName: m.display_name,
      anonymizeDetails: m.anonymize_details,
      attachmentUrls: m.attachment_urls,
      approvedAt: m.approved_at,
      approvedBy: m.approved_by,
      deliveredAt: m.delivered_at,
      readAt: m.read_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));
  }

  if (Array.isArray(record.story_media_templates)) {
    transformed.mediaTemplates = record.story_media_templates.map((t: Record<string, unknown>) => ({
      id: t.id,
      storyId: t.story_id,
      templateType: t.template_type,
      templateName: t.template_name,
      content: t.content,
      contentFr: t.content_fr,
      headline: t.headline,
      subheadline: t.subheadline,
      callToAction: t.call_to_action,
      hashtags: t.hashtags,
      shortVersion: t.short_version,
      mediumVersion: t.medium_version,
      longVersion: t.long_version,
      primaryImageUrl: t.primary_image_url,
      thumbnailUrl: t.thumbnail_url,
      mediaKitUrl: t.media_kit_url,
      isApproved: t.is_approved,
      approvedAt: t.approved_at,
      approvedBy: t.approved_by,
      downloadCount: t.download_count,
      lastDownloadedAt: t.last_downloaded_at,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  }

  return transformed;
}

// Helper to detect device type from user agent
function detectDeviceType(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    return 'mobile';
  }
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}
