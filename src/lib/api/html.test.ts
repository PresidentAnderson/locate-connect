import { describe, expect, it } from 'vitest';
import { escapeHtml, safeImageUrl } from './html';

describe('OAuth HTML output', () => {
  it('encodes markup and attribute delimiters', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">\'&')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;');
  });
  it('does not turn encoded text into markup', () => {
    expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
  });
  it('permits HTTPS logo URLs', () => {
    expect(safeImageUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png');
  });
  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://example.com/logo', '//example.com/logo', 'invalid'])('rejects unsafe logo %s', value => {
    expect(safeImageUrl(value)).toBeUndefined();
  });
});
