import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

interface ChainResult {
  data: unknown;
  error: unknown;
}

function makeChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.then = (resolve: (v: ChainResult) => void) => resolve(result);
  // Make it thenable (Promise-like) so await works
  return chain;
}

function makePromiseChain(result: ChainResult) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  // Return the result when awaited via Promise.all
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' });
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: ChainResult) => void) => Promise.resolve(result).then(resolve),
  });
  Object.defineProperty(chain, 'catch', {
    value: (reject: (e: unknown) => void) => Promise.resolve(result).catch(reject),
  });
  return chain;
}

const defaultCasesResult: ChainResult = {
  data: [
    {
      id: 'c-1',
      status: 'active',
      priority_level: 'p1_high',
      primary_investigator_id: 'inv-1',
      created_at: '2025-01-01',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c-2',
      status: 'active',
      priority_level: 'p0_critical',
      primary_investigator_id: null,
      created_at: '2025-01-02',
      updated_at: '2024-01-01', // overdue (older than 48h)
    },
  ],
  error: null,
};

const defaultAgentQueueResult: ChainResult = {
  data: [
    {
      id: 'aq-1',
      user_id: 'u-1',
      status: 'online',
      current_case_id: 'c-1',
      active_cases_count: 3,
      pending_leads_count: 2,
      pending_tips_count: 5,
      max_capacity: 10,
      utilization_percentage: 30,
      last_activity_at: '2025-01-01',
      session_started_at: '2025-01-01',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      profiles: {
        id: 'u-1',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        avatar_url: null,
      },
      cases: {
        id: 'c-1',
        case_number: 'LC-0001',
        first_name: 'Jane',
        last_name: 'Doe',
      },
    },
  ],
  error: null,
};

const defaultIntegrationResult: ChainResult = { data: [], error: null };
const defaultStaffResult: ChainResult = { data: [], error: null };
const defaultSLAResult: ChainResult = { data: [], error: null };
const defaultBottlenecksResult: ChainResult = { data: [], error: null };

let tableResults: Record<string, ChainResult>;

