import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockEq = vi.fn();

function makeCaseLookupChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(result)),
      })),
    })),
    insert: mockInsert,
  };
}

let mockFromBehavior: (table: string) => unknown;
const mockFrom = vi.fn((table: string) => mockFromBehavior(table));

const mockSupabase = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock auth
const mockAuthenticateRequest = vi.fn();
const mockHasScope = vi.fn();
vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: (...args: unknown[]) => mockAuthenticateRequest(...args),
  hasScope: (...args: unknown[]) => mockHasScope(...args),
}));

// Mock rate limiter
const mockCheckRateLimit = vi.fn();
const mockUpdateRateLimitCounters = vi.fn();
vi.mock('@/lib/api/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  updateRateLimitCounters: (...args: unknown[]) => mockUpdateRateLimitCounters(...args),
}));

vi.mock('../../../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Import under test ────────────────────────────────────────────────────────

import { POST, OPTIONS } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/v1/tips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  case_id: 'case-1',
  content: 'I saw someone matching the description near the park yesterday afternoon',
};

const authenticatedAuth = {
  isAuthenticated: true,
  applicationId: 'app-1',
  accessLevel: 'standard',
  scopes: ['tips:write'],
};

const allowedRateLimit = {
  allowed: true,
  info: { is_allowed: true, minute_remaining: 50, day_remaining: 9000, month_remaining: 90000, retry_after_seconds: 0 },
  headers: { 'X-RateLimit-Remaining': '50' },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/tips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateRateLimitCounters.mockResolvedValue(undefined);
  });

  // ── Authentication ──────────────────────────────────────────────────────

  it('returns 401 when authentication fails', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      isAuthenticated: false,
      error: 'Invalid API key',
      errorCode: 'invalid_key',
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  // ── Authorization (scope check) ─────────────────────────────────────────

  it('returns 403 when tips:write scope is missing', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(false);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  // ── Rate limiting ──────────────────────────────────────────────────────

  it('returns 429 when rate limit is exceeded', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      info: { retry_after_seconds: 30 },
      headers: { 'Retry-After': '30' },
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.success).toBe(false);
  });

  // ── Validation ──────────────────────────────────────────────────────────

  it('returns 400 when case_id is missing', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    const res = await POST(makeRequest({ content: 'Some tip content that is long enough' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('missing_case_id');
  });

  it('returns 400 when content is too short', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    const res = await POST(makeRequest({ case_id: 'case-1', content: 'short' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('invalid_content');
  });

  it('returns 400 when content is empty string', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    const res = await POST(makeRequest({ case_id: 'case-1', content: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
  });

  // ── Case validation ────────────────────────────────────────────────────

  it('returns 400 when the case does not exist', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    mockFromBehavior = () => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'not found' } })),
        })),
      })),
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('case_not_found');
  });

  it('returns 400 when the case is not public', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    mockFromBehavior = () => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'case-1', is_public: false, status: 'active' },
              error: null,
            }),
          ),
        })),
      })),
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('case_not_available');
  });

  it('returns 400 when the case is not active', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    mockFromBehavior = () => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'case-1', is_public: true, status: 'closed' },
              error: null,
            }),
          ),
        })),
      })),
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('case_not_available');
  });

  // ── Successful tip creation ─────────────────────────────────────────────

  it('returns 201 and creates a tip successfully', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    const createdTip = {
      id: 'tip-1',
      case_id: 'case-1',
      is_anonymous: true,
      created_at: '2025-01-01T00:00:00Z',
    };

    // First from('cases') for case lookup, then from('tips') for insert
    let callCount = 0;
    mockFromBehavior = (table: string) => {
      if (table === 'cases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'case-1', is_public: true, status: 'active' },
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      // tips table
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: createdTip, error: null }),
            ),
          })),
        })),
      };
    };

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe('tip-1');
    expect(json.data.message).toContain('submitted successfully');

    // Should update rate limit counters
    expect(mockUpdateRateLimitCounters).toHaveBeenCalledWith('app-1');
  });

  // ── Database error on insert ────────────────────────────────────────────

  it('returns 500 when tip insert fails', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    mockFromBehavior = (table: string) => {
      if (table === 'cases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'case-1', is_public: true, status: 'active' },
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: null, error: { message: 'DB error' } }),
            ),
          })),
        })),
      };
    };

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });

  // ── IP and user-agent extraction ────────────────────────────────────────

  it('extracts x-forwarded-for header for IP address', async () => {
    mockAuthenticateRequest.mockResolvedValue(authenticatedAuth);
    mockHasScope.mockReturnValue(true);
    mockCheckRateLimit.mockResolvedValue(allowedRateLimit);

    const mockTipInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: { id: 'tip-2', case_id: 'case-1', is_anonymous: true, created_at: '2025-01-01' },
            error: null,
          }),
        ),
      })),
    }));

    mockFromBehavior = (table: string) => {
      if (table === 'cases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: { id: 'case-1', is_public: true, status: 'active' },
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      return { insert: mockTipInsert };
    };

    await POST(
      makeRequest(validBody, { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }),
    );

    const insertArg = mockTipInsert.mock.calls[0][0];
    expect(insertArg.ip_address).toBe('192.168.1.1');
  });
});

// ── OPTIONS tests ────────────────────────────────────────────────────────────

describe('OPTIONS /api/v1/tips', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await OPTIONS();

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
