import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticateRequest, hasScope, meetsAccessLevel } from '@/lib/api/auth';
import { checkRateLimit, updateRateLimitCounters } from '@/lib/api/rate-limiter';
import { apiSuccess, apiUnauthorized, apiForbidden, apiNotFound, apiRateLimited, apiServerError, withRateLimitHeaders, withCorsHeaders } from '@/lib/api/response';
import type { PublicCase, PublicCaseDetail } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/cases/[id]
 * Public API endpoint to get a single case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.isAuthenticated) {
      return withCorsHeaders(apiUnauthorized(auth.error, auth.errorCode));
    }

    // Check required scope
    if (!hasScope(auth, 'cases:read')) {
      return withCorsHeaders(apiForbidden('Insufficient permissions. Required scope: cases:read', 'insufficient_scope'));
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(auth.applicationId!);
    if (!rateLimit.allowed) {
      return withCorsHeaders(withRateLimitHeaders(
        apiRateLimited(rateLimit.info.retry_after_seconds),
        rateLimit.headers
      ));
    }

    const supabase = await createClient();

    // Determine what fields to select based on access level
    const isDetailedAccess = hasScope(auth, 'cases:read:detailed') || meetsAccessLevel(auth, 'partner');

    // Build select query
    let selectFields = `
      id, case_number, first_name, last_name, age_at_disappearance, gender,
      last_seen_date, last_seen_city, last_seen_province, status, priority_level,
      is_amber_alert, primary_photo_url, created_at, updated_at, is_public
    `;

    if (isDetailedAccess) {
      selectFields += `, height_cm, weight_kg, eye_color, hair_color, distinguishing_features,
        clothing_last_seen, circumstances, jurisdictions (name)`;
    }

    // Fetch the case
    let query = supabase
      .from('cases')
      .select(selectFields)
      .eq('id', id);

    // Non-LE users can only see public active cases
    if (!meetsAccessLevel(auth, 'law_enforcement')) {
      query = query.eq('is_public', true).eq('status', 'active');
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return withCorsHeaders(apiNotFound('Case not found'));
      }
      console.error('Case API error:', error);
      return withCorsHeaders(apiServerError('Failed to fetch case'));
    }

    // Update rate limit counters
    await updateRateLimitCounters(auth.applicationId!);

    // Cast data to expected shape (Supabase types are dynamic based on select)
    const caseRecord = data as unknown as Record<string, unknown>;

    // Build response based on access level
    let caseData: PublicCase | PublicCaseDetail;

    if (isDetailedAccess) {
      const jurisdiction = caseRecord.jurisdictions as { name: string } | undefined;
      caseData = {
        id: caseRecord.id as string,
        case_number: caseRecord.case_number as string,
        first_name: caseRecord.first_name as string,
        last_name: caseRecord.last_name as string,
        age_at_disappearance: caseRecord.age_at_disappearance as number | undefined,
        gender: caseRecord.gender as string | undefined,
        last_seen_date: caseRecord.last_seen_date as string,
        last_seen_city: caseRecord.last_seen_city as string | undefined,
        last_seen_province: caseRecord.last_seen_province as string | undefined,
        status: caseRecord.status as string,
        priority_level: caseRecord.priority_level as string,
        is_amber_alert: caseRecord.is_amber_alert as boolean,
        primary_photo_url: caseRecord.primary_photo_url as string | undefined,
        created_at: caseRecord.created_at as string,
        updated_at: caseRecord.updated_at as string,
        height_cm: caseRecord.height_cm as number | undefined,
        weight_kg: caseRecord.weight_kg as number | undefined,
        eye_color: caseRecord.eye_color as string | undefined,
        hair_color: caseRecord.hair_color as string | undefined,
        distinguishing_features: caseRecord.distinguishing_features as string | undefined,
        clothing_last_seen: caseRecord.clothing_last_seen as string | undefined,
        circumstances: caseRecord.circumstances as string | undefined,
        jurisdiction_name: jurisdiction?.name,
      };
    } else {
      caseData = {
        id: caseRecord.id as string,
        case_number: caseRecord.case_number as string,
        first_name: caseRecord.first_name as string,
        last_name: caseRecord.last_name as string,
        age_at_disappearance: caseRecord.age_at_disappearance as number | undefined,
        gender: caseRecord.gender as string | undefined,
        last_seen_date: caseRecord.last_seen_date as string,
        last_seen_city: caseRecord.last_seen_city as string | undefined,
        last_seen_province: caseRecord.last_seen_province as string | undefined,
        status: caseRecord.status as string,
        priority_level: caseRecord.priority_level as string,
        is_amber_alert: caseRecord.is_amber_alert as boolean,
        primary_photo_url: caseRecord.primary_photo_url as string | undefined,
        created_at: caseRecord.created_at as string,
        updated_at: caseRecord.updated_at as string,
      };
    }

    const response = apiSuccess(caseData, undefined, rateLimit.headers);
    return withCorsHeaders(response);
  } catch (error) {
    console.error('Case API error:', error);
    return withCorsHeaders(apiServerError('Internal server error'));
  }
}

/**
 * OPTIONS /api/v1/cases/[id]
 * CORS preflight
 */
export async function OPTIONS() {
  return withCorsHeaders(new NextResponse(null, { status: 204 }));
}
