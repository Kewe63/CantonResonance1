/**
 * Canton Ticket — Number & Currency Formatting Utilities
 * Daml Decimal values come with many trailing zeros (e.g., "15.0000000000").
 * These helpers strip unnecessary decimals and format currency consistently.
 */

/** Strip trailing zeros from Daml Decimal values. "15.0000000000" → "15", "7.5000" → "7.5" */
export function fmt(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '0';
  // Use Number to auto-strip trailing zeros, then toString
  return Number(n.toFixed(2)).toString();
}

/** Format as dollar amount: "$50", "$7.5" */
export function fmtUsd(value: string | number | undefined | null): string {
  return `$${fmt(value)}`;
}

/** Format as percentage: "%15", "%7.5" */
export function fmtPct(value: string | number | undefined | null): string {
  return `%${fmt(value)}`;
}
