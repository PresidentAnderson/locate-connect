import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import AmberAlertCasePage from './page';
const query = vi.hoisted(() => ({ eq: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  from: () => ({ select: () => ({ eq: (field: string, value: string) => {
    query.eq(field, value);
    return { single: async () => ({ data: null, error: null }) };
  } }) }),
}) }));
vi.mock('@/components/alerts/AmberAlertRequestPanel', () => ({ AmberAlertRequestPanel: () => null }));
afterEach(() => vi.unstubAllGlobals());
it('resolves asynchronous route params before querying the case', async () => {
  vi.stubGlobal('React', React);
  await AmberAlertCasePage({ params: Promise.resolve({ caseId: 'case-123' }) });
  expect(query.eq).toHaveBeenCalledWith('id', 'case-123');
});
