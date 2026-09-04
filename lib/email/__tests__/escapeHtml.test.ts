import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../escapeHtml';

describe('escapeHtml', () => {
  it('encodes all HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert('x')&"y"`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;',
    );
  });

  it('neutralizes an injected anchor tag', () => {
    const malicious = '<a href="https://evil.example/reset">Reset password</a>';
    const out = escapeHtml(malicious);
    expect(out).not.toContain('<a');
    expect(out).toContain('&lt;a href=&quot;https://evil.example/reset&quot;&gt;');
  });

  it('returns an empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('coerces non-string primitives', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
  });

  it('leaves benign text untouched', () => {
    expect(escapeHtml('Rossi Pizzeria GmbH')).toBe('Rossi Pizzeria GmbH');
  });
});
