import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyTip } from '@/lib/services/tip-verification-engine';
import {
  mapTipVerificationFromDb,
  mapTipsterProfileFromDb,
  type TipVerificationInput,
  type TipPriorityBucket,
} from '@/types/tip-verification.types';

/**
 * GET /api/tips/verification
 * List tip verifications with optional filters
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

  // Check if user has LE/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const status = searchParams.get('status');
  const priorityBucket = searchParams.get('priorityBucket') as TipPriorityBucket | null;
  const requiresReview = searchParams.get('requiresReview');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('tip_verifications')
    .select(`
      *,
      tips (
        id,
        case_id,
        content,
        location,
        latitude,
        longitude,
        sighting_date,
        is_anonymous,
        created_at
      )
    `, { count: 'exact' });

  // Apply filters
  if (caseId) {
    query = query.eq('tips.case_id', caseId);
  }
  if (status) {
    query = query.eq('verification_status', status);
  }
  if (priorityBucket) {
    query = query.eq('priority_bucket', priorityBucket);
  }
  if (requiresReview === 'true') {
    query = query.eq('requires_human_review', true);
  }

  // Apply pagination and ordering
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verifications = data?.map((item) => ({
    ...mapTipVerificationFromDb(item),
    tip: item.tips,
  })) || [];

  return NextResponse.json({
    verifications,
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * POST /api/tips/verification
 * Verify a tip (run automated verification process)
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

  const body = await request.json();
  const { tipId, forceReVerification = false } = body;

  if (!tipId) {
    return NextResponse.json({ error: 'tipId is required' }, { status: 400 });
  }

  // Check if verification already exists (unless forcing re-verification)
  if (!forceReVerification) {
    const { data: existingVerification } = await supabase
      .from('tip_verifications')
      .select('id')
      .eq('tip_id', tipId)
      .single();

    if (existingVerification) {
      return NextResponse.json(
        { error: 'Verification already exists. Use forceReVerification to re-verify.' },
        { status: 409 }
      );
    }
  }

  // Fetch the tip with case details
  const { data: tip, error: tipError } = await supabase
    .from('tips')
    .select(`
      *,
      cases (
        id,
        priority_level,
        last_seen_latitude,
        last_seen_longitude,
        last_seen_date,
        first_name,
        last_name,
        status
      ),
      tipster_profiles (*)
    `)
    .eq('id', tipId)
    .single();

  if (tipError || !tip) {
    return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
  }

  // Fetch tip attachments
  const { data: attachments } = await supabase
    .from('tip_attachments')
    .select('*')
    .eq('tip_id', tipId);

  // Fetch existing leads for cross-reference
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id, location, latitude, longitude, sighting_date, description, status')
    .eq('case_id', tip.case_id);

  // Fetch existing tips for duplicate detection
  const { data: existingTips } = await supabase
    .from('tips')
    .select('id, content, location, created_at, credibility_score')
    .eq('case_id', tip.case_id)
    .neq('id', tipId);

  // Fetch verification rules
  const { data: verificationRules } = await supabase
    .from('verification_rules')
    .select('*')
    .eq('is_active', true);

  // Fetch scam patterns
  const { data: scamPatterns } = await supabase
    .from('scam_patterns')
    .select('*')
    .eq('is_active', true);

  // Prepare verification input
  const verificationInput: TipVerificationInput = {
    tipId: tip.id,
    content: tip.content,
    location: tip.location,
    latitude: tip.latitude,
    longitude: tip.longitude,
    sightingDate: tip.sighting_date,
    isAnonymous: tip.is_anonymous,
    tipsterProfileId: tip.tipster_profile_id,
    attachments: attachments?.map((a) => ({
      id: a.id,
      tipId: a.tip_id,
      fileName: a.file_name,
      fileType: a.file_type,
      fileSize: a.file_size,
      url: a.url,
      thumbnailUrl: a.thumbnail_url,
      exifData: a.exif_data,
      gpsLatitude: a.gps_latitude,
      gpsLongitude: a.gps_longitude,
      photoTakenAt: a.photo_taken_at,
      deviceInfo: a.device_info,
      isStockPhoto: a.is_stock_photo,
      isAiGenerated: a.is_ai_generated,
      isManipulated: a.is_manipulated,
      manipulationConfidence: a.manipulation_confidence,
      facesDetected: a.faces_detected || 0,
      matchesMissingPerson: a.matches_missing_person,
      verified: a.verified,
      uploadedAt: a.uploaded_at,
      createdAt: a.created_at,
    })),
    ipAddress: tip.ip_address,
    userAgent: tip.user_agent,
    caseId: tip.case_id,
  };

  // Run verification engine
  const result = await verifyTip({
    tip: verificationInput,
    caseData: {
      id: tip.cases.id,
      priorityLevel: tip.cases.priority_level,
      lastSeenLatitude: tip.cases.last_seen_latitude,
      lastSeenLongitude: tip.cases.last_seen_longitude,
      lastSeenDate: tip.cases.last_seen_date,
      firstName: tip.cases.first_name,
      lastName: tip.cases.last_name,
      status: tip.cases.status,
    },
    tipsterProfile: tip.tipster_profiles ? mapTipsterProfileFromDb(tip.tipster_profiles) : undefined,
    existingLeads: existingLeads?.map((l) => ({
      id: l.id,
      location: l.location,
      latitude: l.latitude,
      longitude: l.longitude,
      sightingDate: l.sighting_date,
      description: l.description,
      status: l.status,
    })) || [],
    existingTips: existingTips?.map((t) => ({
      id: t.id,
      content: t.content,
      location: t.location,
      createdAt: t.created_at,
      credibilityScore: t.credibility_score,
    })) || [],
    scamPatterns: scamPatterns?.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      patternType: p.pattern_type,
      patternData: p.pattern_data,
      confidenceThreshold: p.confidence_threshold,
      timesDetected: p.times_detected,
      lastDetectedAt: p.last_detected_at,
      isActive: p.is_active,
      createdBy: p.created_by,
      source: p.source,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })) || [],
    verificationRules: verificationRules?.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      ruleType: r.rule_type,
      conditions: r.conditions,
      actions: r.actions,
      scoreWeight: r.score_weight,
      isActive: r.is_active,
      jurisdictionId: r.jurisdiction_id,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })) || [],
  });

  // Save verification result to database
  const verificationData = {
    tip_id: tipId,
    verification_status: result.verification.verificationStatus,
    priority_bucket: result.verification.priorityBucket,
    credibility_score: result.verification.credibilityScore,
    credibility_factors: result.verification.credibilityFactors,
    photo_verification_score: result.verification.photoVerificationScore,
    location_verification_score: result.verification.locationVerificationScore,
    time_plausibility_score: result.verification.timePlausibilityScore,
    text_analysis_score: result.verification.textAnalysisScore,
    cross_reference_score: result.verification.crossReferenceScore,
    tipster_reliability_score: result.verification.tipsterReliabilityScore,
    verification_methods: result.verification.verificationMethods,
    photo_metadata: result.verification.photoMetadata,
    photo_analysis_notes: result.verification.photoAnalysisNotes,
    photo_is_original: result.verification.photoIsOriginal,
    photo_location_matches: result.verification.photoLocationMatches,
    photo_timestamp_matches: result.verification.photoTimestampMatches,
    location_verified: result.verification.locationVerified,
    location_confidence: result.verification.locationConfidence,
    location_source: result.verification.locationSource,
    distance_from_last_seen_km: result.verification.distanceFromLastSeenKm,
    time_plausible: result.verification.timePlausible,
    time_plausibility_notes: result.verification.timePlausibilityNotes,
    travel_time_feasible: result.verification.travelTimeFeasible,
    sentiment_score: result.verification.sentimentScore,
    text_coherence_score: result.verification.textCoherenceScore,
    detail_richness_score: result.verification.detailRichnessScore,
    consistency_score: result.verification.consistencyScore,
    is_duplicate: result.verification.isDuplicate,
    duplicate_tip_ids: result.verification.duplicateTipIds,
    similarity_scores: result.verification.similarityScores,
    matches_existing_leads: result.verification.matchesExistingLeads,
    matching_lead_ids: result.verification.matchingLeadIds,
    matches_known_locations: result.verification.matchesKnownLocations,
    matches_suspect_description: result.verification.matchesSuspectDescription,
    hoax_indicators: result.verification.hoaxIndicators,
    spam_score: result.verification.spamScore,
    hoax_detection_notes: result.verification.hoaxDetectionNotes,
    ai_summary: result.verification.aiSummary,
    ai_confidence: result.verification.aiConfidence,
    ai_recommendations: result.verification.aiRecommendations,
    auto_triaged: result.verification.autoTriaged,
    auto_triage_reason: result.verification.autoTriageReason,
    auto_follow_up_sent: result.verification.autoFollowUpSent,
    requires_human_review: result.verification.requiresHumanReview,
    review_priority: result.verification.reviewPriority,
    review_deadline: result.verification.reviewDeadline,
    verified_at: result.verification.verifiedAt,
  };

  let savedVerification;
  if (forceReVerification) {
    // Update existing verification
    const { data, error } = await supabase
      .from('tip_verifications')
      .update(verificationData)
      .eq('tip_id', tipId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedVerification = data;
  } else {
    // Insert new verification
    const { data, error } = await supabase
      .from('tip_verifications')
      .insert(verificationData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    savedVerification = data;
  }

  // Update tip with verification reference and priority
  await supabase
    .from('tips')
    .update({
      verification_id: savedVerification.id,
      priority_bucket: result.priorityBucket,
      auto_verified: result.verification.verificationStatus === 'auto_verified',
      auto_verification_score: result.verification.credibilityScore,
      requires_human_review: result.requiresReview,
    })
    .eq('id', tipId);

  // Add to review queue if needed
  if (result.requiresReview) {
    await supabase
      .from('verification_queue')
      .insert({
        tip_id: tipId,
        tip_verification_id: savedVerification.id,
        queue_type: result.priorityBucket === 'critical' ? 'critical' :
                    result.priorityBucket === 'high' ? 'high_priority' :
                    result.priorityBucket === 'low' ? 'low_priority' : 'standard',
        priority: result.reviewPriority,
        sla_deadline: result.verification.reviewDeadline,
      });
  }

  return NextResponse.json({
    success: true,
    verification: mapTipVerificationFromDb(savedVerification),
    result: {
      priorityBucket: result.priorityBucket,
      requiresReview: result.requiresReview,
      reviewPriority: result.reviewPriority,
      autoActions: result.autoActions,
      warnings: result.warnings,
      suggestions: result.suggestions,
    },
  });
}
