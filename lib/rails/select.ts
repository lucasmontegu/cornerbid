/**
 * Legacy heuristic. The rail is now an explicit buyer choice in the bid modal;
 * this resolver is retained only for its tests and selects nothing live.
 *
 * Argentina hints are not a checkout gate. Missing env on a chosen rail must
 * 503 — never silently fall through to the other provider.
 */
import type { SettleableRail } from '@/db/schema';

export type PreferredRail = 'polar' | 'mercadopago';

/** IANA names browsers still emit, including pre-2013 aliases. */
const ARGENTINA_TZ_ALIASES = new Set([
  'America/Buenos_Aires',
  'America/Catamarca',
  'America/ComodRivadavia',
  'America/Cordoba',
  'America/Jujuy',
  'America/Mendoza',
  'America/Rosario',
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Catamarca',
  'America/Argentina/ComodRivadavia',
  'America/Argentina/Cordoba',
  'America/Argentina/Jujuy',
  'America/Argentina/La_Rioja',
  'America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Salta',
  'America/Argentina/San_Juan',
  'America/Argentina/San_Luis',
  'America/Argentina/Tucuman',
  'America/Argentina/Ushuaia',
]);

export function isArgentinaTimeZone(timeZone: string | null | undefined): boolean {
  const tz = timeZone?.trim() ?? '';
  if (!tz) return false;
  if (tz.startsWith('America/Argentina/')) return true;
  return ARGENTINA_TZ_ALIASES.has(tz);
}

/**
 * BCP-47 / Accept-Language region AR — `es-AR`, `en-AR`, `es_AR`.
 * Does not require Spanish (`es`). `en` alone is not enough.
 */
export function hasArgentinaLanguageTag(acceptLanguage: string | null | undefined): boolean {
  const lang = acceptLanguage?.trim() ?? '';
  if (!lang) return false;
  return /[-_]ar(?=$|[-_;,\s])/i.test(lang);
}

export function isArgentinaHint(input: {
  country?: string | null;
  timeZone?: string | null;
  acceptLanguage?: string | null;
}): boolean {
  if (input.country?.trim().toUpperCase() === 'AR') return true;
  if (isArgentinaTimeZone(input.timeZone)) return true;
  if (hasArgentinaLanguageTag(input.acceptLanguage)) return true;
  return false;
}

/** Client-side heuristic. No IP geolocation. Not used as a checkout gate. */
export function detectArgentinaClient(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const langs = typeof navigator === 'undefined'
      ? ''
      : [navigator.language, ...(navigator.languages ?? [])].filter(Boolean).join(',');
    return isArgentinaHint({ timeZone: tz, acceptLanguage: langs });
  } catch {
    return false;
  }
}

/** Unused live path. Kept so existing tests stay pinned to Mercado Pago. */
export function resolveCheckoutRail(
  _preferred?: PreferredRail,
  _argentina?: boolean,
): SettleableRail {
  return 'mercadopago';
}
