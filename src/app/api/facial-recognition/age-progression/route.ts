/**
 * Age Progression API Routes (LC-FEAT-030)
 * Handles age progression requests and generated images
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  mapAgeProgressionRequestFromDb,
  AgeProgressionRequest,
  AgeProgressionVariationParams,
} from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/age-progression
 * Retrieve age progression requests
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
  const status = searchParams.get('status');
  const pendingApproval = searchParams.get('pendingApproval') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('age_progression_requests')
    .select(`
      *,
      source_photo:photo_submissions!age_progression_requests_source_photo_id_fkey(
        id, file_url, quality_grade
      ),
      case:cases!age_progression_requests_case_id_fkey(
        id, case_number, first_name, last_name
      ),
      requester:profiles!age_progression_requests_requested_by_fkey(
        id, first_name, last_name, email
      )
    `, { count: 'exact' });

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (pendingApproval) {
    query = query.eq('requires_approval', true).is('approved', null);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching age progression requests:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data || []).map((row) => ({
    ...mapAgeProgressionRequestFromDb(row as Record<string, unknown>),
    sourcePhoto: row.source_photo,
    case: row.case,
    requester: row.requester,
  }));

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
 * POST /api/facial-recognition/age-progression
 * Create a new age progression request
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

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role) || !profile.is_verified) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const {
      caseId,
      sourcePhotoId,
      sourceAge,
      targetAges,
      includeVariations = false,
      variationParameters,
    } = body as {
      caseId: string;
      sourcePhotoId: string;
      sourceAge: number;
      targetAges: number[];
      includeVariations?: boolean;
      variationParameters?: AgeProgressionVariationParams;
    };

    // Validate required fields
    if (!caseId || !sourcePhotoId || !sourceAge || !targetAges?.length) {
      return NextResponse.json(
        { error: 'caseId, sourcePhotoId, sourceAge, and targetAges are required' },
        { status: 400 }
      );
    }

    // Validate age values
    if (sourceAge < 0 || sourceAge > 120) {
      return NextResponse.json(
        { error: 'Invalid source age' },
        { status: 400 }
      );
    }

    const invalidAges = targetAges.filter(age => age < sourceAge || age > 120);
    if (invalidAges.length > 0) {
      return NextResponse.json(
        { error: `Invalid target ages: ${invalidAges.join(', ')}. Target ages must be greater than source age and less than 120.` },
        { status: 400 }
      );
    }

    // Limit number of target ages
    if (targetAges.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 target ages per request' },
        { status: 400 }
      );
    }

    // Verify source photo exists and has a face
    const { data: photo, error: photoError } = await supabase
      .from('photo_submissions')
      .select('id, case_id, has_face_detected, quality_grade, consent_record_id, is_consent_verified')
      .eq('id', sourcePhotoId)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Source photo not found' }, { status: 404 });
    }

    if (!photo.has_face_detected) {
      return NextResponse.json(
        { error: 'No face detected in source photo' },
        { status: 400 }
      );
    }

    // Check quality
    if (photo.quality_grade === 'poor' || photo.quality_grade === 'unusable') {
      return NextResponse.json(
        { error: 'Source photo quality is too low for age progression' },
        { status: 400 }
      );
    }

    // Check consent for age progression
    if (photo.consent_record_id) {
      const { data: consent } = await supabase
        .from('consent_records')
        .select('consent_status, allowed_uses')
        .eq('id', photo.consent_record_id)
        .single();

      if (consent?.consent_status !== 'granted') {
        return NextResponse.json(
          { error: 'Valid consent required for age progression' },
          { status: 403 }
        );
      }

      if (consent?.allowed_uses && !(consent.allowed_uses as Record<string, boolean>).ageProgression) {
        return NextResponse.json(
          { error: 'Age progression not authorized in consent' },
          { status: 403 }
        );
      }
    }

    // Create request record
    const requestRecord = {
      case_id: caseId,
      source_photo_id: sourcePhotoId,
      requested_by: user.id,
      source_age: sourceAge,
      target_ages: targetAges,
      include_variations: includeVariations,
      variation_parameters: variationParameters,
      status: 'pending',
      requires_approval: true, // Always require approval for age progression
    };

    const { data: apRequest, error: dbError } = await supabase
      .from('age_progression_requests')
      .insert(requestRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating age progression request:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Estimate processing time
    const baseTime = 60; // 1 minute base
    const perAgeTime = 30; // 30 seconds per target age
    const variationMultiplier = includeVariations ? 2 : 1;
    const estimatedTime = (baseTime + (targetAges.length * perAgeTime)) * variationMultiplier;

    return NextResponse.json({
      data: mapAgeProgressionRequestFromDb(apRequest as Record<string, unknown>),
      estimatedProcessingTime: estimatedTime,
    }, { status: 201 });

  } catch (error) {
    console.error('Age progression request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/facial-recognition/age-progression
 * Update an age progression request (approval, quality review)
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

  // Check admin/supervisor permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role) || !profile.is_verified) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      requestId,
      approved,
      rejectionReason,
      qualityScore,
      qualityNotes,
      usedInCase,
      publicDistributionApproved,
    } = body as {
      requestId: string;
      approved?: boolean;
      rejectionReason?: string;
      qualityScore?: number;
      qualityNotes?: string;
      usedInCase?: boolean;
      publicDistributionApproved?: boolean;
    };

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
    }

    // Verify request exists
    const { data: existingRequest, error: fetchError } = await supabase
      .from('age_progression_requests')
      .select('id, status, requires_approval')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (approved !== undefined) {
      updates.approved = approved;
      updates.approved_by = user.id;
      updates.approved_at = new Date().toISOString();

      if (!approved && rejectionReason) {
        updates.rejection_reason = rejectionReason;
      }
    }

    if (qualityScore !== undefined) {
      updates.quality_reviewed = true;
      updates.quality_reviewer_id = user.id;
      updates.quality_score = Math.max(0, Math.min(100, qualityScore));
      if (qualityNotes) {
        updates.quality_notes = qualityNotes;
      }
    }

    if (usedInCase !== undefined) {
      updates.used_in_case = usedInCase;
    }

    if (publicDistributionApproved !== undefined) {
      updates.public_distribution_approved = publicDistributionApproved;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('age_progression_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating age progression request:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapAgeProgressionRequestFromDb(updatedRequest as Record<string, unknown>),
    });

  } catch (error) {
    console.error('Age progression update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
