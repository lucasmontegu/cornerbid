'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { useI18n } from '@/components/locale-provider'
import type { Locale } from '@/lib/i18n'

export function SiteHeader({ locale: _locale }: { locale: Locale }) {
  const { t } = useI18n()

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link href="/" className="font-display text-sm font-semibold tracking-tight text-ink">
        {t('brand')}
      </Link>
      <nav className="flex items-center gap-3 sm:gap-4" aria-label={t('brand')}>
        <Link href="#leaderboard" className="hidden text-sm text-hush hover:text-ink sm:inline">
          {t('navLeaderboard')}
        </Link>
        <Link href="/about" className="text-sm text-hush hover:text-ink">
          {t('navAbout')}
        </Link>
        <Link href="/rules" className="text-sm text-hush hover:text-ink">
          {t('navRules')}
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  )
}
