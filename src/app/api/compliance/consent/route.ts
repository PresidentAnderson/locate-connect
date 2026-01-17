/**
 * Consent Records API Routes (LC-FEAT-037)
 * Manage user consent for data processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ConsentType = 'data_processing' | 'marketing' | 'analytics' | 'third_party_sharing';

interface UpdateConsentInput {
  consentType: ConsentType;
  isGranted: boolean;
  consentSource?: string;
  withdrawalReason?: string;
}

/**
 * GET /api/compliance/consent
 * Get current user's consent records
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const consentType = searchParams.get('consentType') as ConsentType | null;
  const grantedOnly = searchParams.get('grantedOnly') === 'true';

  let query = supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', user.id);

  if (consentType) {
    query = query.eq('consent_type', consentType);
  }

  if (grantedOnly) {
    query = query.eq('is_granted', true);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching consent records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by consent type to get latest status for each
  const latestConsents: Record<string, unknown> = {};
  for (const record of data || []) {
    const type = record.consent_type as string;
    if (!latestConsents[type]) {
      latestConsents[type] = record;
    }
  }

  return NextResponse.json({
    data: data || [],
    currentStatus: latestConsents,
  });
}

/**
 * POST /api/compliance/consent
 * Record a consent decision
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

  const body: UpdateConsentInput = await request.json();

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Get current consent version (in production, this would come from a config)
  const consentVersion = '1.0';
  const privacyPolicyVersion = '2024-01';

  const consentData = {
    user_id: user.id,
    consent_type: body.consentType,
    consent_version: consentVersion,
    is_granted: body.isGranted,
    granted_at: body.isGranted ? new Date().toISOString() : null,
    withdrawn_at: !body.isGranted ? new Date().toISOString() : null,
    ip_address: ipAddress,
    user_agent: userAgent,
    consent_source: body.consentSource || 'settings',
    privacy_policy_version: privacyPolicyVersion,
    withdrawal_reason: body.withdrawalReason,
  };

  const { data, error } = await supabase
    .from('consent_records')
    .insert(consentData)
    .select()
    .single();

  if (error) {
    console.error('Error recording consent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit event
  await supabase.from('comprehensive_audit_logs').insert({
    user_id: user.id,
    action: body.isGranted ? 'consent_given' : 'consent_withdrawn',
    action_description: `Consent ${body.isGranted ? 'given' : 'withdrawn'} for ${body.consentType}`,
    resource_type: 'consent_records',
    resource_id: data.id,
    is_sensitive_data: true,
    compliance_relevant: true,
    compliance_frameworks: ['pipeda', 'gdpr'],
    new_values: consentData,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return NextResponse.json(data, { status: 201 });
}

/**
 * PUT /api/compliance/consent/bulk
 * Update multiple consent types at once
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: {
    consents: { consentType: ConsentType; isGranted: boolean }[];
    consentSource?: string;
  } = await request.json();

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  const consentVersion = '1.0';
  const privacyPolicyVersion = '2024-01';

  const consentRecords = body.consents.map((consent) => ({
    user_id: user.id,
    consent_type: consent.consentType,
    consent_version: consentVersion,
    is_granted: consent.isGranted,
    granted_at: consent.isGranted ? new Date().toISOString() : null,
    withdrawn_at: !consent.isGranted ? new Date().toISOString() : null,
    ip_address: ipAddress,
    user_agent: userAgent,
    consent_source: body.consentSource || 'settings',
    privacy_policy_version: privacyPolicyVersion,
  }));

  const { data, error } = await supabase
    .from('consent_records')
    .insert(consentRecords)
    .select();

  if (error) {
    console.error('Error recording bulk consent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log audit events
  for (const consent of body.consents) {
    await supabase.from('comprehensive_audit_logs').insert({
      user_id: user.id,
      action: consent.isGranted ? 'consent_given' : 'consent_withdrawn',
      action_description: `Consent ${consent.isGranted ? 'given' : 'withdrawn'} for ${consent.consentType}`,
      resource_type: 'consent_records',
      is_sensitive_data: true,
      compliance_relevant: true,
      compliance_frameworks: ['pipeda', 'gdpr'],
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  return NextResponse.json(data);
}
