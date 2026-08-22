'use client'

import { useState } from 'react'
import { LeaderboardList } from '@/components/leaderboard-list'
import { useGameLive } from '@/components/game-live'
import { interpolate, messages, type Locale } from '@/lib/i18n'
import type { RankingEntry } from '@/lib/leaderboard'
import { sortRanking } from '@/lib/ranking-order'

type BoardScope = 'season' | 'all-time'

function withLiveHits(
  ranking: RankingEntry[],
  occupantId: string,
  liveTouches: number,
): RankingEntry[] {
  const next = ranking.map((entry) => {
    const isOccupant = entry.identityId === occupantId
    const cornerCount = isOccupant ? Math.max(entry.cornerCount, liveTouches) : entry.cornerCount
    return {
      ...entry,
      isCurrentHolder: isOccupant,
      cornerCount,
      heldAt:
        isOccupant && liveTouches > entry.cornerCount ? new Date() : new Date(entry.heldAt),
    }
  })
  return sortRanking(next)
}

export function LiveLeaderboard({
  allTime,
  season,
  seasonLabel,
  locale,
}: {
  allTime: RankingEntry[]
  season: RankingEntry[]
  seasonLabel: string
  locale: Locale
}) {
  const copy = messages[locale]
  const { snapshot, liveTouches } = useGameLive()
  const [scope, setScope] = useState<BoardScope>('season')
  const occupantId = snapshot.holder.identityId
  const ranking = withLiveHits(scope === 'season' ? season : allTime, occupantId, liveTouches)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setScope('season')}
          aria-pressed={scope === 'season'}
          className={`h-9 rounded-full px-4 text-sm font-semibold transition-[scale,background-color] duration-150 ease-out active:scale-[0.96] ${
            scope === 'season' ? 'bg-brand text-white' : 'bg-mist text-ink hover:bg-line'
          }`}
        >
          {interpolate(copy.boardSeason, { name: seasonLabel })}
        </button>
        <button
          type="button"
          onClick={() => setScope('all-time')}
          aria-pressed={scope === 'all-time'}
          className={`h-9 rounded-full px-4 text-sm font-semibold transition-[scale,background-color] duration-150 ease-out active:scale-[0.96] ${
            scope === 'all-time' ? 'bg-brand text-white' : 'bg-mist text-ink hover:bg-line'
          }`}
        >
          {copy.boardAllTime}
        </button>
      </div>
      <LeaderboardList
        ranking={ranking}
        locale={locale}
        emptyTitle={scope === 'season' ? copy.leaderboardEmptySeasonTitle : copy.leaderboardEmptyTitle}
        emptyBody={scope === 'season' ? copy.leaderboardEmptySeasonBody : copy.leaderboardEmptyBody}
      />
    </div>
  )
}
