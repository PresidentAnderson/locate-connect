import { expect, it } from 'vitest';
import { trustedPhotoUrl } from './photo-url';
const origin = 'https://project.supabase.co';
it.each(['case-photos', 'facial-recognition-photos'])('permits uploaded photos in %s', bucket => {
  const url = `${origin}/storage/v1/object/public/${bucket}/user/photo.jpg`;
  expect(trustedPhotoUrl(url, origin)).toBe(url);
});
it.each([
  'http://127.0.0.1/private', 'http://169.254.169.254/latest/meta-data',
  'https://evil.example/photo', 'https://project.supabase.co.evil.example/photo',
  `${origin}/rest/v1/profiles`, `${origin}/storage/v1/object/public/other/photo`,
  'https://user:pass@project.supabase.co/storage/v1/object/public/case-photos/a',
])('rejects untrusted source %s', url => {
  expect(() => trustedPhotoUrl(url, origin)).toThrow();
});
it('fails closed without configured storage', () => {
  expect(() => trustedPhotoUrl(`${origin}/storage/v1/object/public/case-photos/a`, undefined)).toThrow();
});
