/**
 * Story Consent API Routes (LC-FEAT-022)
 * GET /api/success-stories/[id]/consent - List consents for a story
 * POST /api/success-stories/[id]/consent - Add consent record
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateConsentInput } from '@/types/success-story.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/success-stories/[id]/consent
 * Get all consent records for a story
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify story exists and user has access
  const { data: story, error: storyError } = await supabase
    .from('success_stories')
    .select('id, created_by, cases(reporter_id)')
    .eq('id', id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCreator = story.created_by === user.id;
  const caseData = story.cases as unknown as { reporter_id: string } | null;
  const isCaseOwner = caseData?.reporter_id === user.id;

  if (!isStaff && !isCreator && !isCaseOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch consents
  const { data: consents, error } = await supabase
    .from('story_consent')
    .select('*')
    .eq('story_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching consents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate workflow state
  const requiredConsents = ['story_publication', 'name_use', 'photo_use'];
  const grantedConsents = consents
    ?.filter(c => c.is_granted && !c.withdrawn_at)
    .map(c => c.consent_type) || [];
  const pendingConsents = requiredConsents.filter(c => !grantedConsents.includes(c));
  const withdrawnConsents = consents
    ?.filter(c => c.withdrawn_at)
    .map(c => c.consent_type) || [];

  const canPublish = pendingConsents.length === 0 && withdrawnConsents.length === 0;

  const blockedReasons: string[] = [];
  if (pendingConsents.length > 0) {
    blockedReasons.push(`Missing consents: ${pendingConsents.join(', ')}`);
  }
  if (withdrawnConsents.length > 0) {
    blockedReasons.push(`Withdrawn consents: ${withdrawnConsents.join(', ')}`);
  }

  return NextResponse.json({
    consents: consents?.map(transformConsentFromDB) || [],
    workflowState: {
      storyId: id,
      requiredConsents,
      grantedConsents,
      pendingConsents,
      withdrawnConsents,
      canPublish,
      blockedReasons,
    },
  });
}

/**
 * POST /api/success-stories/[id]/consent
 * Create a new consent record
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify story exists
  const { data: story, error: storyError } = await supabase
    .from('success_stories')
    .select('id, created_by, cases(reporter_id)')
    .eq('id', id)
    .single();

  if (storyError || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isCreator = story.created_by === user.id;
  const postCaseData = story.cases as unknown as { reporter_id: string } | null;
  const isCaseOwner = postCaseData?.reporter_id === user.id;

  if (!isStaff && !isCreator && !isCaseOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body: CreateConsentInput = await request.json();

  // Validate required fields
  if (!body.consenterName || !body.consenterRelationship || !body.consentType || !body.consentMethod) {
    return NextResponse.json(
      { error: 'Missing required fields: consenterName, consenterRelationship, consentType, consentMethod' },
      { status: 400 }
    );
  }

  // Generate verification code for email confirmation
  const verificationCode = body.consentMethod === 'email_confirmation'
    ? Math.random().toString(36).substring(2, 10).toUpperCase()
    : null;

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const consentData = {
    story_id: id,
    consenter_id: body.consentMethod === 'digital_signature' ? user.id : null,
    consenter_name: body.consenterName,
    consenter_email: body.consenterEmail,
    consenter_phone: body.consenterPhone,
    consenter_relationship: body.consenterRelationship,
    consent_type: body.consentType,
    consent_scope: body.consentScope || {},
    consent_method: body.consentMethod,
    consent_document_url: body.consentDocumentUrl,
    verification_code: verificationCode,
    ip_address: ipAddress,
    user_agent: userAgent,
    consent_version: '1.0',
    is_granted: body.consentMethod === 'digital_signature', // Auto-grant for digital signature
    granted_at: body.consentMethod === 'digital_signature' ? new Date().toISOString() : null,
  };

  const { data: consent, error: createError } = await supabase
    .from('story_consent')
    .insert(consentData)
    .select()
    .single();

  if (createError) {
    console.error('Error creating consent:', createError);
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // Log the consent creation
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: 'create',
    action_description: `Created consent record for story ${id}`,
    resource_type: 'story_consent',
    resource_id: consent.id,
    is_sensitive_data: true,
    compliance_relevant: true,
    compliance_frameworks: ['pipeda'],
    new_values: { ...consentData, verification_code: '[REDACTED]' },
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  // If email confirmation, send verification email (placeholder for now)
  if (body.consentMethod === 'email_confirmation' && body.consenterEmail) {
    // TODO: Implement email sending
    console.log(`Would send verification email to ${body.consenterEmail} with code ${verificationCode}`);
  }

  return NextResponse.json(transformConsentFromDB(consent), { status: 201 });
}

// Helper function to transform consent from DB
function transformConsentFromDB(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    storyId: record.story_id,
    consenterId: record.consenter_id,
    consenterName: record.consenter_name,
    consenterEmail: record.consenter_email,
    consenterPhone: record.consenter_phone,
    consenterRelationship: record.consenter_relationship,
    consentType: record.consent_type,
    consentScope: record.consent_scope,
    isGranted: record.is_granted,
    grantedAt: record.granted_at,
    expiresAt: record.expires_at,
    consentMethod: record.consent_method,
    consentDocumentUrl: record.consent_document_url,
    verifiedAt: record.verified_at,
    verifiedBy: record.verified_by,
    withdrawnAt: record.withdrawn_at,
    withdrawalReason: record.withdrawal_reason,
    withdrawalProcessedBy: record.withdrawal_processed_by,
    consentVersion: record.consent_version,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}
