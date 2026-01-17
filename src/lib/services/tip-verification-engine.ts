/**
 * Tip Verification Engine
 * LC-FEAT-034: Automated Tip Verification System
 *
 * AI-powered system to verify, score, and prioritize incoming tips.
 */

import type {
  TipVerification,
  TipVerificationInput,
  TipVerificationResult,
  TipPriorityBucket,
  TipVerificationStatus,
  VerificationMethod,
  HoaxIndicatorType,
  CredibilityFactor,
  PhotoMetadata,
  AutomatedAction,
  VerificationWarning,
  TipsterProfile,
  ScamPattern,
  VerificationRule,
  RuleCondition,
  RuleAction,
} from '@/types/tip-verification.types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const VERIFICATION_CONFIG = {
  // Minimum credibility score to auto-verify
  autoVerifyThreshold: 75,
  // Maximum spam score before marking as spam
  spamThreshold: 70,
  // Minimum score to require human review
  reviewThreshold: 40,
  // Maximum distance (km) for location plausibility
  maxPlausibleDistance: 500,
  // Maximum travel speed (km/h) for time plausibility
  maxTravelSpeed: 200,
  // Weights for credibility calculation
  weights: {
    photo: 0.20,
    location: 0.20,
    time: 0.15,
    text: 0.15,
    crossReference: 0.15,
    tipsterReliability: 0.15,
  },
  // SLA hours by priority
  slaHours: {
    critical: 1,
    high: 4,
    medium: 24,
    low: 72,
  },
};

// =============================================================================
// MAIN VERIFICATION ENGINE
// =============================================================================

export interface VerificationEngineContext {
  tip: TipVerificationInput;
  caseData: CaseData;
  tipsterProfile?: TipsterProfile;
  existingLeads: LeadData[];
  existingTips: ExistingTipData[];
  scamPatterns: ScamPattern[];
  verificationRules: VerificationRule[];
}

interface CaseData {
  id: string;
  priorityLevel: string;
  lastSeenLatitude?: number;
  lastSeenLongitude?: number;
  lastSeenDate: string;
  firstName: string;
  lastName: string;
  description?: string;
  status: string;
}

interface LeadData {
  id: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  sightingDate?: string;
  description?: string;
  status: string;
}

interface ExistingTipData {
  id: string;
  content: string;
  location?: string;
  createdAt: string;
  credibilityScore?: number;
}

/**
 * Main verification function - orchestrates all verification steps
 */
