import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
      data: { is_active: true, redirect_uris: ['https://app.example/callback'],
        api_applications: { name: '<script>alert(1)</script>', logo_url: 'javascript:alert(1)' } },
      error: null,
    }) }) }) }),
    auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) },
  }),
}));

it('renders attacker-controlled OAuth fields as inert text', async () => {
  const url = new URL('https://locate.example/api/developer/oauth/authorize');
  url.searchParams.set('client_id', 'client');
  url.searchParams.set('redirect_uri', 'https://app.example/callback');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', '"><script>alert(2)</script>');
  const response = await GET(new NextRequest(url));
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
});
