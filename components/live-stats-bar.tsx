'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { useI18n } from '@/components/locale-provider'
import type { LiveStats } from '@/lib/live-stats'
import { formatUsd } from '@/lib/money'

/**
 * Slow on purpose. These are 24h aggregates plus a 10-minute realtime window —
 * nothing here can change meaningfully between two frames, so polling faster
 * would only spend database time redrawing the same digits.
 */
const POLL_MS = 25_000

/**
 * One stat, read aloud as "48 corners".
 *
 * The value span is keyed by its own text so a change replays the enter
 * animation with no effect and no second piece of state: React remounts that
 * node only when the number actually moved.
 */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <li className="flex items-baseline gap-1.5">
      <span
        key={value}
        className="font-display text-sm font-semibold text-ink tabular-nums motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
      >
        {value}
      </span>
      <span className="text-sm text-hush">{label}</span>
    </li>
  )
}

/** Green pulse. Purely decorative — the count beside it is what states the fact. */
function LiveDot(): ReactNode {
  return (
    <span aria-hidden className="relative inline-flex size-2 self-center">
      <span className="absolute inline-flex size-full rounded-full bg-live opacity-70 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  )
}

export function LiveStatsBar({ initial }: { initial: LiveStats }) {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState(initial)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setInterval> | null = null

    async function refresh() {
      try {
        const response = await fetch('/api/live-stats', { signal: controller.signal })
        if (!response.ok) return
        setStats((await response.json()) as LiveStats)
      } catch {
        // A dropped poll is not worth surfacing. The numbers already on screen
        // are still true, just a little older.
      }
    }

    function start() {
      if (timer) return
      void refresh()
      timer = setInterval(() => void refresh(), POLL_MS)
    }

    function stop() {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    // A backgrounded tab polls nothing. Browsers already throttle timers there,
    // but stopping outright also means a returning viewer's first sight is fresh
    // rather than a stale frame that then jumps.
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      controller.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const n = (value: number) => value.toLocaleString(locale)

  return (
    <div className="mx-auto flex w-full max-w-5xl justify-center px-5 sm:px-8">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-full bg-mist px-4 py-2">
        <ul
          aria-label={t('statsLabel')}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5"
        >
          {/* Omitted rather than zeroed when DataFast is unreachable: "0 watching"
              is a claim, and a missing API key is not evidence for it. */}
          {stats.visitorsOnline !== null ? (
            <li className="flex items-baseline gap-1.5">
              <LiveDot />
              <span
                key={stats.visitorsOnline}
                className="font-display text-sm font-semibold text-ink tabular-nums motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
              >
                {n(stats.visitorsOnline)}
              </span>
              <span className="text-sm text-hush">{t('statsWatching')}</span>
            </li>
          ) : null}

          <Stat value={n(stats.cornersToday)} label={t('statsCorners')} />
          <Stat value={n(stats.clicksToday)} label={t('statsClicks')} />
          <Stat value={formatUsd(stats.bidTodayCents)} label={t('statsBid')} />
        </ul>

        <span className="text-xs text-hush">{t('statsWindow')}</span>
      </div>
    </div>
  )
}
