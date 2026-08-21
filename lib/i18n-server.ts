import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from '@/lib/i18n';

export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (cookie === 'es' || cookie === 'en') return cookie;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
}
