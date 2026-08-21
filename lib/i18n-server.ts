import { headers } from 'next/headers';
import { localeFromAcceptLanguage, type Locale } from '@/lib/i18n';

/** Browser language via Accept-Language. The old locale cookie is ignored. */
export async function getLocale(): Promise<Locale> {
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}
