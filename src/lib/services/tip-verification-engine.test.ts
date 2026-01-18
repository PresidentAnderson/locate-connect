import { describe, it, expect } from 'vitest';
import {
  calculateTipsterReliabilityScore,
  analyzeText,
  verifyLocation,
  checkTimePlausibility,
  crossReferenceLeads,
  detectDuplicates,
  detectSpamAndHoax,
  determinePriorityBucket,
  calculateOverallCredibility,
} from './tip-verification-engine';
import type { TipsterProfile, TipVerificationInput, ScamPattern, CredibilityFactor } from '@/types/tip-verification.types';

describe('Tip Verification Engine', () => {
  describe('calculateTipsterReliabilityScore', () => {
    it('should return 50 for unknown/new tipsters', () => {
      const score = calculateTipsterReliabilityScore(undefined);
      expect(score).toBe(50);
    });

    it('should return 0 for blocked tipsters', () => {
      const profile: TipsterProfile = {
        id: '1',
        isBlocked: true,
        blockedReason: 'Spam',
        reliabilityTier: 'low',
        reliabilityScore: 70,
        totalTips: 10,
        verifiedTips: 5,
        partiallyVerifiedTips: 2,
        falseTips: 1,
        spamTips: 2,
        tipsLeadingToResolution: 0,
        providesPhotos: true,
        providesDetailedInfo: true,
        consistentLocationReporting: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const score = calculateTipsterReliabilityScore(profile);
      expect(score).toBe(0);
    });

    it('should add bonuses for good behavior', () => {
      const baseProfile: TipsterProfile = {
        id: '1',
        isBlocked: false,
        reliabilityTier: 'moderate',
        reliabilityScore: 60,
        totalTips: 10,
        verifiedTips: 5,
        partiallyVerifiedTips: 2,
        falseTips: 0,
        spamTips: 0,
        tipsLeadingToResolution: 1,
        providesPhotos: false,
        providesDetailedInfo: false,
        consistentLocationReporting: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const profileWithBonuses: TipsterProfile = {
        ...baseProfile,
        providesPhotos: true,
        providesDetailedInfo: true,
        consistentLocationReporting: true,
      };

      const baseScore = calculateTipsterReliabilityScore(baseProfile);
      const bonusScore = calculateTipsterReliabilityScore(profileWithBonuses);

      expect(bonusScore).toBe(baseScore + 15); // 5 + 5 + 5
    });

    it('should apply penalty for spam history', () => {
      const profileNoSpam: TipsterProfile = {
        id: '1',
        isBlocked: false,
        reliabilityTier: 'moderate',
        reliabilityScore: 60,
        totalTips: 10,
        verifiedTips: 5,
        partiallyVerifiedTips: 2,
        falseTips: 0,
        spamTips: 0,
        tipsLeadingToResolution: 0,
        providesPhotos: false,
        providesDetailedInfo: false,
        consistentLocationReporting: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const profileWithSpam: TipsterProfile = {
        ...profileNoSpam,
        spamTips: 3,
      };

      const noSpamScore = calculateTipsterReliabilityScore(profileNoSpam);
      const spamScore = calculateTipsterReliabilityScore(profileWithSpam);

      expect(spamScore).toBe(noSpamScore - 15); // 3 spam * 5 penalty
    });

    it('should cap score between 0 and 100', () => {
      const highScoreProfile: TipsterProfile = {
        id: '1',
        isBlocked: false,
        reliabilityTier: 'verified_source',
        reliabilityScore: 95,
        totalTips: 100,
        verifiedTips: 90,
        partiallyVerifiedTips: 5,
        falseTips: 0,
        spamTips: 0,
        tipsLeadingToResolution: 10,
        providesPhotos: true,
        providesDetailedInfo: true,
        consistentLocationReporting: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const score = calculateTipsterReliabilityScore(highScoreProfile);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeText', () => {
    it('should return higher score for detailed text', () => {
      const shortText = 'I saw someone.';
      const detailedText = `I definitely saw the missing person yesterday morning around 9:30 AM near the
        intersection of Main Street and Oak Avenue. They were wearing a blue jacket and jeans,
        had brown hair, and appeared to be walking towards the shopping mall. The person matched
        the description with the same height and build as shown in the photo.`;

      const shortAnalysis = analyzeText(shortText);
      const detailedAnalysis = analyzeText(detailedText);

      expect(detailedAnalysis.score).toBeGreaterThan(shortAnalysis.score);
      expect(detailedAnalysis.detailRichness).toBeGreaterThan(shortAnalysis.detailRichness);
    });

    it('should detect specific details in text', () => {
      const textWithDetails = `I saw them on January 15th at 3:30 PM near the corner of 5th street.
        They were wearing a red shirt and glasses.`;

      const analysis = analyzeText(textWithDetails);
      expect(analysis.detailRichness).toBeGreaterThan(50);
    });

    it('should penalize all-caps text', () => {
      const normalText = 'I saw the person near the park yesterday.';
      const capsText = 'I SAW THE PERSON NEAR THE PARK YESTERDAY.';

      const normalAnalysis = analyzeText(normalText);
      const capsAnalysis = analyzeText(capsText);

      expect(capsAnalysis.coherence).toBeLessThan(normalAnalysis.coherence);
    });

    it('should return sentiment score between -1 and 1', () => {
      const certainText = 'I definitely saw them, I am certain it was the person.';
      const uncertainText = 'I think maybe I might have possibly seen someone.';

      const certainAnalysis = analyzeText(certainText);
      const uncertainAnalysis = analyzeText(uncertainText);

      expect(certainAnalysis.sentiment).toBeGreaterThanOrEqual(-1);
      expect(certainAnalysis.sentiment).toBeLessThanOrEqual(1);
      expect(uncertainAnalysis.sentiment).toBeGreaterThanOrEqual(-1);
      expect(uncertainAnalysis.sentiment).toBeLessThanOrEqual(1);
    });

    it('should return score capped at 0-100', () => {
      const analysis = analyzeText('Some text');
      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(analysis.score).toBeLessThanOrEqual(100);
    });
  });

  describe('verifyLocation', () => {
    const baseCaseData = {
      id: 'case-1',
      priorityLevel: 'p1_high',
      lastSeenLatitude: 45.5017,
      lastSeenLongitude: -73.5673,
      lastSeenDate: '2026-01-15T10:00:00Z',
      firstName: 'John',
      lastName: 'Doe',
      status: 'active',
    };

    it('should return low score when no location is provided', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = verifyLocation(tip, baseCaseData);
      expect(result.score).toBe(30);
      expect(result.description).toContain('No location');
    });

    it('should return moderate score for text-only location', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        location: 'Near the downtown area',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = verifyLocation(tip, baseCaseData);
      expect(result.score).toBe(40);
      expect(result.description).toContain('Text-based location');
    });

    it('should return higher score for GPS coordinates near last seen location', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        latitude: 45.5020,
        longitude: -73.5670,
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = verifyLocation(tip, baseCaseData);
      expect(result.score).toBeGreaterThan(60);
      expect(result.distance).toBeDefined();
      expect(result.distance).toBeLessThan(1); // Less than 1km
    });

    it('should detect impossible timeline based on distance', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        latitude: 48.8566, // Paris
        longitude: 2.3522,
        sightingDate: '2026-01-15T12:00:00Z', // 2 hours after last seen
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = verifyLocation(tip, baseCaseData);
      expect(result.hoaxIndicators).toContain('impossible_timeline');
    });
  });

  describe('checkTimePlausibility', () => {
    const baseCaseData = {
      id: 'case-1',
      priorityLevel: 'p1_high',
      lastSeenLatitude: 45.5017,
      lastSeenLongitude: -73.5673,
      lastSeenDate: '2026-01-15T10:00:00Z',
      firstName: 'John',
      lastName: 'Doe',
      status: 'active',
    };

    it('should return moderate score when no sighting date is provided', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = checkTimePlausibility(tip, baseCaseData);
      expect(result.score).toBe(40);
      expect(result.travelFeasible).toBe(true);
    });

    it('should reject sighting before disappearance', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        sightingDate: '2026-01-14T10:00:00Z', // Before last seen
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = checkTimePlausibility(tip, baseCaseData);
      expect(result.score).toBe(10);
      expect(result.hoaxIndicators).toContain('impossible_timeline');
      expect(result.description).toContain('before disappearance');
    });

    it('should reject sighting in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        sightingDate: futureDate.toISOString(),
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = checkTimePlausibility(tip, baseCaseData);
      expect(result.score).toBe(10);
      expect(result.hoaxIndicators).toContain('impossible_timeline');
      expect(result.description).toContain('in the future');
    });

    it('should give bonus for recent sightings', () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 12);

      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        sightingDate: recentDate.toISOString(),
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = checkTimePlausibility(tip, baseCaseData);
      expect(result.score).toBeGreaterThan(60);
      expect(result.description).toContain('24 hours');
    });
  });

  describe('crossReferenceLeads', () => {
    it('should detect matching leads by proximity', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        latitude: 45.5020,
        longitude: -73.5670,
        isAnonymous: false,
        caseId: 'case-1',
      };

      const existingLeads = [
        {
          id: 'lead-1',
          latitude: 45.5022,
          longitude: -73.5668,
          status: 'active',
        },
        {
          id: 'lead-2',
          latitude: 48.8566, // Far away
          longitude: 2.3522,
          status: 'active',
        },
      ];

      const result = crossReferenceLeads(tip, existingLeads);
      expect(result.matchingLeadIds).toContain('lead-1');
      expect(result.matchingLeadIds).not.toContain('lead-2');
      expect(result.score).toBeGreaterThan(50);
    });

    it('should return base score when no leads match', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        latitude: 45.5020,
        longitude: -73.5670,
        isAnonymous: false,
        caseId: 'case-1',
      };

      const existingLeads = [
        {
          id: 'lead-1',
          latitude: 48.8566,
          longitude: 2.3522,
          status: 'active',
        },
      ];

      const result = crossReferenceLeads(tip, existingLeads);
      expect(result.matchingLeadIds).toHaveLength(0);
      expect(result.score).toBe(50);
    });

    it('should detect matching locations by text similarity', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I saw someone',
        location: 'Central Park near the main fountain area',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const existingLeads = [
        {
          id: 'lead-1',
          location: 'Central Park area near the main fountain',
          status: 'active',
        },
      ];

      const result = crossReferenceLeads(tip, existingLeads);
      expect(result.matchesKnownLocations).toBe(true);
    });
  });

  describe('detectDuplicates', () => {
    it('should detect duplicate tips by content similarity', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-new',
        content: 'I saw the missing person at the grocery store on Main Street yesterday afternoon.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const existingTips = [
        {
          id: 'tip-1',
          content: 'I saw the missing person at the grocery store on Main Street yesterday afternoon.',
          createdAt: '2026-01-15T10:00:00Z',
        },
        {
          id: 'tip-2',
          content: 'Completely different tip about something else entirely.',
          createdAt: '2026-01-15T10:00:00Z',
        },
      ];

      const result = detectDuplicates(tip, existingTips);
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateIds).toContain('tip-1');
      expect(result.duplicateIds).not.toContain('tip-2');
    });

    it('should not flag non-duplicate tips', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-new',
        content: 'I spotted the person near the library yesterday evening.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const existingTips = [
        {
          id: 'tip-1',
          content: 'Someone was seen at the park this morning.',
          createdAt: '2026-01-15T10:00:00Z',
        },
      ];

      const result = detectDuplicates(tip, existingTips);
      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toHaveLength(0);
    });
  });

  describe('detectSpamAndHoax', () => {
    it('should detect common spam phrases', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I have information about the missing person. Please wire money to my account to receive it.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = detectSpamAndHoax(tip, []);
      expect(result.spamScore).toBeGreaterThan(0);
      expect(result.hoaxIndicators).toContain('spam_signature');
    });

    it('should detect multiple spam phrases', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'Send bitcoin or gift card to claim your lottery reward for the inheritance.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = detectSpamAndHoax(tip, []);
      expect(result.spamScore).toBeGreaterThan(60);
    });

    it('should match custom scam patterns', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I have special psychic powers that tell me where the person is.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const scamPatterns: ScamPattern[] = [
        {
          id: 'pattern-1',
          name: 'Psychic scam',
          patternType: 'text',
          patternData: {
            keywords: ['psychic powers', 'vision', 'supernatural'],
          },
          confidenceThreshold: 0.8,
          timesDetected: 5,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = detectSpamAndHoax(tip, scamPatterns);
      expect(result.hoaxIndicators).toContain('known_scam_pattern');
      expect(result.spamScore).toBeGreaterThan(0);
    });

    it('should penalize very short content', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'Saw them',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const result = detectSpamAndHoax(tip, []);
      expect(result.spamScore).toBeGreaterThanOrEqual(10);
    });

    it('should ignore inactive patterns', () => {
      const tip: TipVerificationInput = {
        tipId: 'tip-1',
        content: 'I have psychic powers.',
        isAnonymous: false,
        caseId: 'case-1',
      };

      const scamPatterns: ScamPattern[] = [
        {
          id: 'pattern-1',
          name: 'Psychic scam',
          patternType: 'text',
          patternData: {
            keywords: ['psychic powers'],
          },
          confidenceThreshold: 0.8,
          timesDetected: 5,
          isActive: false, // Inactive
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = detectSpamAndHoax(tip, scamPatterns);
      expect(result.hoaxIndicators).not.toContain('known_scam_pattern');
    });
  });

  describe('determinePriorityBucket', () => {
    it('should return spam for very low credibility scores', () => {
      const bucket = determinePriorityBucket(15, 'p2_medium', false, false, 'low');
      expect(bucket).toBe('spam');
    });

    it('should return critical for high credibility on critical cases', () => {
      const bucket = determinePriorityBucket(85, 'p0_critical', true, true, 'high');
      expect(bucket).toBe('critical');
    });

    it('should return critical for 70+ credibility on critical cases', () => {
      const bucket = determinePriorityBucket(75, 'p0_critical', false, false, 'moderate');
      expect(bucket).toBe('critical');
    });

    it('should return high for verified source tipsters with moderate credibility', () => {
      const bucket = determinePriorityBucket(65, 'p2_medium', false, false, 'verified_source');
      expect(bucket).toBe('high');
    });

    it('should return high for tips with photo and location', () => {
      const bucket = determinePriorityBucket(62, 'p2_medium', true, true, 'moderate');
      expect(bucket).toBe('high');
    });

    it('should return medium for moderate credibility', () => {
      const bucket = determinePriorityBucket(50, 'p2_medium', false, false, 'moderate');
      expect(bucket).toBe('medium');
    });

    it('should return low for low credibility', () => {
      const bucket = determinePriorityBucket(30, 'p3_low', false, false, 'low');
      expect(bucket).toBe('low');
    });
  });

  describe('calculateOverallCredibility', () => {
    it('should calculate weighted average of factors', () => {
      const factors: CredibilityFactor[] = [
        { factor: 'tipster', score: 80, weight: 0.2, description: '', source: 'pattern_matching' },
        { factor: 'text', score: 60, weight: 0.3, description: '', source: 'text_sentiment' },
        { factor: 'location', score: 70, weight: 0.5, description: '', source: 'geolocation' },
      ];

      // Expected: (80*0.2 + 60*0.3 + 70*0.5) / 1.0 = 16 + 18 + 35 = 69
      const score = calculateOverallCredibility(factors, 0, 0, false);
      expect(score).toBe(69);
    });

    it('should apply spam penalty', () => {
      const factors: CredibilityFactor[] = [
        { factor: 'text', score: 70, weight: 1.0, description: '', source: 'text_sentiment' },
      ];

      const noSpam = calculateOverallCredibility(factors, 0, 0, false);
      const withSpam = calculateOverallCredibility(factors, 60, 0, false);

      expect(withSpam).toBeLessThan(noSpam);
      expect(noSpam - withSpam).toBe(5); // (60-50) * 0.5 = 5
    });

    it('should apply hoax indicator penalty', () => {
      const factors: CredibilityFactor[] = [
        { factor: 'text', score: 70, weight: 1.0, description: '', source: 'text_sentiment' },
      ];

      const noHoax = calculateOverallCredibility(factors, 0, 0, false);
      const withHoax = calculateOverallCredibility(factors, 0, 2, false);

      expect(withHoax).toBeLessThan(noHoax);
      expect(noHoax - withHoax).toBe(20); // 2 * 10
    });

    it('should apply duplicate penalty', () => {
      const factors: CredibilityFactor[] = [
        { factor: 'text', score: 70, weight: 1.0, description: '', source: 'text_sentiment' },
      ];

      const noDuplicate = calculateOverallCredibility(factors, 0, 0, false);
      const isDuplicate = calculateOverallCredibility(factors, 0, 0, true);

      expect(isDuplicate).toBeLessThan(noDuplicate);
      expect(noDuplicate - isDuplicate).toBe(20);
    });

    it('should cap score between 0 and 100', () => {
      const highFactors: CredibilityFactor[] = [
        { factor: 'text', score: 100, weight: 1.0, description: '', source: 'text_sentiment' },
      ];

      const lowFactors: CredibilityFactor[] = [
        { factor: 'text', score: 20, weight: 1.0, description: '', source: 'text_sentiment' },
      ];

      const highScore = calculateOverallCredibility(highFactors, 0, 0, false);
      const lowScore = calculateOverallCredibility(lowFactors, 80, 5, true);

      expect(highScore).toBeLessThanOrEqual(100);
      expect(lowScore).toBeGreaterThanOrEqual(0);
    });

    it('should return 50 when no factors provided', () => {
      const score = calculateOverallCredibility([], 0, 0, false);
      expect(score).toBe(50);
    });
  });
});
