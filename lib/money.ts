/** Format integer cents for the HUD. Conversion happens only at display time. */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Parse a typed bid. Strips `$`, commas, spaces and optional `usd`.
 * Returns whole dollars, or null if the field is empty / not a number.
 */
export function parseBidDollars(raw: string): number | null {
  const cleaned = raw.trim().replace(/usd/gi, '').replace(/[$\s,]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/** Whole-dollar cents, floored at `minCents`. No upper cap. */
export function clampBidCents(dollars: number, minCents: number): number {
  const cents = Math.round(dollars) * 100;
  const floor = Math.max(0, minCents);
  return Math.max(floor, cents);
}

export function dollarsFromCents(cents: number): string {
  return String(Math.round(cents / 100));
}