export async function verifyTip(
  context: VerificationEngineContext
): Promise<TipVerificationResult> {
  const { tip, caseData, tipsterProfile, existingLeads, existingTips, scamPatterns, verificationRules } = context;

  const verificationMethods: VerificationMethod[] = [];
  const hoaxIndicators: HoaxIndicatorType[] = [];
  const credibilityFactors: CredibilityFactor[] = [];
  const autoActions: AutomatedAction[] = [];
  const warnings: VerificationWarning[] = [];
  const suggestions: string[] = [];

  // Check if tipster is blocked
  if (tipsterProfile?.isBlocked) {
    warnings.push({
      type: 'blocked_tipster',
      severity: 'critical',
      message: 'Tip submitted by a blocked tipster',
      details: { reason: tipsterProfile.blockedReason },
    });
  }

  // 1. Tipster Reliability Score
  const tipsterReliabilityScore = calculateTipsterReliabilityScore(tipsterProfile);
  verificationMethods.push('pattern_matching');
  credibilityFactors.push({
    factor: 'tipster_reliability',
    score: tipsterReliabilityScore,
    weight: VERIFICATION_CONFIG.weights.tipsterReliability,
    description: getTipsterReliabilityDescription(tipsterProfile),
    source: 'pattern_matching',
  });

  // 2. Text Analysis
  const textAnalysis = analyzeText(tip.content);
  verificationMethods.push('text_sentiment');
  credibilityFactors.push({
    factor: 'text_analysis',
    score: textAnalysis.score,
    weight: VERIFICATION_CONFIG.weights.text,
    description: textAnalysis.description,
    source: 'text_sentiment',
  });

  // 3. Photo Metadata Analysis
  let photoScore = 50; // Default neutral score
  let photoMetadata: PhotoMetadata | undefined;
  if (tip.attachments && tip.attachments.length > 0) {
    const photoAnalysis = analyzePhotoMetadata(tip.attachments, tip.sightingDate, tip.latitude, tip.longitude);
    photoScore = photoAnalysis.score;
    photoMetadata = photoAnalysis.metadata;
    verificationMethods.push('photo_metadata');
    credibilityFactors.push({
      factor: 'photo_verification',
      score: photoScore,
      weight: VERIFICATION_CONFIG.weights.photo,
      description: photoAnalysis.description,
      source: 'photo_metadata',
    });

    if (photoAnalysis.hoaxIndicators.length > 0) {
      hoaxIndicators.push(...photoAnalysis.hoaxIndicators);
    }
  }

  // 4. Location Verification
  const locationAnalysis = verifyLocation(tip, caseData);
  verificationMethods.push('geolocation');
  credibilityFactors.push({
    factor: 'location_verification',
    score: locationAnalysis.score,
    weight: VERIFICATION_CONFIG.weights.location,
    description: locationAnalysis.description,
    source: 'geolocation',
  });

  if (locationAnalysis.hoaxIndicators.length > 0) {
    hoaxIndicators.push(...locationAnalysis.hoaxIndicators);
  }

  // 5. Time Plausibility
  const timeAnalysis = checkTimePlausibility(tip, caseData);
  verificationMethods.push('time_plausibility');
  credibilityFactors.push({
    factor: 'time_plausibility',
    score: timeAnalysis.score,
    weight: VERIFICATION_CONFIG.weights.time,
    description: timeAnalysis.description,
    source: 'time_plausibility',
  });

  if (timeAnalysis.hoaxIndicators.length > 0) {
    hoaxIndicators.push(...timeAnalysis.hoaxIndicators);
  }

  // 6. Cross-Reference with Existing Leads
  const crossRefAnalysis = crossReferenceLeads(tip, existingLeads);
  verificationMethods.push('cross_reference');
  credibilityFactors.push({
    factor: 'cross_reference',
    score: crossRefAnalysis.score,
    weight: VERIFICATION_CONFIG.weights.crossReference,
    description: crossRefAnalysis.description,
    source: 'cross_reference',
  });

  // 7. Duplicate Detection
  const duplicateAnalysis = detectDuplicates(tip, existingTips);
  verificationMethods.push('duplicate_detection');

  if (duplicateAnalysis.isDuplicate) {
    warnings.push({
      type: 'duplicate',
      severity: 'medium',
      message: 'This tip appears to be a duplicate of an existing tip',
      details: { duplicateIds: duplicateAnalysis.duplicateIds },
    });
  }

  // 8. Spam/Hoax Detection
  const spamAnalysis = detectSpamAndHoax(tip, scamPatterns);
  hoaxIndicators.push(...spamAnalysis.hoaxIndicators);

  if (spamAnalysis.spamScore > 50) {
    warnings.push({
      type: 'spam',
      severity: spamAnalysis.spamScore > 70 ? 'high' : 'medium',
      message: 'This tip has characteristics of spam',
      details: { spamScore: spamAnalysis.spamScore },
    });
  }

  // Calculate overall credibility score
  const credibilityScore = calculateOverallCredibility(
    credibilityFactors,
    spamAnalysis.spamScore,
    hoaxIndicators.length,
    duplicateAnalysis.isDuplicate
  );

  if (credibilityScore < 30) {
    warnings.push({
      type: 'low_credibility',
      severity: 'high',
      message: 'This tip has a low credibility score',
      details: { score: credibilityScore },
    });
  }

  // Apply verification rules
  const ruleResults = applyVerificationRules(
    verificationRules,
    {
      credibilityScore,
      spamScore: spamAnalysis.spamScore,
      tipsterProfile,
      isAnonymous: tip.isAnonymous,
      casePriority: caseData.priorityLevel,
      hasPhoto: (tip.attachments?.length ?? 0) > 0,
      hasLocation: !!(tip.latitude && tip.longitude),
      hoaxIndicatorCount: hoaxIndicators.length,
    }
  );

  // Determine priority bucket
  let priorityBucket = determinePriorityBucket(
    credibilityScore,
    caseData.priorityLevel,
    (tip.attachments?.length ?? 0) > 0,
    !!(tip.latitude && tip.longitude),
    tipsterProfile?.reliabilityTier
  );

  // Apply rule overrides
  if (ruleResults.priorityOverride) {
    priorityBucket = ruleResults.priorityOverride;
  }

  // Determine verification status
  let verificationStatus: TipVerificationStatus = 'unverified';
  let requiresHumanReview = true;
  let reviewPriority = 5;

  if (spamAnalysis.spamScore >= VERIFICATION_CONFIG.spamThreshold) {
    verificationStatus = 'rejected';
    priorityBucket = 'spam';
    requiresHumanReview = ruleResults.forceReview;
    autoActions.push({
      action: 'auto_reject_spam',
      description: 'Tip automatically rejected due to high spam score',
      executedAt: new Date().toISOString(),
    });
  } else if (credibilityScore >= VERIFICATION_CONFIG.autoVerifyThreshold && hoaxIndicators.length === 0) {
    verificationStatus = 'auto_verified';
    requiresHumanReview = caseData.priorityLevel === 'p0_critical' || ruleResults.forceReview;
  } else if (credibilityScore >= VERIFICATION_CONFIG.reviewThreshold) {
    verificationStatus = 'pending_review';
    requiresHumanReview = true;
  } else {
    verificationStatus = 'unverified';
    requiresHumanReview = ruleResults.forceReview;
  }

  // Set review priority based on case priority and credibility
  if (caseData.priorityLevel === 'p0_critical') {
    reviewPriority = 1;
  } else if (caseData.priorityLevel === 'p1_high' || credibilityScore >= 70) {
    reviewPriority = 2;
  } else if (credibilityScore >= 50) {
    reviewPriority = 5;
  } else {
    reviewPriority = 8;
  }

  if (ruleResults.reviewPriorityOverride) {
    reviewPriority = ruleResults.reviewPriorityOverride;
  }

  // Generate suggestions
  if (!tip.latitude || !tip.longitude) {
    suggestions.push('Request specific location details from tipster');
  }
  if (!tip.attachments || tip.attachments.length === 0) {
    suggestions.push('Request photos or visual evidence from tipster');
  }
  if (tip.content.length < 100) {
    suggestions.push('Request additional details about the sighting');
  }
  if (credibilityScore >= 60 && crossRefAnalysis.matchingLeadIds.length === 0) {
    suggestions.push('Consider creating a new lead from this tip');
  }

  // Record auto actions
  if (ruleResults.actions.length > 0) {
    autoActions.push(...ruleResults.actions);
  }

  // Calculate SLA deadline
  const slaHours = VERIFICATION_CONFIG.slaHours[priorityBucket === 'spam' ? 'low' : priorityBucket];
  const reviewDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

  // Build verification record
  const verification: TipVerification = {
    id: '', // Will be set by database
    tipId: tip.tipId,
    verificationStatus,
    priorityBucket,
    credibilityScore,
    credibilityFactors,
    photoVerificationScore: photoScore,
    locationVerificationScore: locationAnalysis.score,
    timePlausibilityScore: timeAnalysis.score,
    textAnalysisScore: textAnalysis.score,
    crossReferenceScore: crossRefAnalysis.score,
    tipsterReliabilityScore,
    verificationMethods,
    photoMetadata,
    photoAnalysisNotes: (tip.attachments?.length ?? 0) > 0 ? 'Photo metadata analyzed' : undefined,
    photoIsOriginal: photoMetadata?.hasExif,
    photoLocationMatches: photoMetadata?.hasGps ? locationAnalysis.score >= 70 : undefined,
    photoTimestampMatches: photoMetadata?.timestamp ? timeAnalysis.score >= 70 : undefined,
    locationVerified: locationAnalysis.score >= 70,
    locationConfidence: locationAnalysis.score / 100,
    locationSource: tip.latitude && tip.longitude ? 'user-provided' : 'none',
    distanceFromLastSeenKm: locationAnalysis.distance,
    timePlausible: timeAnalysis.score >= 50,
    timePlausibilityNotes: timeAnalysis.description,
    travelTimeFeasible: timeAnalysis.travelFeasible,
    sentimentScore: textAnalysis.sentiment,
    textCoherenceScore: textAnalysis.coherence,
    detailRichnessScore: textAnalysis.detailRichness,
    consistencyScore: textAnalysis.consistency,
    isDuplicate: duplicateAnalysis.isDuplicate,
    duplicateTipIds: duplicateAnalysis.duplicateIds,
    similarityScores: duplicateAnalysis.similarityScores,
    matchesExistingLeads: crossRefAnalysis.matchingLeadIds.length > 0,
    matchingLeadIds: crossRefAnalysis.matchingLeadIds,
    matchesKnownLocations: crossRefAnalysis.matchesKnownLocations,
    matchesSuspectDescription: false,
    hoaxIndicators,
    spamScore: spamAnalysis.spamScore,
    hoaxDetectionNotes: hoaxIndicators.length > 0 ? `Detected ${hoaxIndicators.length} hoax indicator(s)` : undefined,
    aiSummary: generateAISummary(tip, credibilityScore, priorityBucket),
    aiConfidence: credibilityScore / 100,
    aiRecommendations: suggestions,
    autoTriaged: verificationStatus === 'auto_verified' || priorityBucket === 'spam',
    autoTriageReason: verificationStatus === 'auto_verified'
      ? 'High credibility tip auto-verified'
      : priorityBucket === 'spam'
        ? 'Spam detected'
        : undefined,
    autoFollowUpSent: false,
    followUpSentAt: undefined,
    requiresHumanReview,
    reviewPriority,
    reviewDeadline: requiresHumanReview ? reviewDeadline : undefined,
    reviewedBy: undefined,
    reviewedAt: undefined,
    reviewerNotes: undefined,
    reviewerOverrideScore: undefined,
    verifiedAt: verificationStatus === 'auto_verified' ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    verification,
    priorityBucket,
    requiresReview: requiresHumanReview,
    reviewPriority,
    autoActions,
    warnings,
    suggestions,
  };
}

