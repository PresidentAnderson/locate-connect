/**
 * Cold Case Campaign Detail API
 * GET - Get a specific campaign
 * PATCH - Update campaign
 * DELETE - Delete campaign (only drafts)
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiServerError,
  apiNoContent,
} from '@/lib/api/response';
import type { UpdateCampaignRequest } from '@/types/cold-case.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has LE/admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to law enforcement and administrators');
  }

  // Fetch campaign with relations
  const { data, error } = await supabase
    .from('cold_case_campaigns')
    .select(`
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id,
        anniversary_date,
        became_cold_at,
        total_days_missing
      ),
      case:cases(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        last_seen_city,
        last_seen_province,
        primary_photo_url
      ),
      created_by_user:profiles!cold_case_campaigns_created_by_fkey(
        id,
        first_name,
        last_name,
        email
      ),
      approved_by_user:profiles!cold_case_campaigns_approved_by_fkey(
        id,
        first_name,
        last_name
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return apiNotFound('Campaign not found');
    }
    console.error('Error fetching campaign:', error);
    return apiServerError(error.message);
  }

  return apiSuccess(data);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has LE/admin role and is verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['law_enforcement', 'admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to law enforcement and administrators');
  }

  if (!profile.is_verified) {
    return apiForbidden('Account verification required');
  }

  const body = await request.json() as UpdateCampaignRequest;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Get current campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('cold_case_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (campaignError || !campaign) {
    return apiNotFound('Campaign not found');
  }

  // Handle actions
  if (action === 'approve') {
    if (campaign.status !== 'draft') {
      return apiBadRequest('Only draft campaigns can be approved', 'invalid_status');
    }

    const { data, error } = await supabase
      .from('cold_case_campaigns')
      .update({
        status: 'scheduled',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving campaign:', error);
      return apiServerError(error.message);
    }

    return apiSuccess(data);
  }

  if (action === 'launch') {
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return apiBadRequest('Campaign must be draft or scheduled to launch', 'invalid_status');
    }

    const { data, error } = await supabase
      .from('cold_case_campaigns')
      .update({
        status: 'active',
        actual_start: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error launching campaign:', error);
      return apiServerError(error.message);
    }

    // Update cold case profile if this is an anniversary campaign
    if (campaign.is_anniversary_campaign) {
      await supabase
        .from('cold_case_profiles')
        .update({
          last_anniversary_campaign: new Date().toISOString().split('T')[0],
        })
        .eq('id', campaign.cold_case_profile_id);
    }

    return apiSuccess(data);
  }

  if (action === 'complete') {
    if (campaign.status !== 'active') {
      return apiBadRequest('Only active campaigns can be completed', 'invalid_status');
    }

    const { data, error } = await supabase
      .from('cold_case_campaigns')
      .update({
        status: 'completed',
        actual_end: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error completing campaign:', error);
      return apiServerError(error.message);
    }

    return apiSuccess(data);
  }

  if (action === 'cancel') {
    if (['completed', 'cancelled'].includes(campaign.status)) {
      return apiBadRequest('Campaign cannot be cancelled', 'invalid_status');
    }

    const { data, error } = await supabase
      .from('cold_case_campaigns')
      .update({
        status: 'cancelled',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling campaign:', error);
      return apiServerError(error.message);
    }

    return apiSuccess(data);
  }

  // Regular update
  const updateData: Record<string, unknown> = {};

  if (body.status !== undefined) {
    updateData.status = body.status;
  }
  if (body.actualStart !== undefined) {
    updateData.actual_start = body.actualStart;
  }
  if (body.actualEnd !== undefined) {
    updateData.actual_end = body.actualEnd;
  }
  if (body.actualReach !== undefined) {
    updateData.actual_reach = body.actualReach;
  }
  if (body.actualTipsGenerated !== undefined) {
    updateData.actual_tips_generated = body.actualTipsGenerated;
  }
  if (body.actualShares !== undefined) {
    updateData.actual_shares = body.actualShares;
  }
  if (body.actualLeadsGenerated !== undefined) {
    updateData.actual_leads_generated = body.actualLeadsGenerated;
  }
  if (body.engagementRate !== undefined) {
    updateData.engagement_rate = body.engagementRate;
  }
  if (body.platformMetrics !== undefined) {
    updateData.platform_metrics = body.platformMetrics;
  }
  if (body.budgetSpent !== undefined) {
    updateData.budget_spent = body.budgetSpent;
  }
  if (body.postCampaignAnalysis !== undefined) {
    updateData.post_campaign_analysis = body.postCampaignAnalysis;
  }
  if (body.lessonsLearned !== undefined) {
    updateData.lessons_learned = body.lessonsLearned;
  }

  if (Object.keys(updateData).length === 0) {
    return apiBadRequest('No valid fields to update', 'no_fields');
  }

  const { data, error } = await supabase
    .from('cold_case_campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    return apiServerError(error.message);
  }

  return apiSuccess(data);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return apiForbidden('Access restricted to administrators');
  }

  // Get current campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('cold_case_campaigns')
    .select('status')
    .eq('id', id)
    .single();

  if (campaignError || !campaign) {
    return apiNotFound('Campaign not found');
  }

  // Only allow deleting draft campaigns
  if (campaign.status !== 'draft') {
    return apiBadRequest('Only draft campaigns can be deleted', 'invalid_status');
  }

  const { error } = await supabase
    .from('cold_case_campaigns')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    return apiServerError(error.message);
  }

  return apiNoContent();
}
