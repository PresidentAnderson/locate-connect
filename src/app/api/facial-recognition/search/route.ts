/**
 * Facial Recognition Search API Routes (LC-FEAT-030)
 * Handles facial recognition search requests and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapFacialRecognitionRequestFromDb,
  FacialRecognitionRequest,
  SearchScope,
} from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/search
 * Retrieve facial recognition search requests
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has appropriate role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const status = searchParams.get('status');
  const requestedBy = searchParams.get('requestedBy');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('facial_recognition_requests')
    .select('*', { count: 'exact' });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (requestedBy) {
    query = query.eq('requested_by', requestedBy);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching FR requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data || []).map((row) =>
    mapFacialRecognitionRequestFromDb(row as Record<string, unknown>)
  );

  return NextResponse.json({
    data: requests,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/facial-recognition/search
 * Create a new facial recognition search request
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has appropriate role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  if (!profile.is_verified) {
    return NextResponse.json({ error: 'Forbidden: Account not verified' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const {
      caseId,
      photoSubmissionId,
      searchScope,
      confidenceThreshold = 70,
      maxResults = 10,
      priority = 'normal',
    } = body as {
      caseId: string;
      photoSubmissionId: string;
      searchScope?: SearchScope;
      confidenceThreshold?: number;
      maxResults?: number;
      priority?: FacialRecognitionRequest['priority'];
    };

    // Validate required fields
    if (!caseId || !photoSubmissionId) {
      return NextResponse.json(
        { error: 'caseId and photoSubmissionId are required' },
        { status: 400 }
      );
    }

    // Verify photo exists and is processed
    const { data: photo, error: photoError } = await supabase
      .from('photo_submissions')
      .select('id, case_id, is_processed, has_face_detected, consent_record_id, is_consent_verified')
      .eq('id', photoSubmissionId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo submission not found' }, { status: 404 });
    }

    // For law enforcement, check consent
    if (!photo.is_consent_verified && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Consent verification required for this photo' },
        { status: 403 }
      );
    }

    // Check if photo has detectable face
    if (!photo.has_face_detected) {
      return NextResponse.json(
        { error: 'No face detected in the photo. Please upload a clearer image.' },
        { status: 400 }
      );
    }

    // Run compliance check
    const complianceResult = await runComplianceCheck(supabase, caseId, photoSubmissionId);

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    // Create search request
    const requestRecord = {
      case_id: caseId,
      photo_submission_id: photoSubmissionId,
      requested_by: user.id,
      request_type: 'match_search',
      priority,
      search_scope: searchScope,
      confidence_threshold: Math.max(50, Math.min(100, confidenceThreshold)),
      max_results: Math.max(1, Math.min(50, maxResults)),
      status: 'pending',
      compliance_check_passed: complianceResult.passed,
      compliance_notes: complianceResult.notes,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    const { data: frRequest, error: dbError } = await supabase
      .from('facial_recognition_requests')
      .insert(requestRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating FR request:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Queue for processing (would trigger background job)
    // await queueFacialRecognitionProcessing(frRequest.id);

    // Estimate processing time based on priority
    const estimatedTime = estimateProcessingTime(priority, searchScope);

    return NextResponse.json({
      data: mapFacialRecognitionRequestFromDb(frRequest as Record<string, unknown>),
      estimatedProcessingTime: estimatedTime,
      queuePosition: await getQueuePosition(supabase, priority),
    }, { status: 201 });

  } catch (error) {
    console.error('FR search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Run compliance checks before initiating search
 */
async function runComplianceCheck(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  photoSubmissionId: string
): Promise<{ passed: boolean; notes: string }> {
  const checks: string[] = [];
  let passed = true;

  // Check case exists and is active
  const { data: caseData } = await supabase
    .from('cases')
    .select('status, is_public')
    .eq('id', caseId)
    .single();

  if (!caseData) {
    return { passed: false, notes: 'Case not found' };
  }

  if (caseData.status === 'resolved' || caseData.status === 'closed') {
    checks.push('Warning: Case is resolved/closed');
  }

  // Check photo consent
  const { data: photo } = await supabase
    .from('photo_submissions')
    .select('consent_record_id, is_consent_verified')
    .eq('id', photoSubmissionId)
    .single();

  if (photo?.consent_record_id) {
    const { data: consent } = await supabase
      .from('consent_records')
      .select('consent_status, consent_type, allowed_uses')
      .eq('id', photo.consent_record_id)
      .single();

    if (consent?.consent_status !== 'granted') {
      passed = false;
      checks.push('Consent not granted');
    } else if (consent?.allowed_uses && !(consent.allowed_uses as Record<string, boolean>).facialRecognition) {
      passed = false;
      checks.push('Facial recognition not authorized in consent');
    } else {
      checks.push('Valid consent verified');
    }
  } else {
    checks.push('No consent record attached - using legitimate interest basis');
  }

  return {
    passed,
    notes: checks.join('; '),
  };
}

/**
 * Estimate processing time based on priority and search scope
 */
function estimateProcessingTime(
  priority: FacialRecognitionRequest['priority'],
  searchScope?: SearchScope
): number {
  const baseTime = {
    critical: 30,   // 30 seconds
    high: 120,      // 2 minutes
    normal: 300,    // 5 minutes
    low: 900,       // 15 minutes
  }[priority];

  // Adjust based on search scope
  let multiplier = 1;
  if (searchScope?.databases && searchScope.databases.length > 2) {
    multiplier *= 1.5;
  }
  if (searchScope?.regions && searchScope.regions.length > 5) {
    multiplier *= 1.3;
  }

  return Math.round(baseTime * multiplier);
}

/**
 * Get approximate queue position for the request
 */
async function getQueuePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  priority: FacialRecognitionRequest['priority']
): Promise<number> {
  const { count } = await supabase
    .from('facial_recognition_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('priority', priority);

  return (count || 0) + 1;
}