// =============================================================================
// TIPSTER RELIABILITY
// =============================================================================

function calculateTipsterReliabilityScore(profile?: TipsterProfile): number {
  if (!profile) {
    return 50; // Neutral score for unknown tipsters
  }

  if (profile.isBlocked) {
    return 0;
  }

  // Use the stored reliability score as base
  let score = profile.reliabilityScore;

  // Bonus for consistent behavior
  if (profile.providesPhotos) score += 5;
  if (profile.providesDetailedInfo) score += 5;
  if (profile.consistentLocationReporting) score += 5;

  // Penalty for spam history
  if (profile.spamTips > 0) {
    score -= profile.spamTips * 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getTipsterReliabilityDescription(profile?: TipsterProfile): string {
  if (!profile) {
    return 'New or anonymous tipster - no reliability history';
  }

  if (profile.isBlocked) {
    return 'Tipster is blocked';
  }

  const tierDescriptions: Record<string, string> = {
    verified_source: 'Verified source with excellent track record',
    high: 'High reliability tipster with good history',
    moderate: 'Moderate reliability based on past tips',
    low: 'Low reliability - past tips had issues',
    unrated: 'Insufficient history to rate reliability',
    new: 'New tipster - first tip submission',
  };

  return tierDescriptions[profile.reliabilityTier] || 'Unknown reliability';
}

// =============================================================================
// TEXT ANALYSIS
// =============================================================================

interface TextAnalysisResult {
  score: number;
  description: string;
  sentiment: number;
  coherence: number;
  detailRichness: number;
  consistency: number;
}

function analyzeText(content: string): TextAnalysisResult {
  const wordCount = content.split(/\s+/).length;
  const sentenceCount = (content.match(/[.!?]+/g) || []).length || 1;

  // Detail richness - based on length and specificity
  let detailRichness = 50;
  if (wordCount > 50) detailRichness += 10;
  if (wordCount > 100) detailRichness += 10;
  if (wordCount > 200) detailRichness += 10;

  // Check for specific details (dates, times, locations, descriptions)
  const hasDate = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(content);
  const hasTime = /\d{1,2}:\d{2}|\b(morning|afternoon|evening|night|am|pm)\b/i.test(content);
  const hasLocation = /\b(street|avenue|road|highway|store|restaurant|park|school|hospital|mall|near|corner|intersection)\b/i.test(content);
  const hasDescription = /\b(wearing|hair|tall|short|shirt|pants|jacket|hat|glasses|tattoo)\b/i.test(content);

  if (hasDate) detailRichness += 5;
  if (hasTime) detailRichness += 5;
  if (hasLocation) detailRichness += 5;
  if (hasDescription) detailRichness += 5;

  detailRichness = Math.min(100, detailRichness);

  // Coherence - based on sentence structure
  const avgWordsPerSentence = wordCount / sentenceCount;
  let coherence = 60;
  if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) {
    coherence += 20;
  }
  if (avgWordsPerSentence < 3 || avgWordsPerSentence > 50) {
    coherence -= 20;
  }

  // Check for all caps (shouting) or no caps (lazy)
  const allCaps = content === content.toUpperCase() && wordCount > 5;
  const noCaps = content === content.toLowerCase() && wordCount > 5;
  if (allCaps) coherence -= 10;
  if (noCaps) coherence -= 5;

  coherence = Math.max(0, Math.min(100, coherence));

  // Sentiment analysis (simplified)
  const positiveWords = /\b(saw|seen|definitely|certain|sure|positive|confirmed|recognized)\b/gi;
  const negativeWords = /\b(maybe|might|possibly|unsure|think|guess|not sure)\b/gi;
  const urgentWords = /\b(help|urgent|emergency|danger|scared|worried|immediately)\b/gi;

  const positiveCount = (content.match(positiveWords) || []).length;
  const negativeCount = (content.match(negativeWords) || []).length;
  const urgentCount = (content.match(urgentWords) || []).length;

  let sentiment = 0;
  sentiment += positiveCount * 0.1;
  sentiment -= negativeCount * 0.1;
  sentiment = Math.max(-1, Math.min(1, sentiment));

  // Consistency - check for contradictions (simplified)
  const consistency = 70; // Would need NLP for proper contradiction detection

  // Calculate overall score
  const score = Math.round(
    detailRichness * 0.4 +
    coherence * 0.3 +
    (sentiment + 1) * 25 * 0.2 + // Convert -1..1 to 0..50
    consistency * 0.1
  );

  let description = 'Text analysis: ';
  if (score >= 70) {
    description += 'Detailed and coherent description provided';
  } else if (score >= 50) {
    description += 'Adequate description with some details';
  } else {
    description += 'Limited or vague description';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    description,
    sentiment,
    coherence,
    detailRichness,
    consistency,
  };
}

// =============================================================================
// PHOTO ANALYSIS
// =============================================================================

interface PhotoAnalysisResult {
  score: number;
  description: string;
  metadata?: PhotoMetadata;
  hoaxIndicators: HoaxIndicatorType[];
}

function analyzePhotoMetadata(
  attachments: TipVerificationInput['attachments'],
  claimedDate?: string,
  claimedLat?: number,
  claimedLng?: number
): PhotoAnalysisResult {
  if (!attachments || attachments.length === 0) {
    return {
      score: 50,
      description: 'No photo provided',
      hoaxIndicators: [],
    };
  }

  const hoaxIndicators: HoaxIndicatorType[] = [];
  let score = 60; // Base score for providing a photo

  // Analyze first attachment (primary photo)
  const primaryAttachment = attachments[0];
  const metadata: PhotoMetadata = {
    hasExif: !!primaryAttachment.exifData,
    hasGps: !!(primaryAttachment.gpsLatitude && primaryAttachment.gpsLongitude),
    latitude: primaryAttachment.gpsLatitude,
    longitude: primaryAttachment.gpsLongitude,
    timestamp: primaryAttachment.photoTakenAt,
    device: primaryAttachment.deviceInfo,
  };

  // EXIF data presence
  if (metadata.hasExif) {
    score += 10;
  } else {
    score -= 5;
  }

  // GPS data presence and verification
  if (metadata.hasGps) {
    score += 15;

    // Verify GPS matches claimed location
    if (claimedLat && claimedLng) {
      const distance = calculateDistance(
        metadata.latitude!,
        metadata.longitude!,
        claimedLat,
        claimedLng
      );
      if (distance < 1) {
        score += 10; // GPS matches claimed location
      } else if (distance < 5) {
        score += 5;
      } else if (distance > 50) {
        score -= 10;
        hoaxIndicators.push('conflicting_location');
      }
    }
  }

  // Timestamp verification
  if (metadata.timestamp) {
    score += 5;
    if (claimedDate) {
      const photoDate = new Date(metadata.timestamp);
      const claimed = new Date(claimedDate);
      const daysDiff = Math.abs(photoDate.getTime() - claimed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff < 1) {
        score += 10;
      } else if (daysDiff > 7) {
        score -= 10;
        hoaxIndicators.push('suspicious_metadata');
      }
    }
  }

  // Check for stock photo indicators
  if (primaryAttachment.isStockPhoto) {
    score -= 30;
    hoaxIndicators.push('stock_photo_detected');
  }

  // Check for AI-generated content
  if (primaryAttachment.isAiGenerated) {
    score -= 40;
    hoaxIndicators.push('ai_generated_content');
  }

  // Check for manipulation
  if (primaryAttachment.isManipulated && (primaryAttachment.manipulationConfidence ?? 0) > 0.7) {
    score -= 20;
    hoaxIndicators.push('suspicious_metadata');
  }

  // Bonus for face detection matching missing person
  if (primaryAttachment.matchesMissingPerson) {
    score += 25;
  }

  const description = generatePhotoDescription(score, metadata, hoaxIndicators);

  return {
    score: Math.max(0, Math.min(100, score)),
    description,
    metadata,
    hoaxIndicators,
  };
}

function generatePhotoDescription(
  score: number,
  metadata: PhotoMetadata,
  hoaxIndicators: HoaxIndicatorType[]
): string {
  if (hoaxIndicators.includes('stock_photo_detected')) {
    return 'WARNING: Photo appears to be a stock image';
  }
  if (hoaxIndicators.includes('ai_generated_content')) {
    return 'WARNING: Photo appears to be AI-generated';
  }

  if (score >= 80) {
    return 'Photo with verified metadata and matching location/time';
  } else if (score >= 60) {
    return metadata.hasGps
      ? 'Photo with GPS data provided'
      : 'Photo provided with some metadata';
  } else {
    return 'Photo quality or authenticity concerns detected';
  }
}

// =============================================================================
// LOCATION VERIFICATION
// =============================================================================

interface LocationAnalysisResult {
  score: number;
  description: string;
  distance?: number;
  hoaxIndicators: HoaxIndicatorType[];
}

function verifyLocation(tip: TipVerificationInput, caseData: CaseData): LocationAnalysisResult {
  const hoaxIndicators: HoaxIndicatorType[] = [];

  // No location provided
  if (!tip.latitude || !tip.longitude) {
    // Check if text location is provided
    if (tip.location) {
      return {
        score: 40,
        description: 'Text-based location provided, no GPS coordinates',
        hoaxIndicators,
      };
    }
    return {
      score: 30,
      description: 'No location information provided',
      hoaxIndicators,
    };
  }

  // Calculate distance from last seen location
  let distance: number | undefined;
  if (caseData.lastSeenLatitude && caseData.lastSeenLongitude) {
    distance = calculateDistance(
      tip.latitude,
      tip.longitude,
      caseData.lastSeenLatitude,
      caseData.lastSeenLongitude
    );
  }

  let score = 60; // Base score for providing coordinates

  // Score based on distance plausibility
  if (distance !== undefined) {
    if (distance < 10) {
      score += 20; // Very close to last seen location
    } else if (distance < 50) {
      score += 15;
    } else if (distance < 100) {
      score += 10;
    } else if (distance < VERIFICATION_CONFIG.maxPlausibleDistance) {
      score += 5;
    } else {
      score -= 10;
    }

    // Check for impossible distance given time elapsed
    const hoursSinceLastSeen = getHoursBetween(caseData.lastSeenDate, tip.sightingDate || new Date().toISOString());
    const maxPossibleDistance = hoursSinceLastSeen * VERIFICATION_CONFIG.maxTravelSpeed;

    if (distance > maxPossibleDistance && hoursSinceLastSeen < 48) {
      score -= 20;
      hoaxIndicators.push('impossible_timeline');
    }
  }

  // Bonus for specific location
  if (tip.location && tip.location.length > 20) {
    score += 5;
  }

  const description = generateLocationDescription(score, distance, hoaxIndicators);

  return {
    score: Math.max(0, Math.min(100, score)),
    description,
    distance,
    hoaxIndicators,
  };
}

function generateLocationDescription(
  score: number,
  distance?: number,
  hoaxIndicators: HoaxIndicatorType[] = []
): string {
  if (hoaxIndicators.includes('impossible_timeline')) {
    return 'WARNING: Location impossible given timeline';
  }

  if (score >= 80) {
    return distance !== undefined
      ? `Location verified, ${distance.toFixed(1)}km from last seen`
      : 'Location with GPS coordinates verified';
  } else if (score >= 60) {
    return 'Location provided with GPS coordinates';
  } else if (score >= 40) {
    return 'Text location provided, no GPS';
  } else {
    return 'Location information missing or unreliable';
  }
}

// =============================================================================
// TIME PLAUSIBILITY
// =============================================================================

interface TimeAnalysisResult {
  score: number;
  description: string;
  travelFeasible: boolean;
  hoaxIndicators: HoaxIndicatorType[];
}

function checkTimePlausibility(tip: TipVerificationInput, caseData: CaseData): TimeAnalysisResult {
  const hoaxIndicators: HoaxIndicatorType[] = [];

  if (!tip.sightingDate) {
    return {
      score: 40,
      description: 'No sighting date/time provided',
      travelFeasible: true,
      hoaxIndicators,
    };
  }

  const sightingDate = new Date(tip.sightingDate);
  const lastSeenDate = new Date(caseData.lastSeenDate);
  const now = new Date();

  let score = 60;
  let travelFeasible = true;

  // Check if sighting is before disappearance (impossible)
  if (sightingDate < lastSeenDate) {
    score = 10;
    hoaxIndicators.push('impossible_timeline');
    return {
      score,
      description: 'WARNING: Claimed sighting is before disappearance',
      travelFeasible: false,
      hoaxIndicators,
    };
  }

  // Check if sighting is in the future
  if (sightingDate > now) {
    score = 10;
    hoaxIndicators.push('impossible_timeline');
    return {
      score,
      description: 'WARNING: Claimed sighting is in the future',
      travelFeasible: false,
      hoaxIndicators,
    };
  }

  // Check travel feasibility if we have both locations
  if (
    tip.latitude && tip.longitude &&
    caseData.lastSeenLatitude && caseData.lastSeenLongitude
  ) {
    const distance = calculateDistance(
      caseData.lastSeenLatitude,
      caseData.lastSeenLongitude,
      tip.latitude,
      tip.longitude
    );
    const hoursBetween = getHoursBetween(caseData.lastSeenDate, tip.sightingDate);
    const maxDistance = hoursBetween * VERIFICATION_CONFIG.maxTravelSpeed;

    if (distance > maxDistance) {
      travelFeasible = false;
      score -= 20;
      hoaxIndicators.push('impossible_timeline');
    } else {
      score += 10;
    }
  }

  // Recent sightings are more valuable
  const hoursSinceSighting = getHoursBetween(tip.sightingDate, now.toISOString());
  if (hoursSinceSighting < 24) {
    score += 15;
  } else if (hoursSinceSighting < 72) {
    score += 10;
  } else if (hoursSinceSighting > 168) { // More than a week old
    score -= 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    description: generateTimeDescription(score, sightingDate, travelFeasible),
    travelFeasible,
    hoaxIndicators,
  };
}

function generateTimeDescription(score: number, sightingDate: Date, travelFeasible: boolean): string {
  if (!travelFeasible) {
    return 'Travel time/distance inconsistent with claimed sighting';
  }

  const hoursSince = (Date.now() - sightingDate.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 24) {
    return 'Recent sighting within last 24 hours';
  } else if (hoursSince < 72) {
    return 'Sighting within last 3 days';
  } else {
    return `Sighting ${Math.floor(hoursSince / 24)} days ago`;
  }
}

// =============================================================================
// CROSS-REFERENCE
// =============================================================================

interface CrossRefResult {
  score: number;
  description: string;
  matchingLeadIds: string[];
  matchesKnownLocations: boolean;
}

function crossReferenceLeads(tip: TipVerificationInput, leads: LeadData[]): CrossRefResult {
  const matchingLeadIds: string[] = [];
  let matchesKnownLocations = false;

  for (const lead of leads) {
    // Check location proximity
    if (
      tip.latitude && tip.longitude &&
      lead.latitude && lead.longitude
    ) {
      const distance = calculateDistance(tip.latitude, tip.longitude, lead.latitude, lead.longitude);
      if (distance < 5) { // Within 5km
        matchingLeadIds.push(lead.id);
        matchesKnownLocations = true;
      }
    }

    // Check text similarity
    if (tip.location && lead.location) {
      const similarity = calculateTextSimilarity(tip.location.toLowerCase(), lead.location.toLowerCase());
      if (similarity > 0.5) {
        matchesKnownLocations = true;
      }
    }
  }

  let score = 50;
  if (matchingLeadIds.length > 0) {
    score += 20 + Math.min(20, matchingLeadIds.length * 5);
  }
  if (matchesKnownLocations) {
    score += 10;
  }

  const description = matchingLeadIds.length > 0
    ? `Corroborates ${matchingLeadIds.length} existing lead(s)`
    : 'No direct correlation with existing leads';

  return {
    score: Math.max(0, Math.min(100, score)),
    description,
    matchingLeadIds,
    matchesKnownLocations,
  };
}

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

interface DuplicateResult {
  isDuplicate: boolean;
  duplicateIds: string[];
  similarityScores: Record<string, number>;
}

function detectDuplicates(tip: TipVerificationInput, existingTips: ExistingTipData[]): DuplicateResult {
  const similarityScores: Record<string, number> = {};
  const duplicateIds: string[] = [];

  for (const existing of existingTips) {
    const contentSimilarity = calculateTextSimilarity(tip.content, existing.content);
    similarityScores[existing.id] = contentSimilarity;

    if (contentSimilarity > 0.8) {
      duplicateIds.push(existing.id);
    }
  }

  return {
    isDuplicate: duplicateIds.length > 0,
    duplicateIds,
    similarityScores,
  };
}

// =============================================================================
// SPAM/HOAX DETECTION
// =============================================================================

interface SpamAnalysisResult {
  spamScore: number;
  hoaxIndicators: HoaxIndicatorType[];
}

function detectSpamAndHoax(tip: TipVerificationInput, patterns: ScamPattern[]): SpamAnalysisResult {
  let spamScore = 0;
  const hoaxIndicators: HoaxIndicatorType[] = [];
  const contentLower = tip.content.toLowerCase();

  for (const pattern of patterns) {
    if (!pattern.isActive) continue;

    let matched = false;

    switch (pattern.patternType) {
      case 'text':
        if (pattern.patternData.keywords) {
          for (const keyword of pattern.patternData.keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
              matched = true;
              break;
            }
          }
        }
        if (pattern.patternData.patterns) {
          for (const p of pattern.patternData.patterns) {
            if (contentLower.includes(p.toLowerCase())) {
              matched = true;
              break;
            }
          }
        }
        break;

      case 'behavior':
        // Behavioral patterns would need more context (rate limiting, etc.)
        break;
    }

    if (matched) {
      spamScore += 20;
      hoaxIndicators.push('known_scam_pattern');
    }
  }

  // Common spam indicators
  const spamPhrases = [
    'wire money', 'gift card', 'western union', 'bitcoin', 'crypto',
    'payment required', 'reward claim', 'lottery', 'inheritance',
    'nigerian prince', 'urgent transfer'
  ];

  for (const phrase of spamPhrases) {
    if (contentLower.includes(phrase)) {
      spamScore += 30;
      if (!hoaxIndicators.includes('spam_signature')) {
        hoaxIndicators.push('spam_signature');
      }
    }
  }

  // Very short or repetitive content
  if (tip.content.length < 20) {
    spamScore += 10;
  }

  // All caps
  if (tip.content === tip.content.toUpperCase() && tip.content.length > 20) {
    spamScore += 5;
  }

  return {
    spamScore: Math.min(100, spamScore),
    hoaxIndicators,
  };
}

