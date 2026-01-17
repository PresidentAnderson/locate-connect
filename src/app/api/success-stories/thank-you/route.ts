/**
 * Family Thank You Messages API (LC-FEAT-022)
 * GET /api/success-stories/thank-you - List thank you messages
 * POST /api/success-stories/thank-you - Create thank you message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateThankYouMessageInput } from '@/types/success-story.types';

/**
 * GET /api/success-stories/thank-you
 * List thank you messages
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const storyId = searchParams.get('storyId');
  const recipientId = searchParams.get('recipientId');
  const publicOnly = searchParams.get('publicOnly') === 'true';

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 50);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from('family_thank_you_messages')
    .select('*', { count: 'exact' });

  // Public queries only see approved public messages
  if (!user || publicOnly) {
    query = query
      .eq('is_public', true)
      .not('approved_at', 'is', null);
  } else {
    // Authenticated users see their own messages + public messages
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';

    if (!isStaff) {
      // Regular users see their own sent/received messages and public ones
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},and(is_public.eq.true,approved_at.not.is.null)`);
    }
    // Staff can see all messages
  }

  // Apply filters
  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (storyId) {
    query = query.eq('story_id', storyId);
  }

  if (recipientId) {
    query = query.eq('recipient_id', recipientId);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: messages, error, count } = await query;

  if (error) {
    console.error('Error fetching thank you messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to camelCase
  const transformedMessages = (messages || []).map(transformMessageFromDB);

  return NextResponse.json({
    messages: transformedMessages,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  });
}

/**
 * POST /api/success-stories/thank-you
 * Create a new thank you message
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

  const body: CreateThankYouMessageInput = await request.json();

  // Validate required fields
  if (!body.caseId || !body.senderName || !body.senderRelationship || !body.recipientType || !body.message) {
    return NextResponse.json(
      { error: 'Missing required fields: caseId, senderName, senderRelationship, recipientType, message' },
      { status: 400 }
    );
  }

  // Verify the case exists
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, reporter_id, status')
    .eq('id', body.caseId)
    .single();

  if (caseError || !caseData) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Check if user can send thank you for this case
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCaseOwner = caseData.reporter_id === user.id;

  if (!isStaff && !isCaseOwner) {
    return NextResponse.json(
      { error: 'You do not have permission to send a thank you message for this case' },
      { status: 403 }
    );
  }

  const messageData = {
    case_id: body.caseId,
    story_id: body.storyId,
    sender_id: user.id,
    sender_name: body.senderName,
    sender_relationship: body.senderRelationship,
    recipient_type: body.recipientType,
    recipient_id: body.recipientId,
    recipient_organization_id: body.recipientOrganizationId,
    message: body.message,
    message_fr: body.messageFr,
    is_public: body.isPublic || false,
    display_name: body.displayName || body.senderName,
    anonymize_details: body.anonymizeDetails !== false, // Default to true
    attachment_urls: body.attachmentUrls || [],
  };

  const { data: message, error: createError } = await supabase
    .from('family_thank_you_messages')
    .insert(messageData)
    .select()
    .single();

  if (createError) {
    console.error('Error creating thank you message:', createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Send notification to recipient if specified
  if (body.recipientId) {
    await supabase.from('notifications').insert({
      user_id: body.recipientId,
      type: 'thank_you_received',
      title: 'You received a thank you message',
      content: `A family has sent you a thank you message for your help with a case.`,
      case_id: body.caseId,
    });

    // Mark as delivered
    await supabase
      .from('family_thank_you_messages')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', message.id);
  }

  // If public, notify admins for approval
  if (body.isPublic) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    for (const admin of admins || []) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        type: 'thank_you_approval_needed',
        title: 'Thank you message needs approval',
        content: `A family thank you message has been submitted for public display.`,
        case_id: body.caseId,
      });
    }
  }

  // Log the creation
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'create',
    action_description: `Created thank you message for case ${body.caseId}`,
    resource_type: 'family_thank_you_messages',
    resource_id: message.id,
    new_values: messageData,
  });

  return NextResponse.json(transformMessageFromDB(message), { status: 201 });
}

// Helper function to transform message from DB
function transformMessageFromDB(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    caseId: record.case_id,
    storyId: record.story_id,
    senderId: record.sender_id,
    senderName: record.sender_name,
    senderRelationship: record.sender_relationship,
    recipientType: record.recipient_type,
    recipientId: record.recipient_id,
    recipientOrganizationId: record.recipient_organization_id,
    message: record.message,
    messageFr: record.message_fr,
    isPublic: record.is_public,
    displayName: record.display_name,
    anonymizeDetails: record.anonymize_details,
    attachmentUrls: record.attachment_urls,
    approvedAt: record.approved_at,
    approvedBy: record.approved_by,
    deliveredAt: record.delivered_at,
    readAt: record.read_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
