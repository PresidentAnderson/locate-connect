import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapNotificationTypePreferenceFromDb, NotificationType } from '@/types/notification.types';

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'case_status_update',
  'new_lead_tip',
  'comment_reply',
  'system_announcement',
  'nearby_case_alert',
  'scheduled_reminder',
];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('notification_type_preferences')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map existing preferences
  const existingPrefs = (data || []).map(mapNotificationTypePreferenceFromDb);
  const existingTypes = new Set(existingPrefs.map((p) => p.notificationType));

  // Add defaults for missing types
  const allPrefs = [...existingPrefs];
  for (const type of ALL_NOTIFICATION_TYPES) {
    if (!existingTypes.has(type)) {
      allPrefs.push({
        id: '',
        userId: user.id,
        notificationType: type,
        enabled: true,
        emailEnabled: undefined,
        smsEnabled: undefined,
        pushEnabled: undefined,
        inAppEnabled: undefined,
        browserEnabled: undefined,
        frequency: undefined,
        createdAt: '',
        updatedAt: '',
      });
    }
  }

  return NextResponse.json(allPrefs);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (!body.notificationType || !ALL_NOTIFICATION_TYPES.includes(body.notificationType)) {
    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
  }

  const updateData = {
    user_id: user.id,
    notification_type: body.notificationType,
    enabled: body.enabled,
    email_enabled: body.emailEnabled,
    sms_enabled: body.smsEnabled,
    push_enabled: body.pushEnabled,
    in_app_enabled: body.inAppEnabled,
    browser_enabled: body.browserEnabled,
    frequency: body.frequency,
  };

  const { data, error } = await supabase
    .from('notification_type_preferences')
    .upsert(updateData, { onConflict: 'user_id,notification_type' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapNotificationTypePreferenceFromDb(data));
}