// =============================================================================
// VERIFICATION RULES APPLICATION
// =============================================================================

interface RuleContext {
  credibilityScore: number;
  spamScore: number;
  tipsterProfile?: TipsterProfile;
  isAnonymous: boolean;
  casePriority: string;
  hasPhoto: boolean;
  hasLocation: boolean;
  hoaxIndicatorCount: number;
}

interface RuleResults {
  priorityOverride?: TipPriorityBucket;
  reviewPriorityOverride?: number;
  forceReview: boolean;
  actions: AutomatedAction[];
}

function applyVerificationRules(rules: VerificationRule[], context: RuleContext): RuleResults {
  const results: RuleResults = {
    forceReview: false,
    actions: [],
  };

  for (const rule of rules) {
    if (!rule.isActive) continue;

    if (evaluateCondition(rule.conditions, context)) {
      applyAction(rule.actions, results, rule);
    }
  }

  return results;
}

function evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
  // Handle AND/OR conditions
  if (condition.and) {
    return condition.and.every(c => evaluateCondition(c, context));
  }
  if (condition.or) {
    return condition.or.some(c => evaluateCondition(c, context));
  }

  // Simple field comparison
  if (!condition.field || !condition.operator) {
    return false;
  }

  const fieldValue = getFieldValue(condition.field, context);
  const compareValue = condition.value;

  switch (condition.operator) {
    case '=':
      return fieldValue === compareValue;
    case '!=':
      return fieldValue !== compareValue;
    case '>':
      return typeof fieldValue === 'number' && fieldValue > (compareValue as number);
    case '<':
      return typeof fieldValue === 'number' && fieldValue < (compareValue as number);
    case '>=':
      return typeof fieldValue === 'number' && fieldValue >= (compareValue as number);
    case '<=':
      return typeof fieldValue === 'number' && fieldValue <= (compareValue as number);
    case 'in':
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
    default:
      return false;
  }
}

