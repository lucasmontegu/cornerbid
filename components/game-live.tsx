'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { GameSnapshot } from '@/app/api/state.types'
import { CornerScreen } from '@/components/corner-screen'
import { useGameSnapshot } from '@/components/use-game-snapshot'

interface GameLiveValue {
  snapshot: GameSnapshot
  liveTouches: number
}

const GameLiveContext = createContext<GameLiveValue | null>(null)

export function GameLiveProvider({
  initial,
  children,
}: {
  initial: GameSnapshot
  children: ReactNode
}) {
  const { snapshot, snapshotRef, clockOffsetRef } = useGameSnapshot(initial)
  const [sessionHits, setSessionHits] = useState(0)
  const occupancyRef = useRef(snapshot.holder.identityId)
  const versionRef = useRef(snapshot.version)
  const baselineRef = useRef(snapshot.holder.cornerCount)

  useEffect(() => {
    if (snapshot.holder.identityId !== occupancyRef.current || snapshot.version !== versionRef.current) {
      occupancyRef.current = snapshot.holder.identityId
      versionRef.current = snapshot.version
      baselineRef.current = snapshot.holder.cornerCount
      setSessionHits(0)
    }
  }, [snapshot.holder.identityId, snapshot.version])

  const onCornerHit = useCallback((identityId: string) => {
    if (identityId !== occupancyRef.current) return
    setSessionHits((n) => n + 1)
  }, [])

  const liveTouches = Math.max(snapshot.holder.cornerCount, baselineRef.current + sessionHits)

  const value = useMemo(
    () => ({ snapshot, liveTouches }),
    [snapshot, liveTouches],
  )

  return (
    <GameLiveContext.Provider value={value}>
      <CornerScreen
        snapshot={snapshot}
        snapshotRef={snapshotRef}
        clockOffsetRef={clockOffsetRef}
        onCornerHit={onCornerHit}
      />
      {children}
    </GameLiveContext.Provider>
  )
}

export function useGameLive(): GameLiveValue {
  const ctx = useContext(GameLiveContext)
  if (!ctx) throw new Error('useGameLive must be used inside GameLiveProvider')
  return ctx
}
