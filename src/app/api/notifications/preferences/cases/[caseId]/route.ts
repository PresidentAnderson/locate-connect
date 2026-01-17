import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapCaseNotificationPreferenceFromDb } from '@/types/notification.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('case_notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .eq('case_id', caseId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      id: null,
      userId: user.id,
      caseId,
      enabled: true,
      emailEnabled: undefined,
      smsEnabled: undefined,
      pushEnabled: undefined,
      inAppEnabled: undefined,
      browserEnabled: undefined,
      frequency: undefined,
      notifyStatusUpdates: true,
      notifyNewLeads: true,
      notifyComments: true,
      notifyAssignments: true,
      createdAt: null,
      updatedAt: null,
    });
  }

  return NextResponse.json(mapCaseNotificationPreferenceFromDb(data));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const updateData = {
    user_id: user.id,
    case_id: caseId,
    enabled: body.enabled,
    email_enabled: body.emailEnabled,
    sms_enabled: body.smsEnabled,
    push_enabled: body.pushEnabled,
    in_app_enabled: body.inAppEnabled,
    browser_enabled: body.browserEnabled,
    frequency: body.frequency,
    notify_status_updates: body.notifyStatusUpdates,
    notify_new_leads: body.notifyNewLeads,
    notify_comments: body.notifyComments,
    notify_assignments: body.notifyAssignments,
  };

  const { data, error } = await supabase
    .from('case_notification_preferences')
    .upsert(updateData, { onConflict: 'user_id,case_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapCaseNotificationPreferenceFromDb(data));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('case_notification_preferences')
    .delete()
    .eq('user_id', user.id)
    .eq('case_id', caseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
