import Link from 'next/link'

import { interpolate, messages, type Locale } from '@/lib/i18n'
import { formatUsd } from '@/lib/money'
import { AUTHOR_HANDLE, type HouseRow } from '@/lib/revenue'

/**
 * The site's own row on its own leaderboard: rank #0, real settled revenue,
 * same shape as `RankRow`. Reading it as a board row is the point — CornerBid
 * is a contestant in the game it runs, and the number is never flattering.
 */
export function SiteFooter({
  locale,
  house,
  visitorsSinceLaunch,
}: {
  locale: Locale
  house: HouseRow
  visitorsSinceLaunch: number | null
}) {
  const copy = messages[locale]

  const since =
    house.daysSinceLaunch >= 1
      ? interpolate(copy.footerLaunchedDays, { n: house.daysSinceLaunch })
      : interpolate(copy.footerLaunchedHours, { n: house.hoursSinceLaunch })

  const meta =
    visitorsSinceLaunch !== null
      ? interpolate(copy.footerHouseMeta, {
          since,
          visits: visitorsSinceLaunch.toLocaleString(locale),
        })
      : since

  return (
    <footer className="mx-auto w-full max-w-5xl px-5 pt-4 pb-12 sm:px-8">
      <div className="flex gap-4 rounded-[28px] bg-mist p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white tabular-nums">
          #0
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-display font-semibold text-ink">{copy.brand}</span>
            <span className="shrink-0 font-display font-semibold text-brand-deep tabular-nums">
              {formatUsd(house.earnedCents)}
            </span>
          </div>
          <p className="mt-1 text-sm text-pretty text-hush">{copy.footerHouseTagline}</p>
          <p className="mt-1 text-xs text-hush tabular-nums">{meta}</p>
        </div>
      </div>

      <nav
        aria-label={copy.brand}
        className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
      >
        <Link href="/rules" className="text-hush underline-offset-4 hover:text-ink hover:underline">
          {copy.navRules}
        </Link>
        <Link href="/about" className="text-hush underline-offset-4 hover:text-ink hover:underline">
          {copy.navAbout}
        </Link>
        <a
          href="https://datafa.st"
          target="_blank"
          rel="noreferrer"
          className="text-hush underline-offset-4 hover:text-ink hover:underline"
        >
          {copy.seeStats} →
        </a>
      </nav>

      <p className="mt-4 text-xs text-hush">
        <a
          href="https://outbid.lol"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:text-ink hover:underline"
        >
          {copy.footerInspired}
        </a>
        <span aria-hidden> · </span>
        <a
          href={`https://x.com/${AUTHOR_HANDLE}`}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:text-ink hover:underline"
        >
          {interpolate(copy.footerBuiltBy, { handle: AUTHOR_HANDLE })}
        </a>
      </p>
    </footer>
  )
}
