/**
 * Individual Consent Record API Routes (LC-FEAT-022)
 * PUT /api/success-stories/[id]/consent/[consentId] - Update consent (grant, verify, withdraw)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateConsentInput } from '@/types/success-story.types';

interface RouteParams {
  params: Promise<{ id: string; consentId: string }>;
}

/**
 * PUT /api/success-stories/[id]/consent/[consentId]
 * Update a consent record (grant, verify, or withdraw)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id, consentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch existing consent
  const { data: consent, error: fetchError } = await supabase
    .from('story_consent')
    .select('*, success_stories(created_by, cases(reporter_id))')
    .eq('id', consentId)
    .eq('story_id', id)
    .single();

  if (fetchError || !consent) {
    return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
  }

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isStaff = profile?.role === 'admin' || profile?.role === 'law_enforcement';
  const isConsenter = consent.consenter_id === user.id;
  const isCreator = consent.success_stories?.created_by === user.id;
  const isCaseOwner = consent.success_stories?.cases?.reporter_id === user.id;

  // Consenters can only update their own consent
  // Staff/creators/case owners can verify and process withdrawals
  if (!isStaff && !isConsenter && !isCreator && !isCaseOwner) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body: UpdateConsentInput & { verificationCode?: string } = await request.json();

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Handle verification via code
  if (body.verificationCode) {
    if (consent.verification_code !== body.verificationCode) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    updateData.is_granted = true;
    updateData.granted_at = new Date().toISOString();
    updateData.verified_at = new Date().toISOString();
    updateData.verified_by = user.id;
  }

  // Handle direct grant (for staff or digital signature)
  if (body.isGranted !== undefined && (isStaff || isConsenter)) {
    updateData.is_granted = body.isGranted;
    if (body.isGranted) {
      updateData.granted_at = new Date().toISOString();
    }
  }

  // Handle staff verification
  if (body.verifiedAt && isStaff) {
    updateData.verified_at = body.verifiedAt;
    updateData.verified_by = user.id;
  }

  // Handle withdrawal
  if (body.withdrawnAt) {
    // Only the consenter or staff can withdraw
    if (!isStaff && !isConsenter) {
      return NextResponse.json(
        { error: 'Only the consenter or staff can withdraw consent' },
        { status: 403 }
      );
    }

    updateData.withdrawn_at = body.withdrawnAt;
    updateData.withdrawal_reason = body.withdrawalReason;
    updateData.withdrawal_processed_by = user.id;
    updateData.is_granted = false;

    // If consent is withdrawn, we may need to unpublish the story
    const { data: story } = await supabase
      .from('success_stories')
      .select('status')
      .eq('id', id)
      .single();

    if (story?.status === 'published') {
      // Notify that the story should be reviewed
      await supabase.from('notifications').insert({
        user_id: consent.success_stories?.created_by,
        type: 'consent_withdrawn',
        title: 'Consent Withdrawn',
        content: `A consent for story has been withdrawn. The story may need to be unpublished or modified.`,
        case_id: consent.success_stories?.cases?.id,
      });
    }
  }

  // Update the consent record
  const { data: updatedConsent, error: updateError } = await supabase
    .from('story_consent')
    .update(updateData)
    .eq('id', consentId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating consent:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log the update
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: body.withdrawnAt ? 'consent_withdrawn' : 'consent_updated',
    action_description: `Updated consent record ${consentId} for story ${id}`,
    resource_type: 'story_consent',
    resource_id: consentId,
    is_sensitive_data: true,
    compliance_relevant: true,
    compliance_frameworks: ['pipeda'],
    old_values: {
      is_granted: consent.is_granted,
      granted_at: consent.granted_at,
      withdrawn_at: consent.withdrawn_at,
    },
    new_values: updateData,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return NextResponse.json(transformConsentFromDB(updatedConsent));
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
