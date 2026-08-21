import Link from 'next/link'
import { LocaleToggle } from '@/components/locale-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { messages, type Locale } from '@/lib/i18n'

export function SiteHeader({ locale }: { locale: Locale }) {
  const copy = messages[locale]

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link href="/" className="font-display text-sm font-semibold tracking-tight text-ink">
        {copy.brand}
      </Link>
      <nav className="flex items-center gap-3 sm:gap-4" aria-label={copy.brand}>
        <Link href="#leaderboard" className="hidden text-sm text-hush hover:text-ink sm:inline">
          {copy.navLeaderboard}
        </Link>
        <Link href="/about" className="text-sm text-hush hover:text-ink">
          {copy.navAbout}
        </Link>
        <Link href="/rules" className="text-sm text-hush hover:text-ink">
          {copy.navRules}
        </Link>
        <LocaleToggle />
        <ThemeToggle />
      </nav>
    </header>
  )
}
