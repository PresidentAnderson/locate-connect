/**
 * Bias Testing API Routes (LC-FEAT-030)
 * Manages bias testing results and mitigation tracking for facial recognition
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BiasTestCategory, BiasTestResult } from '@/types/facial-recognition.types';

/**
 * GET /api/facial-recognition/bias-testing
 * Retrieve bias test results
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

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') as BiasTestCategory | null;
  const aiProvider = searchParams.get('aiProvider');
  const modelVersion = searchParams.get('modelVersion');
  const failedOnly = searchParams.get('failedOnly') === 'true';
  const mitigationRequired = searchParams.get('mitigationRequired') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('bias_test_results')
    .select(`
      *,
      reviewer:profiles!bias_test_results_reviewed_by_fkey(
        id, first_name, last_name, email
      )
    `, { count: 'exact' });

  if (category) {
    query = query.eq('test_category', category);
  }

  if (aiProvider) {
    query = query.eq('ai_provider', aiProvider);
  }

  if (modelVersion) {
    query = query.eq('ai_model_version', modelVersion);
  }

  if (failedOnly) {
    query = query.eq('meets_threshold', false);
  }

  if (mitigationRequired) {
    query = query.eq('mitigation_required', true);
  }

  query = query
    .order('test_date', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching bias test results:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((row) => mapBiasTestResultFromDb(row as Record<string, unknown>));

  return NextResponse.json({
    data: results,
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

/**
 * POST /api/facial-recognition/bias-testing
 * Record a new bias test result
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

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const {
      testName,
      testVersion,
      aiProvider,
      aiModelVersion,
      testCategory,
      testSubcategory,
      testDatasetId,
      sampleSize,
      overallAccuracy,
      falsePositiveRate,
      falseNegativeRate,
      demographicParityScore,
      equalizedOddsScore,
      confusionMatrix,
      performanceBySubgroup,
      baselineAccuracy,
      thresholdUsed = 0.85, // Default 85% accuracy threshold
    } = body as {
      testName: string;
      testVersion: string;
      aiProvider: string;
      aiModelVersion: string;
      testCategory: BiasTestCategory;
      testSubcategory?: string;
      testDatasetId?: string;
      sampleSize: number;
      overallAccuracy?: number;
      falsePositiveRate?: number;
      falseNegativeRate?: number;
      demographicParityScore?: number;
      equalizedOddsScore?: number;
      confusionMatrix?: Record<string, number>;
      performanceBySubgroup?: Record<string, unknown>[];
      baselineAccuracy?: number;
      thresholdUsed?: number;
    };

    // Validate required fields
    if (!testName || !testVersion || !aiProvider || !aiModelVersion || !testCategory || !sampleSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Determine if test passes threshold
    const meetsThreshold = overallAccuracy !== undefined && overallAccuracy >= thresholdUsed;

    // Calculate deviation from baseline if provided
    const deviationFromBaseline = baselineAccuracy && overallAccuracy
      ? overallAccuracy - baselineAccuracy
      : undefined;

    // Determine if mitigation is required
    // Mitigation required if:
    // 1. Test fails threshold, OR
    // 2. Any subgroup has accuracy more than 5% below overall, OR
    // 3. Demographic parity score is below 0.8
    const mitigationRequired = !meetsThreshold ||
      (demographicParityScore !== undefined && demographicParityScore < 0.8) ||
      hasSignificantSubgroupDisparity(performanceBySubgroup, overallAccuracy);

    // Generate mitigation actions if required
    const mitigationActions = mitigationRequired
      ? generateMitigationActions(testCategory, overallAccuracy, performanceBySubgroup)
      : undefined;

    const testRecord = {
      test_name: testName,
      test_version: testVersion,
      test_date: new Date().toISOString(),
      ai_provider: aiProvider,
      ai_model_version: aiModelVersion,
      test_category: testCategory,
      test_subcategory: testSubcategory,
      test_dataset_id: testDatasetId,
      sample_size: sampleSize,
      overall_accuracy: overallAccuracy,
      false_positive_rate: falsePositiveRate,
      false_negative_rate: falseNegativeRate,
      demographic_parity_score: demographicParityScore,
      equalized_odds_score: equalizedOddsScore,
      confusion_matrix: confusionMatrix,
      performance_by_subgroup: performanceBySubgroup,
      baseline_accuracy: baselineAccuracy,
      deviation_from_baseline: deviationFromBaseline,
      meets_threshold: meetsThreshold,
      threshold_used: thresholdUsed,
      mitigation_required: mitigationRequired,
      mitigation_actions: mitigationActions,
    };

    const { data: result, error: dbError } = await supabase
      .from('bias_test_results')
      .insert(testRecord)
      .select()
      .single();

    if (dbError) {
      console.error('Error creating bias test result:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Log audit entry
    await supabase.from('facial_recognition_audit_logs').insert({
      action: 'bias_test_recorded',
      action_category: 'processing',
      user_id: user.id,
      resource_type: 'bias_test_results',
      resource_id: result.id,
      action_details: {
        testName,
        testCategory,
        meetsThreshold,
        mitigationRequired,
      },
      compliance_relevant: true,
      biometric_data_accessed: false,
      personal_data_accessed: false,
    });

    return NextResponse.json({
      data: mapBiasTestResultFromDb(result as Record<string, unknown>),
      alert: mitigationRequired ? {
        level: meetsThreshold ? 'warning' : 'critical',
        message: 'Bias mitigation actions required',
        actions: mitigationActions,
      } : undefined,
    }, { status: 201 });

  } catch (error) {
    console.error('Bias test creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/facial-recognition/bias-testing
 * Update bias test (review, mitigation applied)
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

  // Check admin permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      testId,
      reviewNotes,
      mitigationApplied,
    } = body as {
      testId: string;
      reviewNotes?: string;
      mitigationApplied?: boolean;
    };

    if (!testId) {
      return NextResponse.json({ error: 'testId is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewNotes !== undefined) {
      updates.review_notes = reviewNotes;
    }

    if (mitigationApplied) {
      updates.mitigation_applied_at = new Date().toISOString();
    }

    const { data: result, error: updateError } = await supabase
      .from('bias_test_results')
      .update(updates)
      .eq('id', testId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating bias test:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: mapBiasTestResultFromDb(result as Record<string, unknown>),
    });

  } catch (error) {
    console.error('Bias test update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if any subgroup has significant disparity from overall accuracy
 */
