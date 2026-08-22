import type { ReactNode } from 'react'
import { formatUsd } from '@/lib/money'
import { interpolate, messages, type Locale } from '@/lib/i18n'
import type { RankingEntry } from '@/lib/leaderboard'

/**
 * The one number on the row.
 *
 * There used to be two — hits and visits, side by side — and they competed with
 * each other and with the name for the same glance. Rank is decided by hits
 * alone, so hits is the only figure that earns this size; visits moved down to
 * the meta line where it reads as context instead of a score.
 */
function Score({
  value,
  label,
  ariaLabel,
  featured,
  locale,
}: {
  value: number
  label: string
  ariaLabel: string
  featured?: boolean
  locale: Locale
}) {
  return (
    <div className="min-w-[3.5ch] shrink-0 text-end">
      <p
        aria-label={ariaLabel}
        className={`font-display leading-none font-semibold tabular-nums ${
          featured ? 'text-3xl text-brand-deep sm:text-4xl' : 'text-xl text-ink'
        }`}
      >
        {value.toLocaleString(locale)}
      </p>
      <p className="mt-1.5 text-[11px] text-hush">{label}</p>
    </div>
  )
}

function RankRow({
  entry,
  rank,
  locale,
  featured,
}: {
  entry: RankingEntry
  rank: number
  locale: Locale
  featured?: 1 | 2 | 3
}) {
  const copy = messages[locale]
  // #1 earns its prominence from an outline, not from a heavier fill. At 42% of
  // the brand the old top tint swallowed the avatar and the text sitting on it.
  const tint =
    featured === 1
      ? 'bg-brand-2 text-ink ring-1 ring-brand/45'
      : featured === 2
        ? 'bg-brand-3 text-ink'
        : featured === 3
          ? 'bg-brand-3/60 text-ink'
          : 'bg-paper text-ink shadow-[var(--shadow-border)]'
  const bid = formatUsd(entry.amountCents)
  const statusLine = entry.isCurrentHolder
    ? interpolate(copy.occupyingBid, { status: copy.occupyingNow, bid })
    : interpolate(copy.listedBid, { bid })

  return (
    <li>
      <a
        href={`/go/${entry.identityId}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={`flex items-center gap-3 rounded-[28px] p-4 transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.96] sm:gap-4 ${tint} ${
          featured ? 'p-5' : ''
        }`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
            featured ? 'bg-brand text-white' : 'bg-mist text-ink'
          }`}
        >
          #{rank}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.imageUrl}
          alt=""
          className={`shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 ${
            featured ? 'size-14' : 'size-11'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate font-semibold ${featured ? 'text-lg' : ''}`}>
            {entry.displayName}
          </p>
          {entry.description ? (
            <p className="mt-0.5 line-clamp-1 text-sm text-hush">{entry.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-hush">
            {statusLine}
            {/* Coloured bullet, so the count reads as a separate fact from the
                bid rather than another clause of the same sentence. */}
            <span aria-hidden className="mx-1.5 text-brand">
              •
            </span>
            <span aria-label={interpolate(copy.rankingVisitsAria, { n: entry.clickCount })}>
              {entry.clickCount.toLocaleString(locale)}{' '}
              {entry.clickCount === 1 ? copy.rankingVisitLabel : copy.rankingVisitsLabel}
            </span>
          </p>
        </div>
        <Score
          value={entry.cornerCount}
          label={copy.rankingHitsLabel}
          ariaLabel={interpolate(copy.rankingHitsAria, { n: entry.cornerCount })}
          featured={Boolean(featured)}
          locale={locale}
        />
      </a>
    </li>
  )
}

function BandRule({ n, locale }: { n: number; locale: Locale }) {
  const label = interpolate(messages[locale].topBand, { n })
  return (
    <div className="relative my-8 flex items-center" role="separator" aria-label={label}>
      <div className="h-px w-full bg-brand/25" />
      <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-brand-3 px-3 py-0.5 text-[11px] font-semibold tracking-widest text-brand-deep uppercase">
        {label}
      </span>
    </div>
  )
}

export function LeaderboardList({
  ranking,
  locale,
  emptyTitle,
  emptyBody,
}: {
  ranking: RankingEntry[]
  locale: Locale
  emptyTitle?: string
  emptyBody?: string
}) {
  const copy = messages[locale]

  if (ranking.length === 0) {
    return (
      <div id="leaderboard" className="rounded-[28px] border-2 border-dashed border-line px-6 py-10 text-center">
        <h2 className="font-display text-lg font-semibold text-balance text-ink">
          {emptyTitle ?? copy.leaderboardEmptyTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-hush">
          {emptyBody ?? copy.leaderboardEmptyBody}
        </p>
        <a
          href="#bid"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-[scale,background-color] duration-150 ease-out hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.96]"
        >
          {copy.leaderboardEmptyCta}
        </a>
      </div>
    )
  }

  const featured = ranking.slice(0, 3)
  const rest = ranking.slice(3)

  return (
    <div id="leaderboard">
      <ol className="grid gap-3">
        {featured.map((entry, index) => (
          <RankRow
            key={entry.identityId}
            entry={entry}
            rank={index + 1}
            locale={locale}
            featured={(index + 1) as 1 | 2 | 3}
          />
        ))}
      </ol>

      {rest.length > 0 ? (
        <>
          <BandRule n={3} locale={locale} />
          <RankBands rest={rest} locale={locale} />
        </>
      ) : null}
    </div>
  )
}

function RankBands({ rest, locale }: { rest: RankingEntry[]; locale: Locale }) {
  const groups: Array<{ startRank: number; endRank: number; bandAfter: number }> = [
    { startRank: 4, endRank: 10, bandAfter: 10 },
    { startRank: 11, endRank: 20, bandAfter: 20 },
    { startRank: 21, endRank: 50, bandAfter: 50 },
    { startRank: 51, endRank: 100, bandAfter: 100 },
  ]

  const nodes: ReactNode[] = []
  for (const group of groups) {
    const from = group.startRank - 4
    const to = group.endRank - 3
    const chunk = rest.slice(from, to)
    if (chunk.length === 0) break
    nodes.push(
      <ol key={group.endRank} className="grid gap-2">
        {chunk.map((entry, i) => (
          <RankRow
            key={entry.identityId}
            entry={entry}
            rank={group.startRank + i}
            locale={locale}
          />
        ))}
      </ol>,
    )
    const nextExists = rest.length > to
    if (nextExists) {
      nodes.push(<BandRule key={`band-${group.bandAfter}`} n={group.bandAfter} locale={locale} />)
    }
  }

  return <>{nodes}</>
}
