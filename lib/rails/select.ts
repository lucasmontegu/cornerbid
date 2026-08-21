/**
 * Argentina is a hint, never a silent force.
 *
 * Polar is the default worldwide. Mercado Pago Checkout Pro is offered only after
 * a light heuristic (timezone / es-AR / explicit country) AND an explicit choice.
 */
import type { SettleableRail } from '@/db/schema';

export type PreferredRail = 'polar' | 'mercadopago';

export function isArgentinaHint(input: {
  country?: string | null;
  timeZone?: string | null;
  acceptLanguage?: string | null;
}): boolean {
  if (input.country?.trim().toUpperCase() === 'AR') return true;

  const tz = input.timeZone ?? '';
  if (tz.startsWith('America/Argentina') || tz === 'America/Buenos_Aires') return true;

  const lang = input.acceptLanguage?.toLowerCase() ?? '';
  if (/(^|,|\s)es-ar\b/.test(lang)) return true;

  return false;
}

/** Client-side heuristic. No IP geolocation. */
export function detectArgentinaClient(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = navigator.language;
    return isArgentinaHint({ timeZone: tz, acceptLanguage: lang, country: tz.startsWith('America/Argentina') ? 'AR' : null });
  } catch {
    return false;
  }
}

/**
 * Polar unless the bidder both looks Argentine *and* asked for Mercado Pago.
 */
export function resolveCheckoutRail(
  preferred: PreferredRail | undefined,
  argentina: boolean,
): SettleableRail {
  if (preferred === 'mercadopago' && argentina) return 'mercadopago';
  return 'polar';
}