function getFieldValue(field: string, context: RuleContext): unknown {
  switch (field) {
    case 'credibility_score':
      return context.credibilityScore;
    case 'spam_score':
      return context.spamScore;
    case 'is_anonymous':
      return context.isAnonymous;
    case 'case_priority':
      return context.casePriority;
    case 'has_photo':
      return context.hasPhoto;
    case 'has_location':
      return context.hasLocation;
    case 'tipster_reliability_tier':
      return context.tipsterProfile?.reliabilityTier;
    case 'hoax_indicator_count':
      return context.hoaxIndicatorCount;
    default:
      return undefined;
  }
}

function applyAction(actions: RuleAction, results: RuleResults, rule: VerificationRule): void {
  if (actions.setPriority) {
    results.priorityOverride = actions.setPriority;
  }
  if (actions.requireReview !== undefined) {
    results.forceReview = results.forceReview || actions.requireReview;
  }
  if (actions.reviewPriority !== undefined) {
    results.reviewPriorityOverride = Math.min(
      results.reviewPriorityOverride ?? 10,
      actions.reviewPriority
    );
  }

  results.actions.push({
    action: `rule_applied_${rule.ruleType}`,
    description: `Rule "${rule.name}" applied`,
    executedAt: new Date().toISOString(),
    triggeredByRule: rule.id,
  });
}