function hasSignificantSubgroupDisparity(
  subgroups?: Record<string, unknown>[],
  overallAccuracy?: number
): boolean {
  if (!subgroups || overallAccuracy === undefined) return false;

  const DISPARITY_THRESHOLD = 0.05; // 5% difference

  return subgroups.some((group) => {
    const groupAccuracy = group.accuracy as number;
    return groupAccuracy !== undefined && (overallAccuracy - groupAccuracy) > DISPARITY_THRESHOLD;
  });
}

/**
 * Generate recommended mitigation actions based on test results
 */
function generateMitigationActions(
  category: BiasTestCategory,
  overallAccuracy?: number,
  subgroups?: Record<string, unknown>[]
): string[] {
  const actions: string[] = [];

  // General actions
  if (overallAccuracy !== undefined && overallAccuracy < 0.85) {
    actions.push('Review and retrain model with more diverse dataset');
    actions.push('Consider switching to a more accurate model version');
  }

  // Category-specific actions
  switch (category) {
    case 'ethnicity':
      actions.push('Augment training data with underrepresented ethnic groups');
      actions.push('Apply data balancing techniques');
      actions.push('Consider ensemble methods with specialized sub-models');
      break;
    case 'age':
      actions.push('Include more samples from underperforming age groups');
      actions.push('Apply age-specific preprocessing techniques');
      break;
    case 'gender':
      actions.push('Balance training data across genders');
      actions.push('Review feature extraction for gender-neutral characteristics');
      break;
    case 'lighting':
      actions.push('Apply lighting normalization preprocessing');
      actions.push('Augment training with varied lighting conditions');
      break;
    case 'angle':
      actions.push('Implement 3D face reconstruction preprocessing');
      actions.push('Train with multi-angle face datasets');
      break;
    case 'resolution':
      actions.push('Implement super-resolution preprocessing for low-res images');
      actions.push('Train with varied resolution images');
      break;
  }

  // Subgroup-specific actions
  if (subgroups) {
    const underperforming = subgroups.filter(
      (g) => (g.accuracy as number) < (overallAccuracy || 0.85) - 0.05
    );

    underperforming.forEach((group) => {
      actions.push(`Focus data collection on ${group.subgroup} subgroup`);
    });
  }

  return actions;
}

/**
 * Map database row to BiasTestResult type
 */
function mapBiasTestResultFromDb(row: Record<string, unknown>): BiasTestResult & { reviewer?: Record<string, unknown> } {
  return {
    id: row.id as string,
    testName: row.test_name as string,
    testVersion: row.test_version as string,
    testDate: row.test_date as string,
    aiProvider: row.ai_provider as string,
    aiModelVersion: row.ai_model_version as string,
    testCategory: row.test_category as BiasTestCategory,
    testSubcategory: row.test_subcategory as string | undefined,
    testDatasetId: row.test_dataset_id as string | undefined,
    sampleSize: row.sample_size as number,
    overallAccuracy: row.overall_accuracy as number | undefined,
    falsePositiveRate: row.false_positive_rate as number | undefined,
    falseNegativeRate: row.false_negative_rate as number | undefined,
    demographicParityScore: row.demographic_parity_score as number | undefined,
    equalizedOddsScore: row.equalized_odds_score as number | undefined,
    confusionMatrix: row.confusion_matrix as BiasTestResult['confusionMatrix'],
    performanceBySubgroup: row.performance_by_subgroup as BiasTestResult['performanceBySubgroup'],
    baselineAccuracy: row.baseline_accuracy as number | undefined,
    deviationFromBaseline: row.deviation_from_baseline as number | undefined,
    meetsThreshold: row.meets_threshold as boolean,
    thresholdUsed: row.threshold_used as number | undefined,
    mitigationRequired: row.mitigation_required as boolean,
    mitigationActions: row.mitigation_actions as string[] | undefined,
    mitigationAppliedAt: row.mitigation_applied_at as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    reviewNotes: row.review_notes as string | undefined,
    createdAt: row.created_at as string,
    reviewer: row.reviewer as Record<string, unknown> | undefined,
  };
}
