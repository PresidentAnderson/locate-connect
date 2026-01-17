/**
 * Consent Records API Routes (LC-FEAT-030)
 * Handles GDPR/PIPEDA compliant consent management for facial recognition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapConsentRecordFromDb,
  ConsentRecord,
  ConsentType,
  ConsentStatus,
  AllowedUses,
} from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/consent
 * Retrieve consent records
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

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const subjectId = searchParams.get('subjectId');
  const consentType = searchParams.get('consentType') as ConsentType | null;
  const status = searchParams.get('status') as ConsentStatus | null;
  const activeOnly = searchParams.get('activeOnly') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query - users can only see their own consent, LE can see case-related
  let query = supabase
    .from('consent_records')
    .select('*', { count: 'exact' });

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'developer';
  const isLE = profile?.role === 'law_enforcement';

  if (!isAdmin && !isLE) {
    // Regular users can only see their own consent records
    query = query.eq('subject_id', user.id);
  } else if (caseId) {
    query = query.eq('subject_case_id', caseId);
  }

  if (subjectId && (isAdmin || isLE)) {
    query = query.eq('subject_id', subjectId);
  }

  if (consentType) {
    query = query.eq('consent_type', consentType);
  }

  if (status) {
    query = query.eq('consent_status', status);
  }

  if (activeOnly) {
    query = query.eq('consent_status', 'granted');
    // Also check expiration
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching consent records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = (data || []).map((row) => mapConsentRecordFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: records,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/facial-recognition/consent
 * Create a new consent record
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

  try {
    const body = await request.json();

    const {
      subjectCaseId,
      consentType,
      consentVersion,
      scopeDescription,
      allowedUses,
      consentMethod,
      electronicSignature,
      privacyPolicyVersion,
      complianceFramework,
      subjectName,
      subjectEmail,
      subjectRelationship,
      witnessName,
      witnessEmail,
    } = body as {
      subjectCaseId?: string;
      consentType: ConsentType;
      consentVersion: string;
      scopeDescription?: string;
      allowedUses: AllowedUses;
      consentMethod: ConsentRecord['consentMethod'];
      electronicSignature?: string;
      privacyPolicyVersion: string;
      complianceFramework?: ConsentRecord['complianceFramework'];
      subjectName?: string;
      subjectEmail?: string;
      subjectRelationship?: ConsentRecord['subjectRelationship'];
      witnessName?: string;
      witnessEmail?: string;
    };

    // Validate required fields
    if (!consentType || !consentVersion || !allowedUses || !consentMethod || !privacyPolicyVersion) {
      return NextResponse.json(
        { error: 'Missing required consent fields' },
        { status: 400 }
      );
    }

    // Validate electronic signature for electronic consent
    if (consentMethod === 'electronic' && !electronicSignature) {
      return NextResponse.json(
        { error: 'Electronic signature required for electronic consent' },
        { status: 400 }
      );
    }

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    // Determine data processing basis based on framework
    const dataProcessingBasis = determineDataProcessingBasis(
      complianceFramework,
      consentType,
      subjectRelationship
    );

    // Calculate expiration (default 2 years for PIPEDA, varies by framework)
    const expiresAt = calculateConsentExpiration(complianceFramework);

    // Create consent record
    const consentRecord = {
      subject_id: user.id,
      subject_case_id: subjectCaseId,
      subject_name: subjectName,
      subject_email: subjectEmail,
      subject_relationship: subjectRelationship || 'self',
      consent_type: consentType,
      consent_status: 'granted' as ConsentStatus,
      consent_version: consentVersion,
      scope_description: scopeDescription,
      allowed_uses: allowedUses,
      consent_method: consentMethod,
      electronic_signature: electronicSignature,
      witness_name: witnessName,
      witness_email: witnessEmail,
      privacy_policy_version: privacyPolicyVersion,
      privacy_policy_accepted_at: new Date().toISOString(),
      granted_at: new Date().toISOString(),
      expires_at: expiresAt,
      compliance_framework: complianceFramework,
      data_processing_basis: dataProcessingBasis,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const { data: consent, error: dbError } = await supabase
      .from('consent_records')
      .insert(consentRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating consent record:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Log consent for audit
    await logConsentAudit(supabase, consent.id, user.id, 'consent_granted', ipAddress);

    return NextResponse.json({
      data: mapConsentRecordFromDb(consent as Record<string, unknown>),
    }, { status: 201 });

  } catch (error) {
    console.error('Consent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/facial-recognition/consent
 * Update consent (primarily for withdrawal)
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      consentId,
      action,
      withdrawalReason,
      identityVerified,
      identityVerificationMethod,
    } = body as {
      consentId: string;
      action: 'withdraw' | 'verify_identity';
      withdrawalReason?: string;
      identityVerified?: boolean;
      identityVerificationMethod?: string;
    };

    if (!consentId || !action) {
      return NextResponse.json(
        { error: 'consentId and action are required' },
        { status: 400 }
      );
    }

    // Verify consent exists and belongs to user (or admin is making the change)
    const { data: existingConsent, error: fetchError } = await supabase
      .from('consent_records')
      .select('id, subject_id, consent_status')
      .eq('id', consentId)
      .single();

    if (fetchError || !existingConsent) {
      return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
    }

    // Check authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'developer';

    if (existingConsent.subject_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip');

    let updates: Record<string, unknown> = {};

    if (action === 'withdraw') {
      if (existingConsent.consent_status === 'withdrawn') {
        return NextResponse.json(
          { error: 'Consent already withdrawn' },
          { status: 400 }
        );
      }

      updates = {
        consent_status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        withdrawal_reason: withdrawalReason,
      };

      // Log withdrawal
      await logConsentAudit(supabase, consentId, user.id, 'consent_withdrawn', ipAddress);

    } else if (action === 'verify_identity') {
      if (!identityVerified) {
        return NextResponse.json(
          { error: 'identityVerified flag required' },
          { status: 400 }
        );
      }

      updates = {
        identity_verified: true,
        identity_verification_method: identityVerificationMethod,
        identity_verified_at: new Date().toISOString(),
        identity_verified_by: user.id,
      };
    }

    const { data: updatedConsent, error: updateError } = await supabase
      .from('consent_records')
      .update(updates)
      .eq('id', consentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating consent:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapConsentRecordFromDb(updatedConsent as Record<string, unknown>),
    });

  } catch (error) {
    console.error('Consent update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Determine the legal basis for data processing based on framework and consent type
 */