// =============================================================================
// PRIORITY BUCKET DETERMINATION
// =============================================================================

function determinePriorityBucket(
  credibilityScore: number,
  casePriority: string,
  hasPhoto: boolean,
  hasLocation: boolean,
  tipsterTier?: string
): TipPriorityBucket {
  // Spam detection
  if (credibilityScore < 20) {
    return 'spam';
  }

  // Critical priority
  if (credibilityScore >= 80 && (casePriority === 'p0_critical' || casePriority === 'p1_high')) {
    return 'critical';
  }

  if (credibilityScore >= 70 && casePriority === 'p0_critical') {
    return 'critical';
  }

  // High priority
  if (credibilityScore >= 70 && ['p0_critical', 'p1_high', 'p2_medium'].includes(casePriority)) {
    return 'high';
  }

  if (credibilityScore >= 60 && (tipsterTier === 'verified_source' || tipsterTier === 'high')) {
    return 'high';
  }

  if (credibilityScore >= 60 && hasPhoto && hasLocation) {
    return 'high';
  }

  // Medium priority
  if (credibilityScore >= 40) {
    return 'medium';
  }

  // Low priority
  return 'low';
}

// =============================================================================
// OVERALL CREDIBILITY CALCULATION
// =============================================================================

function calculateOverallCredibility(
  factors: CredibilityFactor[],
  spamScore: number,
  hoaxCount: number,
  isDuplicate: boolean
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const factor of factors) {
    weightedSum += factor.score * factor.weight;
    totalWeight += factor.weight;
  }

  let score = totalWeight > 0 ? weightedSum / totalWeight : 50;

  // Apply penalties
  if (spamScore > 50) {
    score -= (spamScore - 50) * 0.5;
  }

  if (hoaxCount > 0) {
    score -= hoaxCount * 10;
  }

  if (isDuplicate) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// =============================================================================
