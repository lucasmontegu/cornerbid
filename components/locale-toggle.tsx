'use client';

import { useI18n } from '@/components/locale-provider';
import type { Locale } from '@/lib/i18n';

export function LocaleToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-full bg-mist p-0.5 text-xs font-medium">
      <span className="sr-only">{t('language')}</span>
      {(['en', 'es'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-full px-2.5 py-1 uppercase transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] ${
            locale === code ? 'bg-ink text-paper' : 'text-hush hover:text-ink'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
