import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapNotificationPreferencesFromDb } from '@/types/notification.types';

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
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if no preferences exist
  if (!data) {
    return NextResponse.json({
      id: null,
      userId: user.id,
      notificationsEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      inAppEnabled: true,
      browserEnabled: true,
      emailAddress: user.email,
      phoneNumber: null,
      defaultFrequency: 'immediate',
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      quietHoursTimezone: 'America/Toronto',
      channelPriority: ['in_app', 'push', 'email', 'sms', 'browser'],
      digestTime: '09:00',
      digestDayOfWeek: 1,
      createdAt: null,
      updatedAt: null,
    });
  }

  return NextResponse.json(mapNotificationPreferencesFromDb(data));
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

  const updateData = {
    user_id: user.id,
    notifications_enabled: body.notificationsEnabled,
    email_enabled: body.emailEnabled,
    sms_enabled: body.smsEnabled,
    push_enabled: body.pushEnabled,
    in_app_enabled: body.inAppEnabled,
    browser_enabled: body.browserEnabled,
    email_address: body.emailAddress,
    phone_number: body.phoneNumber,
    default_frequency: body.defaultFrequency,
    quiet_hours_enabled: body.quietHoursEnabled,
    quiet_hours_start: body.quietHoursStart,
    quiet_hours_end: body.quietHoursEnd,
    quiet_hours_timezone: body.quietHoursTimezone,
    channel_priority: body.channelPriority,
    digest_time: body.digestTime,
    digest_day_of_week: body.digestDayOfWeek,
  };

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(updateData, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(mapNotificationPreferencesFromDb(data));
}
