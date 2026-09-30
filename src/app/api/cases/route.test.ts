import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn((_row: Record<string, unknown> & { intake_metadata: { reporter: Record<string, unknown> } | null }) => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));
const mockGetUser = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('@/lib/api/internal-rate-limiter', () => ({
  applyInternalRateLimit: vi.fn(() => null),
}));

// ── Import under test ────────────────────────────────────────────────────────

import { POST } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  firstName: 'Jane',
  lastName: 'Doe',
  lastSeenDate: '2025-01-15',
};

const fakeUser = { id: 'user-abc-123' };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Authentication ──────────────────────────────────────────────────────

  it('returns 401 when the user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(validPayload));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  // ── Validation ──────────────────────────────────────────────────────────

  it('returns 400 when firstName is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const res = await POST(makeRequest({ lastName: 'Doe', lastSeenDate: '2025-01-15' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('firstName');
  });

  it('returns 400 when lastName is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const res = await POST(makeRequest({ firstName: 'Jane', lastSeenDate: '2025-01-15' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('lastName');
  });

  it('returns 400 when lastSeenDate is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const res = await POST(makeRequest({ firstName: 'Jane', lastName: 'Doe' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('lastSeenDate');
  });

  it('returns 400 for invalid lastSeenLocationConfidence', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const res = await POST(
      makeRequest({ ...validPayload, lastSeenLocationConfidence: 'extreme' }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('lastSeenLocationConfidence');
  });

  it('returns 400 for invalid lastSeenWitnessType', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const res = await POST(
      makeRequest({ ...validPayload, lastSeenWitnessType: 'alien' }),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Validation failed');
    expect(json.details).toHaveProperty('lastSeenWitnessType');
  });

  // ── Successful creation ─────────────────────────────────────────────────

  it('returns 201 and creates a case with minimal required fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-1', case_number: 'LC-0001' },
      error: null,
    });

    const res = await POST(makeRequest(validPayload));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toEqual({ id: 'case-1', case_number: 'LC-0001' });

    // Verify Supabase was called with the right table and reporter_id
    expect(mockFrom).toHaveBeenCalledWith('cases');
    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.reporter_id).toBe(fakeUser.id);
    expect(insertArg.first_name).toBe('Jane');
    expect(insertArg.last_name).toBe('Doe');
    expect(insertArg.last_seen_date).toBe('2025-01-15');
  });

  it('passes valid lastSeenLocationConfidence to the insert payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-2', case_number: 'LC-0002' },
      error: null,
    });

    await POST(makeRequest({ ...validPayload, lastSeenLocationConfidence: 'high' }));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.last_seen_location_confidence).toBe('high');
  });

  it('defaults lastSeenLocationConfidence to "unknown" when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-3', case_number: 'LC-0003' },
      error: null,
    });

    await POST(makeRequest(validPayload));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.last_seen_location_confidence).toBe('unknown');
  });

  it('correctly maps optional fields into insert payload', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-4', case_number: 'LC-0004' },
      error: null,
    });

    const fullPayload = {
      ...validPayload,
      dateOfBirth: '1990-05-20',
      gender: 'female',
      heightCm: 165,
      weightKg: 60,
      hairColor: 'brown',
      eyeColor: 'green',
      distinguishingFeatures: 'Scar on left arm',
      lastSeenLocation: 'Toronto, ON',
      circumstances: 'Left home and did not return',
      medicalConditions: ['diabetes'],
      medications: ['insulin'],
      mentalHealthConditions: ['anxiety'],
      isSuicidalRisk: true,
      socialMediaAccounts: [{ platform: 'twitter', handle: '@jane' }],
      threats: [{ name: 'John', relationship: 'ex', description: 'threatened' }],
    };

    await POST(makeRequest(fullPayload));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.date_of_birth).toBe('1990-05-20');
    expect(insertArg.gender).toBe('female');
    expect(insertArg.height_cm).toBe(165);
    expect(insertArg.weight_kg).toBe(60);
    expect(insertArg.hair_color).toBe('brown');
    expect(insertArg.eye_color).toBe('green');
    expect(insertArg.distinguishing_features).toBe('Scar on left arm');
    expect(insertArg.last_seen_location).toBe('Toronto, ON');
    expect(insertArg.circumstances).toBe('Left home and did not return');
    expect(insertArg.medical_conditions).toEqual(['diabetes']);
    expect(insertArg.medications).toEqual(['insulin']);
    expect(insertArg.mental_health_conditions).toEqual(['anxiety']);
    expect(insertArg.is_suicidal_risk).toBe(true);
    expect(insertArg.suspected_foul_play).toBe(true);
    expect(insertArg.social_media_accounts).toEqual([{ platform: 'twitter', handle: '@jane' }]);
  });

  it('sets suspected_foul_play to false when no threats provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-5', case_number: 'LC-0005' },
      error: null,
    });

    await POST(makeRequest(validPayload));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.suspected_foul_play).toBe(false);
  });

  it('builds intake_metadata when reporter info is provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-6', case_number: 'LC-0006' },
      error: null,
    });

    await POST(
      makeRequest({
        ...validPayload,
        reporterFirstName: 'Alice',
        reporterEmail: 'alice@example.com',
      }),
    );

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.intake_metadata).not.toBeNull();
    if (!insertArg.intake_metadata) throw new Error('Expected reporter intake metadata');
    expect(insertArg.intake_metadata.reporter.firstName).toBe('Alice');
    expect(insertArg.intake_metadata.reporter.email).toBe('alice@example.com');
  });

  it('sets intake_metadata to null when no reporter info provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: { id: 'case-7', case_number: 'LC-0007' },
      error: null,
    });

    await POST(makeRequest(validPayload));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.intake_metadata).toBeNull();
  });

  // ── Database error ──────────────────────────────────────────────────────

  it('returns 500 when Supabase insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB connection lost' },
    });

    const res = await POST(makeRequest(validPayload));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('DB connection lost');
  });
});
