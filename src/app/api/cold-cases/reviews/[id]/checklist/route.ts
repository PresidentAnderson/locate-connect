/**
 * Cold Case Review Checklist API
 * GET - Get checklist items for a review
 * PATCH - Update checklist item status
 */

import { createClient } from '@/lib/supabase/server';
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiBadRequest,
  apiNotFound,
  apiServerError,
} from '@/lib/api/response';
import type { UpdateChecklistItemRequest } from '@/types/cold-case.types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id: reviewId } = await params;
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

  // Verify review exists
  const { data: review, error: reviewError } = await supabase
    .from('cold_case_reviews')
    .select('id')
    .eq('id', reviewId)
    .single();

  if (reviewError || !review) {
    return apiNotFound('Review not found');
  }

  // Fetch checklist items
  const { data: items, error } = await supabase
    .from('cold_case_checklist_items')
    .select(`
      *,
      completed_by_user:profiles!cold_case_checklist_items_completed_by_fkey(
        id,
        first_name,
        last_name
      )
    `)
    .eq('review_id', reviewId)
    .order('item_order', { ascending: true });

  if (error) {
    console.error('Error fetching checklist items:', error);
    return apiServerError(error.message);
  }

  // Calculate completion stats
  const total = items?.length || 0;
  const completed = items?.filter(i => i.status === 'completed').length || 0;
  const inProgress = items?.filter(i => i.status === 'in_progress').length || 0;
  const skipped = items?.filter(i => i.status === 'skipped' || i.status === 'not_applicable').length || 0;
  const pending = total - completed - inProgress - skipped;

  return apiSuccess({
    items: items || [],
    stats: {
      total,
      completed,
      inProgress,
      skipped,
      pending,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: reviewId } = await params;
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

  const url = new URL(request.url);
  const itemId = url.searchParams.get('itemId');

  if (!itemId) {
    return apiBadRequest('Item ID is required', 'missing_item_id');
  }

  const body = await request.json() as UpdateChecklistItemRequest;

  if (!body.status) {
    return apiBadRequest('Status is required', 'missing_status');
  }

  // Verify item belongs to this review
  const { data: item, error: itemError } = await supabase
    .from('cold_case_checklist_items')
    .select('id, review_id')
    .eq('id', itemId)
    .eq('review_id', reviewId)
    .single();

  if (itemError || !item) {
    return apiNotFound('Checklist item not found');
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    status: body.status,
  };

  if (body.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
    updateData.completed_by = user.id;
  }

  if (body.resultSummary !== undefined) {
    updateData.result_summary = body.resultSummary;
  }
  if (body.findings !== undefined) {
    updateData.findings = body.findings;
  }
  if (body.actionRequired !== undefined) {
    updateData.action_required = body.actionRequired;
  }
  if (body.actionDescription !== undefined) {
    updateData.action_description = body.actionDescription;
  }
  if (body.notes !== undefined) {
    updateData.notes = body.notes;
  }

  const { data, error } = await supabase
    .from('cold_case_checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating checklist item:', error);
    return apiServerError(error.message);
  }

  return apiSuccess(data);
}
