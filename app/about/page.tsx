import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { getLocale } from '@/lib/i18n-server'
import { messages } from '@/lib/i18n'

export default async function AboutPage() {
  const locale = await getLocale()
  const copy = messages[locale]

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <SiteHeader locale={locale} />
      <article className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display mb-4 text-3xl font-semibold">{copy.aboutTitle}</h1>
        <p className="text-hush">{copy.aboutLead}</p>
        <ol className="mt-8 space-y-6">
          <li>
            <h2 className="font-display text-lg font-semibold">{copy.aboutB1Title}</h2>
            <p className="mt-1 text-sm text-hush">{copy.aboutB1}</p>
          </li>
          <li>
            <h2 className="font-display text-lg font-semibold">{copy.aboutB2Title}</h2>
            <p className="mt-1 text-sm text-hush">{copy.aboutB2}</p>
          </li>
          <li>
            <h2 className="font-display text-lg font-semibold">{copy.aboutB3Title}</h2>
            <p className="mt-1 text-sm text-hush">{copy.aboutB3}</p>
          </li>
        </ol>
        <p className="mt-10">
          <Link href="/#bid" className="text-brand hover:underline">
            {copy.takeTheCorner}
          </Link>
        </p>
      </article>
    </main>
  )
}