const mockGetUser = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'profiles') {
    // Profile lookup returns a single-result chain
    const profileResult = tableResults[table] || { data: { role: 'admin' }, error: null };
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn(() => Promise.resolve(profileResult));
    return chain;
  }
  const result = tableResults[table] || { data: [], error: null };
  return makePromiseChain(result);
});

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('../../../../lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// ── Import under test ────────────────────────────────────────────────────────

import { GET } from './route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/dashboard/operations');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/dashboard/operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    tableResults = {
      cases: defaultCasesResult,
      agent_queue_status: defaultAgentQueueResult,
      integration_health: defaultIntegrationResult,
      staff_productivity: defaultStaffResult,
      sla_compliance: defaultSLAResult,
      bottleneck_tracking: defaultBottlenecksResult,
      profiles: { data: { role: 'admin' }, error: null },
    };
  });

  it('returns 200 with complete dashboard data structure', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toHaveProperty('activeWorkload');
    expect(json).toHaveProperty('agentQueue');
    expect(json).toHaveProperty('integrationHealth');
    expect(json).toHaveProperty('staffProductivity');
    expect(json).toHaveProperty('slaCompliance');
    expect(json).toHaveProperty('bottlenecks');
  });

  it('correctly calculates active workload stats', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.activeWorkload.totalActiveCases).toBe(2);
    expect(json.activeWorkload.unassignedCases).toBe(1); // c-2 has no investigator
    expect(json.activeWorkload.overdueCases).toBe(1); // c-2 updated in 2024
  });

  it('groups cases by priority level', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    const byPriority = json.activeWorkload.byPriority;
    expect(byPriority).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ priority: 'P0 Critical', count: 1 }),
        expect.objectContaining({ priority: 'P1 High', count: 1 }),
        expect.objectContaining({ priority: 'P2 Medium', count: 0 }),
      ]),
    );
  });

  it('formats agent queue data with nested user info', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.agentQueue).toHaveLength(1);
    const agent = json.agentQueue[0];
    expect(agent.userId).toBe('u-1');
    expect(agent.status).toBe('online');
    expect(agent.user.firstName).toBe('Alice');
    expect(agent.user.lastName).toBe('Smith');
    expect(agent.currentCase).toBeDefined();
    expect(agent.currentCase.caseNumber).toBe('LC-0001');
  });

  it('handles empty data gracefully', async () => {
    tableResults = {
      cases: { data: [], error: null },
      agent_queue_status: { data: [], error: null },
      integration_health: { data: [], error: null },
      staff_productivity: { data: [], error: null },
      sla_compliance: { data: [], error: null },
      bottleneck_tracking: { data: [], error: null },
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activeWorkload.totalActiveCases).toBe(0);
    expect(json.activeWorkload.unassignedCases).toBe(0);
    expect(json.activeWorkload.overdueCases).toBe(0);
    expect(json.agentQueue).toEqual([]);
    expect(json.integrationHealth).toEqual([]);
    expect(json.staffProductivity).toEqual([]);
    expect(json.slaCompliance.totalCases).toBe(0);
    expect(json.slaCompliance.averageComplianceScore).toBe(0);
    expect(json.bottlenecks).toEqual([]);
  });

  it('handles null data from Supabase (treats as empty array)', async () => {
    tableResults = {
      cases: { data: null, error: null },
      agent_queue_status: { data: null, error: null },
      integration_health: { data: null, error: null },
      staff_productivity: { data: null, error: null },
      sla_compliance: { data: null, error: null },
      bottleneck_tracking: { data: null, error: null },
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activeWorkload.totalActiveCases).toBe(0);
  });

  it('calculates SLA compliance summary correctly', async () => {
    tableResults.sla_compliance = {
      data: [
        { id: 's1', compliance_score: 90, sla_definitions: { priority_level: 'p1_high' } },
        { id: 's2', compliance_score: 70, sla_definitions: { priority_level: 'p1_high' } },
        { id: 's3', compliance_score: 85, sla_definitions: { priority_level: 'p2_medium' } },
      ],
      error: null,
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    const sla = json.slaCompliance;
    expect(sla.totalCases).toBe(3);
    expect(sla.compliantCases).toBe(2); // 90 and 85 >= 80
    expect(sla.nonCompliantCases).toBe(1); // 70 < 80
    // Average: (90 + 70 + 85) / 3 ≈ 81.67
    expect(sla.averageComplianceScore).toBeCloseTo(81.67, 1);
  });

  it('ranks staff productivity by performance score', async () => {
    tableResults.staff_productivity = {
      data: [
        {
          id: 'sp-1',
          user_id: 'u-1',
          metric_date: '2025-01-15',
          cases_assigned: 5,
          cases_resolved: 2,
          cases_escalated: 0,
          leads_created: 3,
          leads_verified: 4,
          leads_dismissed: 1,
          tips_reviewed: 5,
          tips_converted_to_leads: 2,
          avg_response_time: 30,
          total_actions: 20,
          case_updates_made: 5,
          created_at: '2025-01-15',
          updated_at: '2025-01-15',
          profiles: { id: 'u-1', first_name: 'Alice', last_name: 'A', email: 'a@e.com', role: 'admin' },
        },
        {
          id: 'sp-2',
          user_id: 'u-2',
          metric_date: '2025-01-15',
          cases_assigned: 2,
          cases_resolved: 0,
          cases_escalated: 0,
          leads_created: 1,
          leads_verified: 0,
          leads_dismissed: 0,
          tips_reviewed: 1,
          tips_converted_to_leads: 0,
          avg_response_time: 120,
          total_actions: 5,
          case_updates_made: 1,
          created_at: '2025-01-15',
          updated_at: '2025-01-15',
          profiles: { id: 'u-2', first_name: 'Bob', last_name: 'B', email: 'b@e.com', role: 'law_enforcement' },
        },
      ],
      error: null,
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.staffProductivity).toHaveLength(2);
    // First entry should have higher performance score
    expect(json.staffProductivity[0].performanceScore).toBeGreaterThan(
      json.staffProductivity[1].performanceScore,
    );
    expect(json.staffProductivity[0].rank).toBe(1);
    expect(json.staffProductivity[1].rank).toBe(2);
  });

  it('formats bottleneck data correctly', async () => {
    tableResults.bottleneck_tracking = {
      data: [
        {
          id: 'b-1',
          bottleneck_type: 'resource_shortage',
          description: 'Not enough investigators',
          severity: 'high',
          status: 'active',
          affected_cases_count: 5,
          affected_users: ['u-1', 'u-2'],
          estimated_delay_hours: 24,
          jurisdiction_id: 'j-1',
          affected_stage: 'investigation',
          identified_at: '2025-01-10',
          resolved_at: null,
          resolution_notes: null,
          resolved_by: null,
          is_recurring: true,
          occurrence_count: 3,
          created_at: '2025-01-10',
          updated_at: '2025-01-12',
        },
      ],
      error: null,
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.bottlenecks).toHaveLength(1);
    const bottleneck = json.bottlenecks[0];
    expect(bottleneck.bottleneckType).toBe('resource_shortage');
    expect(bottleneck.severity).toBe('high');
    expect(bottleneck.affectedCasesCount).toBe(5);
    expect(bottleneck.isRecurring).toBe(true);
  });

  it('returns 500 when an unexpected error occurs', async () => {
    // Force createClient to throw
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockRejectedValueOnce(new Error('Connection refused'));

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Failed to fetch operations dashboard data');
  });

  it('formats integration health data correctly', async () => {
    tableResults.integration_health = {
      data: [
        {
          id: 'ih-1',
          integration_name: 'ncic',
          display_name: 'NCIC Database',
          description: 'National Crime Information Center',
          status: 'healthy',
          last_check_at: '2025-01-15T00:00:00Z',
          last_success_at: '2025-01-15T00:00:00Z',
          last_failure_at: null,
          uptime_percentage: 99.9,
          avg_response_time_ms: 150,
          error_rate: 0.1,
          consecutive_failures: 0,
          last_error_message: null,
          is_critical: true,
          created_at: '2025-01-01',
          updated_at: '2025-01-15',
        },
      ],
      error: null,
    };

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.integrationHealth).toHaveLength(1);
    const ih = json.integrationHealth[0];
    expect(ih.integrationName).toBe('ncic');
    expect(ih.displayName).toBe('NCIC Database');
    expect(ih.isCritical).toBe(true);
    expect(ih.uptimePercentage).toBe(99.9);
  });
});
