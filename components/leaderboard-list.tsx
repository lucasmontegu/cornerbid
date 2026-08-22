import type { ReactNode } from 'react'
import { formatUsd } from '@/lib/money'
import { interpolate, messages, type Locale } from '@/lib/i18n'
import type { RankingEntry } from '@/lib/leaderboard'

function ago(locale: Locale, date: Date): string {
  const copy = messages[locale]
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return copy.justNow
  if (seconds < 3600) return interpolate(copy.minAgo, { n: Math.floor(seconds / 60) })
  return interpolate(copy.hoursAgo, { n: Math.floor(seconds / 3600) })
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
  const tint =
    featured === 1
      ? 'bg-brand-1 text-ink'
      : featured === 2
        ? 'bg-brand-2 text-ink'
        : featured === 3
          ? 'bg-brand-3 text-ink'
          : 'bg-paper text-ink shadow-[var(--shadow-border)]'

  return (
    <li>
      <a
        href={`/go/${entry.identityId}`}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={`flex gap-4 rounded-[28px] p-4 transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.96] ${tint} ${
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
          className="size-12 shrink-0 rounded-lg object-contain outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold">{entry.displayName}</span>
            <span className={`shrink-0 font-semibold tabular-nums ${featured ? 'text-brand-deep' : 'text-ink'}`}>
              {interpolate(copy.touchCount, { n: entry.cornerCount })}
            </span>
          </div>
          {entry.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-hush">{entry.description}</p>
          ) : null}
          {entry.isCurrentHolder ? (
            <p className="mt-1 text-sm font-semibold">{copy.occupyingNow}</p>
          ) : null}
          <p className="mt-1 text-xs text-hush">
            {interpolate(copy.rankingRowMeta, {
              time: ago(locale, entry.heldAt),
              bid: formatUsd(entry.amountCents),
              visits: entry.clickCount,
            })}
          </p>
        </div>
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
