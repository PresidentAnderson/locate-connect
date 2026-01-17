import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope } from '@/lib/api/auth';
import { checkRateLimit, updateRateLimitCounters } from '@/lib/api/rate-limiter';
import { apiCreated, apiUnauthorized, apiForbidden, apiBadRequest, apiRateLimited, apiServerError, withRateLimitHeaders, withCorsHeaders } from '@/lib/api/response';

/**
 * POST /api/v1/tips
 * Public API endpoint to submit a tip
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated) {
      return withCorsHeaders(apiUnauthorized(auth.error, auth.errorCode));
    }

    // Check required scope
    if (!hasScope(auth, 'tips:write')) {
      return withCorsHeaders(apiForbidden('Insufficient permissions. Required scope: tips:write', 'insufficient_scope'));
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(auth.applicationId!);
    if (!rateLimit.allowed) {
      return withCorsHeaders(withRateLimitHeaders(
        apiRateLimited(rateLimit.info.retry_after_seconds),
        rateLimit.headers
      ));
    }

    const body = await request.json();

    // Validate required fields
    if (!body.case_id) {
      return withCorsHeaders(apiBadRequest('case_id is required', 'missing_case_id'));
    }

    if (!body.content || body.content.trim().length < 10) {
      return withCorsHeaders(apiBadRequest('Tip content must be at least 10 characters', 'invalid_content'));
    }

    const supabase = await createClient();

    // Verify the case exists and is public/active
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, is_public, status')
      .eq('id', body.case_id)
      .single();

    if (caseError || !caseData) {
      return withCorsHeaders(apiBadRequest('Case not found', 'case_not_found'));
    }

    if (!caseData.is_public || caseData.status !== 'active') {
      return withCorsHeaders(apiBadRequest('Tips can only be submitted for active public cases', 'case_not_available'));
    }

    // Get client IP and user agent
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    // Create the tip
    const { data, error } = await supabase
      .from('tips')
      .insert({
        case_id: body.case_id,
        tipster_name: body.tipster_name?.trim() || null,
        tipster_email: body.tipster_email?.trim() || null,
        tipster_phone: body.tipster_phone?.trim() || null,
        is_anonymous: body.is_anonymous ?? true,
        content: body.content.trim(),
        location: body.location?.trim() || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        sighting_date: body.sighting_date || null,
        status: 'pending',
        ip_address: clientIP,
        user_agent: userAgent,
      })
      .select('id, case_id, is_anonymous, created_at')
      .single();

    if (error) {
      console.error('Tip creation error:', error);
      return withCorsHeaders(apiServerError('Failed to submit tip'));
    }

    // Update rate limit counters
    await updateRateLimitCounters(auth.applicationId!);

    const response = apiCreated({
      id: data.id,
      case_id: data.case_id,
      is_anonymous: data.is_anonymous,
      created_at: data.created_at,
      message: 'Tip submitted successfully. Thank you for your help.',
    }, rateLimit.headers);

    return withCorsHeaders(response);
  } catch (error) {
    console.error('Tips API error:', error);
    return withCorsHeaders(apiServerError('Internal server error'));
  }
}

/**
 * OPTIONS /api/v1/tips
 * CORS preflight
 */
export async function OPTIONS() {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
