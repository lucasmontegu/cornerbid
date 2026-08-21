import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { getLocale } from '@/lib/i18n-server'
import { messages } from '@/lib/i18n'

export default async function RulesPage() {
  const locale = await getLocale()
  const copy = messages[locale]

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <SiteHeader locale={locale} />
      <article className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed">
        <h1 className="font-display mb-4 text-3xl font-semibold">{copy.rulesTitle}</h1>
        <p>{copy.rulesIntro}</p>

        <h2 className="font-display mt-8 mb-3 text-xl font-semibold">{copy.rulesRankTitle}</h2>
        <ul className="list-disc space-y-2 ps-5">
          <li>{copy.rulesRank1}</li>
          <li>{copy.rulesRank2}</li>
          <li>{copy.rulesRank3}</li>
          <li>{copy.rulesRank4}</li>
        </ul>

        <h2 className="font-display mt-8 mb-3 text-xl font-semibold">{copy.rulesListTitle}</h2>
        <ul className="list-disc space-y-2 ps-5">
          <li>{copy.rulesList1}</li>
          <li>{copy.rulesList2}</li>
          <li>{copy.rulesList3}</li>
          <li>{copy.rulesList4}</li>
          <li>{copy.rulesList5}</li>
        </ul>

        <h2 className="font-display mt-8 mb-3 text-xl font-semibold">{copy.rulesAfterTitle}</h2>
        <ul className="list-disc space-y-2 ps-5">
          <li>{copy.rulesAfter1}</li>
          <li>{copy.rulesAfter2}</li>
          <li>{copy.rulesAfter3}</li>
          <li>{copy.rulesAfter4}</li>
        </ul>

        <p className="mt-10">
          <Link href="/" className="text-brand hover:underline">
            {copy.brand}
          </Link>
        </p>
      </article>
    </main>
  )
}
