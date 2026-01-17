import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiSuccess, apiBadRequest, apiUnauthorized, apiServerError, apiCreated } from '@/lib/api/response';
import type { CreateSupportTicketInput } from '@/types';

/**
 * GET /api/developer/support/tickets
 * List support tickets for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('submitter_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Tickets fetch error:', error);
      return apiServerError('Failed to fetch tickets');
    }

    return apiSuccess(data, {
      total: count || 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error) {
    console.error('Tickets API error:', error);
    return apiServerError('Internal server error');
  }
}

/**
 * POST /api/developer/support/tickets
 * Create a new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiUnauthorized('Authentication required');
    }

    const body: CreateSupportTicketInput = await request.json();

    // Validate required fields
    if (!body.subject || body.subject.trim().length < 5) {
      return apiBadRequest('Subject must be at least 5 characters', 'invalid_subject');
    }

    if (!body.description || body.description.trim().length < 20) {
      return apiBadRequest('Description must be at least 20 characters', 'invalid_description');
    }

    if (!body.category) {
      return apiBadRequest('Category is required', 'missing_category');
    }

    const validCategories = ['api_issue', 'feature_request', 'documentation', 'billing', 'other'];
    if (!validCategories.includes(body.category)) {
      return apiBadRequest('Invalid category', 'invalid_category');
    }

    // Create the ticket
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        submitter_id: user.id,
        application_id: body.application_id || null,
        subject: body.subject.trim(),
        description: body.description.trim(),
        category: body.category,
        priority: body.priority || 'medium',
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Ticket creation error:', error);
      return apiServerError('Failed to create ticket');
    }

    return apiCreated(data);
  } catch (error) {
    console.error('Tickets API error:', error);
    return apiServerError('Internal server error');
  }
}