function determineDataProcessingBasis(
  framework?: ConsentRecord['complianceFramework'],
  consentType?: ConsentType,
  relationship?: ConsentRecord['subjectRelationship']
): string {
  // PIPEDA principles
  if (framework === 'PIPEDA') {
    if (consentType === 'facial_recognition') {
      return 'Explicit consent for sensitive biometric data processing (PIPEDA Principle 3)';
    }
    return 'Consent-based processing (PIPEDA Principle 3)';
  }

  // GDPR bases
  if (framework === 'GDPR') {
    if (consentType === 'facial_recognition') {
      return 'Explicit consent for special category data (GDPR Art. 9(2)(a))';
    }
    return 'Consent (GDPR Art. 6(1)(a))';
  }

  // Default
  if (relationship === 'parent' || relationship === 'guardian') {
    return 'Parental/guardian consent for minor';
  }

  return 'Subject consent';
}

/**
 * Calculate consent expiration based on compliance framework
 */
function calculateConsentExpiration(
  framework?: ConsentRecord['complianceFramework']
): string {
  const now = new Date();
  let yearsToAdd = 2; // Default 2 years

  switch (framework) {
    case 'GDPR':
      yearsToAdd = 1; // GDPR recommends shorter periods
      break;
    case 'PIPEDA':
      yearsToAdd = 2;
      break;
    case 'CCPA':
      yearsToAdd = 1;
      break;
    default:
      yearsToAdd = 2;
  }

  now.setFullYear(now.getFullYear() + yearsToAdd);
  return now.toISOString();
}

/**
 * Log consent-related actions for audit trail
 */
async function logConsentAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consentId: string,
  userId: string,
  action: string,
  ipAddress?: string | null
): Promise<void> {
  try {
    await supabase.from('facial_recognition_audit_logs').insert({
      action,
      action_category: 'consent',
      user_id: userId,
      resource_type: 'consent_records',
      resource_id: consentId,
      compliance_relevant: true,
      compliance_frameworks: ['PIPEDA', 'GDPR'],
      personal_data_accessed: true,
      biometric_data_accessed: action.includes('facial'),
      ip_address: ipAddress,
    });
  } catch (error) {
    console.error('Error logging consent audit:', error);
  }
}
