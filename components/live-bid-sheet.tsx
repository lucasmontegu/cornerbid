'use client'

import { BidSheet } from '@/components/arena/bid-sheet'
import { useGameLive } from '@/components/game-live'

export function LiveBidSheet() {
  const { snapshot } = useGameLive()
  return (
    <BidSheet quoteAmountCents={snapshot.nextAmountCents} reserved={snapshot.reserved} layout="inline" />
  )
}
