import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockContains = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();

// Build a chainable query object for GET tests
function makeChainableQuery(resolvedData: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.contains = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.lte = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.range = vi.fn(() => Promise.resolve(resolvedData));
  chain.single = vi.fn(() => Promise.resolve(resolvedData));
  chain.insert = vi.fn(() => chain);
  return chain;
}

let mockFromBehavior: (table: string) => Record<string, unknown>;
const mockFrom = vi.fn((table: string) => mockFromBehavior(table));

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('../../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Import under test ────────────────────────────────────────────────────────

import { GET, POST } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/success-stories');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/success-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeUser = { id: 'user-123' };

// ── GET tests ────────────────────────────────────────────────────────────────

describe('GET /api/success-stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns published public stories for unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const storyRow = {
      id: 's-1',
      case_id: 'c-1',
      title: 'A Story',
      summary: 'Summary',
      status: 'published',
      visibility: 'public',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    };

    const chain = makeChainableQuery({ data: [storyRow], error: null, count: 1 });
    mockFromBehavior = () => chain;

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.stories).toHaveLength(1);
    expect(json.stories[0].id).toBe('s-1');
    expect(json.total).toBe(1);

    // Should apply public-only filter
    expect(chain.eq).toHaveBeenCalledWith('status', 'published');
    expect(chain.eq).toHaveBeenCalledWith('visibility', 'public');
  });

  it('allows admin/law_enforcement to see all stories', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const storiesChain = makeChainableQuery({ data: [], error: null, count: 0 });
    const profileChain = makeChainableQuery({
      data: { role: 'admin' },
      error: null,
    });

    mockFromBehavior = (table: string) => {
      if (table === 'profiles') return profileChain;
      return storiesChain;
    };

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.stories).toEqual([]);
    // Admin should NOT have the public-only eq filters applied via .or
    expect(storiesChain.or).not.toHaveBeenCalled();
  });

  it('regular users see published stories and their own drafts', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const storiesChain = makeChainableQuery({ data: [], error: null, count: 0 });
    const profileChain = makeChainableQuery({
      data: { role: 'volunteer' },
      error: null,
    });

    mockFromBehavior = (table: string) => {
      if (table === 'profiles') return profileChain;
      return storiesChain;
    };

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    expect(storiesChain.or).toHaveBeenCalledWith(
      `status.eq.published,created_by.eq.${fakeUser.id}`,
    );
  });

  it('applies featuredOnly filter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const chain = makeChainableQuery({ data: [], error: null, count: 0 });
    mockFromBehavior = () => chain;

    await GET(makeGetRequest({ featuredOnly: 'true' }));

    expect(chain.eq).toHaveBeenCalledWith('featured_on_homepage', true);
  });

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const chain = makeChainableQuery({ data: null, error: { message: 'DB down' }, count: null });
    mockFromBehavior = () => chain;

    const res = await GET(makeGetRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('DB down');
  });

  it('respects pagination parameters', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const chain = makeChainableQuery({ data: [], error: null, count: 0 });
    mockFromBehavior = () => chain;

    await GET(makeGetRequest({ page: '2', pageSize: '5' }));

    // page=2, pageSize=5 => offset=5, range(5, 9)
    expect(chain.range).toHaveBeenCalledWith(5, 9);
  });

  it('caps pageSize at 50', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const chain = makeChainableQuery({ data: [], error: null, count: 0 });
    mockFromBehavior = () => chain;

    await GET(makeGetRequest({ page: '1', pageSize: '100' }));

    // Should be capped to 50 => range(0, 49)
    expect(chain.range).toHaveBeenCalledWith(0, 49);
  });
});

// ── POST tests ───────────────────────────────────────────────────────────────

