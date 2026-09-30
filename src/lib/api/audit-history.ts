import type { createClient } from '@/lib/supabase/server';

/**
 * GET /api/audit/change-history/[recordId]
 * Get complete version history for a specific record
 */
export async function getRecordVersionHistory(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  tableName: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from('record_change_history')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('version_number', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}
