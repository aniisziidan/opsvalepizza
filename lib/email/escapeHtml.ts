/**
 * Minimal, dependency-free HTML entity encoder for interpolating untrusted
 * values into HTML email bodies. Prevents customer-supplied fields (company
 * name, contact name, free-text notes, etc.) from injecting markup/links into
 * the trusted internal notification and customer proposal templates.
 *
 * Encodes the five characters that are significant in HTML text and attribute
 * contexts. Non-string inputs are coerced; null/undefined become an empty string.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