describe('POST /api/success-stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makePostRequest({ caseId: 'c-1', title: 'T', summary: 'S' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 401 when auth returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const res = await POST(makePostRequest({ caseId: 'c-1', title: 'T', summary: 'S' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const res = await POST(makePostRequest({ caseId: 'c-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 404 when the case does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const casesChain = makeChainableQuery({
      data: null,
      error: { message: 'not found' },
    });

    mockFromBehavior = () => casesChain;

    const res = await POST(
      makePostRequest({ caseId: 'nonexistent', title: 'T', summary: 'S' }),
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Case not found');
  });

  it('returns 403 when user is not staff and not case owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const casesChain = makeChainableQuery({
      data: { id: 'c-1', reporter_id: 'other-user', status: 'resolved', disposition: 'found' },
      error: null,
    });

    const profileChain = makeChainableQuery({
      data: { role: 'volunteer' },
      error: null,
    });

    mockFromBehavior = (table: string) => {
      if (table === 'profiles') return profileChain;
      return casesChain;
    };

    const res = await POST(
      makePostRequest({ caseId: 'c-1', title: 'T', summary: 'S' }),
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('do not have permission');
  });

  it('returns 400 when case is not resolved or closed', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const casesChain = makeChainableQuery({
      data: { id: 'c-1', reporter_id: fakeUser.id, status: 'active', disposition: null },
      error: null,
    });

    const profileChain = makeChainableQuery({
      data: { role: 'volunteer' },
      error: null,
    });

    mockFromBehavior = (table: string) => {
      if (table === 'profiles') return profileChain;
      return casesChain;
    };

    const res = await POST(
      makePostRequest({ caseId: 'c-1', title: 'T', summary: 'S' }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('resolved or closed');
  });

  it('returns 201 and creates a story when case owner submits for resolved case', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const createdStory = {
      id: 'story-1',
      case_id: 'c-1',
      title: 'Found Safe',
      summary: 'A happy ending',
      status: 'draft',
      created_by: fakeUser.id,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };

    const casesChain = makeChainableQuery({
      data: { id: 'c-1', reporter_id: fakeUser.id, status: 'resolved', disposition: 'found_safe' },
      error: null,
    });

    const profileChain = makeChainableQuery({
      data: { role: 'volunteer' },
      error: null,
    });

    const insertChain = makeChainableQuery({
      data: createdStory,
      error: null,
    });

    const auditChain = makeChainableQuery({ data: null, error: null });

    const fromCallCount = 0;
    mockFromBehavior = (table: string) => {
      if (table === 'cases') return casesChain;
      if (table === 'profiles') return profileChain;
      if (table === 'success_stories') return insertChain;
      if (table === 'comprehensive_audit_logs') return auditChain;
      return casesChain;
    };

    const res = await POST(
      makePostRequest({ caseId: 'c-1', title: 'Found Safe', summary: 'A happy ending' }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe('story-1');
    expect(json.title).toBe('Found Safe');
    expect(json.status).toBe('draft');
  });

  it('allows admin to create a story for any resolved case', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const casesChain = makeChainableQuery({
      data: { id: 'c-2', reporter_id: 'someone-else', status: 'closed', disposition: 'found' },
      error: null,
    });

    const profileChain = makeChainableQuery({
      data: { role: 'admin' },
      error: null,
    });

    const insertChain = makeChainableQuery({
      data: {
        id: 'story-2',
        case_id: 'c-2',
        title: 'Admin Story',
        summary: 'Summary',
        status: 'draft',
        created_by: fakeUser.id,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      error: null,
    });

    const auditChain = makeChainableQuery({ data: null, error: null });

    mockFromBehavior = (table: string) => {
      if (table === 'cases') return casesChain;
      if (table === 'profiles') return profileChain;
      if (table === 'success_stories') return insertChain;
      if (table === 'comprehensive_audit_logs') return auditChain;
      return casesChain;
    };

    const res = await POST(
      makePostRequest({ caseId: 'c-2', title: 'Admin Story', summary: 'Summary' }),
    );

    expect(res.status).toBe(201);
  });

  it('returns 500 when Supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    const casesChain = makeChainableQuery({
      data: { id: 'c-1', reporter_id: fakeUser.id, status: 'resolved', disposition: 'found' },
      error: null,
    });

    const profileChain = makeChainableQuery({
      data: { role: 'volunteer' },
      error: null,
    });

    const insertChain = makeChainableQuery({
      data: null,
      error: { message: 'Unique constraint violation' },
    });

    mockFromBehavior = (table: string) => {
      if (table === 'cases') return casesChain;
      if (table === 'profiles') return profileChain;
      if (table === 'success_stories') return insertChain;
      return casesChain;
    };

    const res = await POST(
      makePostRequest({ caseId: 'c-1', title: 'T', summary: 'S' }),
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Unique constraint violation');
  });
});
