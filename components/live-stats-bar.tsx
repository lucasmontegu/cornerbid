'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { useI18n } from '@/components/locale-provider'
import { BRAND_HEX, dataFastRealtimeWidgetUrl } from '@/lib/datafast'
import type { LiveStats } from '@/lib/live-stats'
import { formatUsd } from '@/lib/money'

/**
 * Widget geometry, measured rather than guessed.
 *
 * At mainTextSize=14 the embed renders "0 people visiting this site now" in a
 * 216x21 content box inside a 25px-tall document. The wrapper carries a real
 * size because the iframe is told to fill 100% of its parent, and `height:100%`
 * inside an auto-height box collapses to zero — the widget would vanish.
 *
 * 14px matches the surrounding stats (text-sm); the DataFast default of 16
 * makes the embed visibly larger than everything beside it. The extra width
 * over 216 is headroom for the count growing past one digit.
 */
const WIDGET_TEXT_PX = 14
const WIDGET_W = 236
const WIDGET_H = 26

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

/**
 * DataFast's own realtime embed.
 *
 * Public widget, so it needs no API key and renders identically on localhost,
 * preview and production. It brings its own live dot and count; the site only
 * supplies the accent colour and a stable box to sit in.
 */
function PeopleOnline({ title }: { title: string }): ReactNode {
  return (
    <li
      className="relative shrink-0 overflow-hidden"
      style={{ width: WIDGET_W, height: WIDGET_H }}
    >
      <iframe
        src={dataFastRealtimeWidgetUrl(BRAND_HEX, WIDGET_TEXT_PX)}
        // The frame's own title is its accessible name — an aria-label on the
        // wrapper would not be announced.
        title={title}
        loading="lazy"
        width={WIDGET_W}
        height={WIDGET_H}
        /*
         * The invert filter is not decoration. DataFast hardcodes the label to
         * near-black (oklch(0.269 0 0)) and exposes no text-colour parameter, so
         * on the dark theme it would be black text on a dark pill — invisible.
         * Inverting lifts it to near-white, and the 180deg hue rotation puts the
         * accent dot back on its original side of the wheel instead of leaving
         * it the complementary colour.
         */
        className="absolute inset-0 h-full w-full border-0 bg-transparent dark:[filter:invert(1)_hue-rotate(180deg)]"
        style={{ background: 'transparent' }}
      />
    </li>
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
          <PeopleOnline title={t('peopleOnline')} />

          <Stat value={n(stats.cornersToday)} label={t('statsCorners')} />
          <Stat value={n(stats.clicksToday)} label={t('statsClicks')} />
          <Stat value={formatUsd(stats.bidTodayCents)} label={t('statsBid')} />
        </ul>

        <span className="text-xs text-hush">{t('statsWindow')}</span>
      </div>
    </div>
  )
}
