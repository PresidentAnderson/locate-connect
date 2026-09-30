import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Match the verified staff policy used by the tip-verification review API. */
export async function requireComplianceVerifier(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();
  if (
    profileError || !profile || !profile.is_verified ||
    !['law_enforcement', 'admin', 'developer'].includes(profile.role)
  ) {
    return { error: NextResponse.json({ error: 'Verified staff account required' }, { status: 403 }) };
  }
  return { userId: user.id };
}