// AI SUMMARY GENERATION
// =============================================================================

function generateAISummary(
  tip: TipVerificationInput,
  credibilityScore: number,
  priorityBucket: TipPriorityBucket
): string {
  const priorityLabel = priorityBucket.charAt(0).toUpperCase() + priorityBucket.slice(1);
  const credibilityLabel = credibilityScore >= 70 ? 'high' : credibilityScore >= 40 ? 'moderate' : 'low';

  let summary = `${priorityLabel} priority tip with ${credibilityLabel} credibility (score: ${credibilityScore}). `;

  if (tip.location) {
    summary += `Location: ${tip.location}. `;
  }

  if (tip.sightingDate) {
    const sightingDate = new Date(tip.sightingDate);
    summary += `Sighting reported for ${sightingDate.toLocaleDateString()}. `;
  }

  if (tip.attachments && tip.attachments.length > 0) {
    summary += `${tip.attachments.length} photo(s) attached. `;
  }

  if (tip.isAnonymous) {
    summary += 'Submitted anonymously.';
  }

  return summary;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function getHoursBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}

function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple Jaccard similarity
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  calculateTipsterReliabilityScore,
  analyzeText,
  analyzePhotoMetadata,
  verifyLocation,
  checkTimePlausibility,
  crossReferenceLeads,
  detectDuplicates,
  detectSpamAndHoax,
  determinePriorityBucket,
  calculateOverallCredibility,
};
