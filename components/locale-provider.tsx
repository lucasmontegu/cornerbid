'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  interpolate,
  localeFromNavigator,
  LOCALE_COOKIE,
  messages,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';

interface I18nValue {
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function expireLocaleCookie() {
  document.cookie = `${LOCALE_COOKIE}=;path=/;max-age=0;samesite=lax`;
}

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  useEffect(() => {
    expireLocaleCookie();
    const fromBrowser = localeFromNavigator();
    setLocaleState(fromBrowser);
    document.documentElement.lang = fromBrowser;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: (key, vars) => {
        const template = messages[locale][key];
        return vars ? interpolate(template, vars) : template;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside LocaleProvider');
  return ctx;
}
