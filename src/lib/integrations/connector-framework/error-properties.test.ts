import { expect, it } from 'vitest';
import { errorProperty, errorStatusCode } from './error-properties';
it('reads HTTP status codes attached to errors', () => {
  expect(errorStatusCode(Object.assign(new Error('HTTP failure'), { statusCode: 503 }))).toBe(503);
});
it.each([undefined, null, 'failure', 3, { statusCode: '503' }])('handles malformed thrown values safely: %s', value => {
  expect(errorStatusCode(value)).toBeUndefined();
});
it('preserves custom network error codes', () => {
  expect(errorProperty(Object.assign(new Error('network failure'), { code: 'ECONNRESET' }), 'code')).toBe('ECONNRESET');
});
