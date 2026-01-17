import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapCaseNotificationPreferenceFromDb } from '@/types/notification.types';

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
    .from('case_notification_preferences')
    .select(`
      *,
      cases:case_id (
        id,
        case_number,
        missing_person_name,
        status
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (data || []).map((row) => ({
    ...mapCaseNotificationPreferenceFromDb(row),
    case: row.cases,
  }));

  return NextResponse.json(result);
}
