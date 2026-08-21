/**
 * Argentina is a hint for offering Mercado Pago, never a silent force.
 *
 * Polar is the default worldwide. Mercado Pago Checkout Pro is offered after a
 * light heuristic (timezone / *-AR language / explicit country) or a manual
 * escape. The UI locale cookie (`cornerbid-locale`) is ignored — English UI
 * must still see the option.
 *
 * Explicit `preferred: 'mercadopago'` always routes to MP, even if the
 * heuristic missed (US timezone on an Argentine laptop).
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

/** Client-side heuristic. No IP geolocation. Ignores the UI locale cookie. */
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

/** Polar unless the bidder explicitly asked for Mercado Pago. */
export function resolveCheckoutRail(
  preferred: PreferredRail | undefined,
  _argentina?: boolean,
): SettleableRail {
  if (preferred === 'mercadopago') return 'mercadopago';
  return 'polar';
}
