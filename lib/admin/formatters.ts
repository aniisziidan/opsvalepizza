/**
 * Admin data formatting helpers.
 */

export function timeAgo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'EUR'
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  const symbol = currency === 'EUR' ? '€' : currency;
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

export function formatBoxSpec(
  quoteRequest?: {
    boxSpecificationType?: string | null;
    standardBoxSize?: string | null;
    lengthMm?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;
    material?: string | null;
    print?: string | null;
  } | null,
  calcSnapshot?: {
    boxSize?: string | null;
    material?: string | null;
    print?: string | null;
  } | null
): string {
  if (quoteRequest) {
    const dim =
      quoteRequest.boxSpecificationType === 'STANDARD' && quoteRequest.standardBoxSize
        ? `${quoteRequest.standardBoxSize} Standard (${quoteRequest.lengthMm}×${quoteRequest.widthMm}×${quoteRequest.heightMm}mm)`
        : `${quoteRequest.lengthMm}×${quoteRequest.widthMm}×${quoteRequest.heightMm}mm (Custom)`;
    const mat = quoteRequest.material || 'KRAFT';
    const prt = quoteRequest.print === 'PRINTED' ? 'Custom Printed' : 'Plain';
    return `${dim} • ${mat} • ${prt}`;
  }

  if (calcSnapshot) {
    const size = calcSnapshot.boxSize || 'Standard';
    const mat = calcSnapshot.material || 'KRAFT';
    const prt = calcSnapshot.print === 'PRINTED' ? 'Custom Printed' : 'Plain';
    return `${size} • ${mat} • ${prt}`;
  }

  return 'Standard Box';
}
