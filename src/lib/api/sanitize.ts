/**
 * Input sanitisation helpers for API routes.
 *
 * Supabase's PostgREST `.ilike` / `.or` filters accept patterns that are
 * interpolated into the query string.  Characters such as `%`, `_`, `(`,
 * `)`, `.` and `,` can alter filter semantics or break the query syntax
 * when injected via user-supplied search terms.
 *
 * Always pass user search strings through `sanitizeSearchInput` before
 * embedding them in PostgREST filter expressions.
 */

/**
 * Sanitise a user-supplied search string for safe use inside PostgREST
 * `.ilike` / `.or` filter expressions.
 *
 * - Escapes `%` and `_` (SQL LIKE wildcards)
 * - Removes characters that could break PostgREST `.or()` syntax
 *   (parentheses, commas, dots, back-slashes, quotes)
 * - Trims the result and caps it at 200 characters
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[%_]/g, "\\$&")            // escape SQL LIKE wildcards
    .replace(/[(),.\\\\"']/g, "")         // strip PostgREST-sensitive chars
    .trim()
    .slice(0, 200);
}
