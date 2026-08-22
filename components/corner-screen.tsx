'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'
import type { GameSnapshot } from '@/app/api/state.types'
import { CornerModal } from '@/components/corner-modal'
import { correctedNow } from '@/lib/clock'
import { colorAt, cornerIndexAt, positionAt, VIEWPORT, type PhysicsParams } from '@/lib/physics'

/**
 * Screensaver overlay. The plaque is `position: fixed` over the whole tab and
 * the 1600×900 logical stage is scaled onto the real window so (0,0) and
 * (W,H) land on the actual viewport corners. Physics math is unchanged.
 */
export function CornerScreen({
  snapshot,
  snapshotRef,
  clockOffsetRef,
  onCornerHit,
}: {
  snapshot: GameSnapshot
  snapshotRef: RefObject<GameSnapshot>
  clockOffsetRef: RefObject<number | null>
  onCornerHit: (identityId: string) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [hitNonce, setHitNonce] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const lastCornerRef = useRef(-1)
  const onHitRef = useRef(onCornerHit)

  useEffect(() => {
    onHitRef.current = onCornerHit
  }, [onCornerHit])

  useEffect(() => {
    lastCornerRef.current = -1
  }, [snapshot.version, snapshot.holder.identityId])

  useEffect(() => {
    let raf = 0

    function frame() {
      const state = snapshotRef.current
      if (!state?.physics) {
        raf = requestAnimationFrame(frame)
        return
      }
      const params: PhysicsParams = { p: state.physics.p, q: state.physics.q }
      const now = correctedNow(Date.now(), clockOffsetRef.current ?? 0)
      const elapsed = (now - state.physics.startedAt) / 1000

      const { x, y } = positionAt(elapsed, params)
      const plate = plateRef.current
      if (plate) {
        plate.style.transform = `translate3d(${x}px, ${y}px, 0)`
        plate.style.setProperty('--plate-color', colorAt(elapsed, params))
      }

      const index = cornerIndexAt(elapsed, params)
      if (index > lastCornerRef.current) {
        // Skip the first sample so a mid-period join does not fire a duplicate hit.
        if (lastCornerRef.current >= 0) {
          onHitRef.current(state.holder.identityId)
          setHitNonce((n) => n + 1)
          setModalOpen(true)
        }
        lastCornerRef.current = index
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [clockOffsetRef, snapshotRef])

  // Map the logical 1600×900 box onto the real window so physics corners are
  // the viewport corners. Independent axes on purpose — no letterboxed arena.
  useEffect(() => {
    function fit() {
      const stage = stageRef.current
      if (!stage) return
      const width = window.visualViewport?.width ?? window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      stage.style.transform = `scale(${width / VIEWPORT.width}, ${height / VIEWPORT.height})`
    }
    fit()
    window.addEventListener('resize', fit)
    window.visualViewport?.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      window.visualViewport?.removeEventListener('resize', fit)
    }
  }, [])

  const { holder } = snapshot

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div
        ref={stageRef}
        style={{
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          transformOrigin: '0 0',
        }}
        className="absolute top-0 left-0"
      >
        <div
          ref={plateRef}
          style={{
            width: VIEWPORT.logoWidth,
            height: VIEWPORT.logoHeight,
            willChange: 'transform',
          }}
          // Flat saturated block, like the DVD logo itself: no ring, no glow, no
          // radius. The old tinted-and-shadowed plate read as a modern app card,
          // which is the one thing a screensaver never looked like.
          className="pointer-events-auto absolute top-0 left-0 grid place-items-center p-4
                     [background:var(--plate-color)]"
        >
          {/*
            Deliberately a plain <img>: the URL is a hotlinked third-party asset, so
            next/image would need remotePatterns:['**'], turning /_next/image into an
            open optimization proxy billable to this account.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={holder.imageUrl}
            alt={holder.displayName}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        </div>
      </div>

      <CornerModal
        key={hitNonce}
        open={modalOpen}
        displayName={holder.displayName}
        identityId={holder.identityId}
        identityKey={holder.identityKey}
        onDismiss={() => setModalOpen(false)}
      />
    </div>
  )
}
