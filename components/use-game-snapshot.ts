'use client'

import { useEffect, useRef, useState } from 'react'
import type { GameSnapshot } from '@/app/api/state.types'
import { sampleOffset, smoothOffset } from '@/lib/clock'

const POLL_MS = 2_000

export function useGameSnapshot(initial: GameSnapshot) {
  const [snapshot, setSnapshot] = useState(initial)
  const clockOffsetRef = useRef<number | null>(null)
  const snapshotRef = useRef(snapshot)

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      const sentAt = Date.now()
      try {
        const response = await fetch('/api/state', { cache: 'no-store' })
        if (!response.ok || cancelled) return
        const next = (await response.json()) as GameSnapshot

        const roundTrip = Date.now() - sentAt
        const sample = sampleOffset(next.serverNow + roundTrip / 2, Date.now())
        clockOffsetRef.current = smoothOffset(clockOffsetRef.current, sample)

        setSnapshot(next)
      } catch {
        // A dropped poll is harmless: the animation runs from parameters we already have.
      }
    }

    void poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { snapshot, snapshotRef, clockOffsetRef }
}
