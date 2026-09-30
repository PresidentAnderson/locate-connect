import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as photoPost } from './photo-matching/route';
import { POST as volunteerPost } from './volunteers/route';
import { volunteerNetworkService } from '@/lib/services/volunteer-network-service';

const state = vi.hoisted(() => ({
  user: { id: 'server-user' } as { id: string } | null,
  profile: { role: 'admin', is_verified: true } as { role: string; is_verified: boolean } | null,
  authError: null as Error | null,
  profileError: null as Error | null,
  verifyMatch: vi.fn(async (_request: string, _result: string, _match: boolean, actor: string) => actor === 'server-user'),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user }, error: state.authError }) },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: state.profile, error: state.profileError }) }) }) }),
}) }));
vi.mock('@/lib/services/photo-matching-service', () => ({ photoMatchingService: { verifyMatch: state.verifyMatch } }));
function request(body: object) {
  return new NextRequest('https://locate.example/api/compliance', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
}
const photoBody = { action: 'verify', requestId: 'request', resultId: 'result', isMatch: true, verifierId: 'spoofed-user' };
beforeEach(() => {
  state.user = { id: 'server-user' };
  state.profile = { role: 'admin', is_verified: true };
  state.authError = null;
  state.profileError = null;
  state.verifyMatch.mockClear();
});
it.each([photoPost, volunteerPost])('rejects unauthenticated verification', async post => {
  state.user = null;
  const response = await post(request({ ...photoBody, volunteerId: 'volunteer', backgroundCheckStatus: 'passed' }));
  expect(response.status).toBe(401);
});
it.each(['public', 'family', 'volunteer'])('rejects photo verification by %s role', async role => {
  state.profile = { role, is_verified: true };
  expect((await photoPost(request(photoBody))).status).toBe(403);
});
it('rejects an invalid session even with user data', async () => {
  state.authError = new Error('invalid session');
  expect((await photoPost(request(photoBody))).status).toBe(401);
});
it('rejects a missing staff profile', async () => {
  state.profile = null;
  expect((await photoPost(request(photoBody))).status).toBe(403);
});
it('rejects unverified staff', async () => {
  state.profile = { role: 'law_enforcement', is_verified: false };
  expect((await photoPost(request(photoBody))).status).toBe(403);
});
it('rejects profile lookup errors even when data is present', async () => {
  state.profileError = new Error('lookup failed');
  expect((await photoPost(request(photoBody))).status).toBe(403);
});
it.each(['admin', 'developer', 'law_enforcement'])('attributes photo verification to authenticated %s', async role => {
  state.profile = { role, is_verified: true };
  const response = await photoPost(request(photoBody));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
});
it.each(['true', 1, null])('rejects a non-boolean match decision %s', async isMatch => {
  expect((await photoPost(request({ ...photoBody, isMatch }))).status).toBe(400);
});
it('prevents an unauthorized background-check approval from mutating the volunteer', async () => {
  const volunteer = await volunteerNetworkService.registerVolunteer({ name: 'Test', email: 'test@example.com', phone: '123', location: { city: 'Montreal', province: 'QC', postalCode: 'H1A1A1' }, availability: { weekdays: true, weekends: false, evenings: false, onCall: false } });
  state.profile = { role: 'public', is_verified: true };
  const response = await volunteerPost(request({ action: 'verify', volunteerId: volunteer.id, backgroundCheckStatus: 'passed' }));
  expect(response.status).toBe(403);
  expect(volunteerNetworkService.getVolunteer(volunteer.id)?.verified).toBe(false);
});
it('permits verified staff to record a genuine background-check result', async () => {
  const volunteer = await volunteerNetworkService.registerVolunteer({ name: 'Staff Test', email: 'staff@example.com', phone: '123', location: { city: 'Montreal', province: 'QC', postalCode: 'H1A1A1' }, availability: { weekdays: true, weekends: false, evenings: false, onCall: false } });
  const response = await volunteerPost(request({ action: 'verify', volunteerId: volunteer.id, backgroundCheckStatus: 'passed' }));
  expect(response.status).toBe(200);
  expect(volunteerNetworkService.getVolunteer(volunteer.id)?.verified).toBe(true);
});
it('rejects unknown background-check statuses', async () => {
  expect((await volunteerPost(request({ action: 'verify', volunteerId: 'any', backgroundCheckStatus: 'approved' }))).status).toBe(400);
});
