import { BRAND_HEX, DATAFAST_WIDGET_ID } from '@/lib/datafast'
import { interpolate, type Locale } from '@/lib/i18n'
import { messages } from '@/lib/i18n'

/**
 * Official DataFast realtime iframe for people-online.
 * Wrapper has explicit px size because height:100% of an auto parent collapses.
 */
export function VisitorPill({
  locale,
  visitorsSinceLaunch,
}: {
  locale: Locale
  visitorsSinceLaunch: number | null
}) {
  const copy = messages[locale]
  const widgetSrc = `https://datafa.st/widgets/${DATAFAST_WIDGET_ID}/realtime?mainTextSize=16&primaryColor=%23${BRAND_HEX}`

  return (
    <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-mist px-3 py-1.5 text-sm text-ink">
      <div
        className="relative h-8 w-[168px] shrink-0 overflow-hidden"
        aria-label="People online"
      >
        <iframe
          src={widgetSrc}
          title="DataFast Widget"
          loading="lazy"
          width={168}
          height={32}
          className="absolute inset-0 h-8 w-[168px] border-0 bg-transparent"
          style={{ background: 'transparent' }}
          allowTransparency
        />
      </div>
      {visitorsSinceLaunch !== null ? (
        <>
          <span className="text-hush" aria-hidden>
            ·
          </span>
          <span>{interpolate(copy.visitorsSinceLaunch, { n: visitorsSinceLaunch.toLocaleString(locale) })}</span>
        </>
      ) : null}
      <span className="text-hush" aria-hidden>
        ·
      </span>
      <a
        href="https://datafa.st"
        target="_blank"
        rel="noreferrer"
        className="text-ink underline-offset-2 hover:underline"
      >
        {copy.seeStats} →
      </a>
    </div>
  )
}
