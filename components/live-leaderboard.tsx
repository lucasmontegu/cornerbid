'use client'

import { LeaderboardList } from '@/components/leaderboard-list'
import { useGameLive } from '@/components/game-live'
import type { Locale } from '@/lib/i18n'
import type { RankingEntry } from '@/lib/leaderboard'

export function LiveLeaderboard({
  ranking,
  locale,
}: {
  ranking: RankingEntry[]
  locale: Locale
}) {
  const { snapshot, liveTouches } = useGameLive()
  const liveRanking = ranking.map((entry) => {
    const isOccupant = entry.identityId === snapshot.holder.identityId
    return {
      ...entry,
      heldAt: new Date(entry.heldAt),
      isCurrentHolder: isOccupant,
      cornerCount: isOccupant ? Math.max(entry.cornerCount, liveTouches) : entry.cornerCount,
    }
  })

  return <LeaderboardList ranking={liveRanking} locale={locale} />
}
