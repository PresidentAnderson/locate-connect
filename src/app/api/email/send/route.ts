import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiCreated,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiServerError,
} from '@/lib/api/response';
import {
  generateTrackingPixelUrl,
  generateTrackingPixelHtml,
} from '@/lib/services/email-tracking-service';
import type { CreateEmailTrackingInput, EmailTrackingResponse } from '@/types/email-tracking.types';

/**
 * POST /api/email/send
 * Creates an email tracking record and returns tracking pixel URL/HTML.
 * Requires: case owner or LE role.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    // Parse request body
    const body: CreateEmailTrackingInput = await request.json();

    // Validate required fields
    if (!body.case_id) {
      return apiBadRequest('case_id is required', 'missing_case_id');
    }

    if (!body.recipient_email) {
      return apiBadRequest('recipient_email is required', 'missing_recipient_email');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.recipient_email)) {
      return apiBadRequest('Invalid email format', 'invalid_email');
    }

    // Get user profile for role check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_verified')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return apiServerError('Failed to fetch user profile');
    }

    const isLE =
      ['law_enforcement', 'admin', 'developer'].includes(profile.role) &&
      profile.is_verified;

    // Verify case exists and user has access
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, reporter_id')
      .eq('id', body.case_id)
      .single();

    if (caseError || !caseData) {
      return apiBadRequest('Case not found', 'case_not_found');
    }

    // Check authorization: must be case owner or LE
    const isCaseOwner = caseData.reporter_id === user.id;
    if (!isCaseOwner && !isLE) {
      return apiForbidden('You do not have permission to track emails for this case');
    }

    // Create email tracking record
    const { data: trackingRecord, error: createError } = await supabase
      .from('email_tracking')
      .insert({
        case_id: body.case_id,
        recipient_email: body.recipient_email,
        subject: body.subject || null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !trackingRecord) {
      console.error('Failed to create email tracking record:', createError);
      return apiServerError('Failed to create email tracking record');
    }

    // Build response with tracking URLs
    const response: EmailTrackingResponse = {
      ...trackingRecord,
      tracking_pixel_url: generateTrackingPixelUrl(trackingRecord.tracking_pixel_id),
      tracking_pixel_html: generateTrackingPixelHtml(trackingRecord.tracking_pixel_id),
    };

    return apiCreated(response);
  } catch (error) {
    console.error('Email send API error:', error);
    return apiServerError('Internal server error');
  }
}
