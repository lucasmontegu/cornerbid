'use client'

import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Globe02Icon } from '@hugeicons/core-free-icons'
import { useI18n } from '@/components/locale-provider'
import { RailModal, type RailChoice } from '@/components/arena/rail-modal'
import { clampBidCents, dollarsFromCents, formatUsd, parseBidDollars } from '@/lib/money'
import { MIN_INCREMENT_CENTS, MIN_PLACE_CENTS } from '@/lib/pricing-constants'
import type { IdentityPreview } from '@/lib/public-state'
import { chargeDeltaCents, nextStakeCents } from '@/lib/raise'

/** Locked height for the URL pill + CTA so the row cannot step. */
export const BID_ROW_HEIGHT_PX = 48

interface BidSheetProps {
  quoteAmountCents: number
  onClose?: () => void
  layout?: 'overlay' | 'inline'
}

export function BidSheet({
  quoteAmountCents,
  onClose,
  layout = 'overlay',
}: BidSheetProps) {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [amountCents, setAmountCents] = useState(quoteAmountCents)
  const [amountDraft, setAmountDraft] = useState(dollarsFromCents(quoteAmountCents))
  const [preview, setPreview] = useState<IdentityPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  /** Amount frozen when the CTA opened the picker, so a later re-render cannot move it. */
  const [pendingCents, setPendingCents] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const floor = Math.max(quoteAmountCents, MIN_PLACE_CENTS)
    setAmountCents((current) => Math.max(current, floor))
    setAmountDraft((draft) => {
      const parsed = parseBidDollars(draft)
      if (parsed === null) return dollarsFromCents(floor)
      return dollarsFromCents(clampBidCents(parsed, floor))
    })
  }, [quoteAmountCents])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = input.trim()
    if (!trimmed) {
      setPreview(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      void previewIdentity(trimmed)
    }, 450)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input])

  async function previewIdentity(value: string) {
    try {
      const response = await fetch('/api/resolve-identity', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: value }),
      })
      const body = (await response.json()) as IdentityPreview & { error?: string }
      if (!response.ok) {
        setPreview(null)
        setMessage(body.error ?? t('resolveFail'))
        return
      }
      setMessage(null)
      setPreview(body)
    } catch {
      setPreview(null)
    }
  }

  const floorCents = Math.max(quoteAmountCents, MIN_PLACE_CENTS)
  const committed = preview?.alreadyCommittedCents ?? 0
  const quotedTotalCents = nextStakeCents(committed, amountCents)
  const chargeCents = chargeDeltaCents(quotedTotalCents, committed)
  const takesCorner = quotedTotalCents >= quoteAmountCents

  function snapAmount(raw = amountDraft): number {
    const parsed = parseBidDollars(raw)
    const cents =
      parsed === null
        ? clampBidCents(amountCents / 100, floorCents)
        : clampBidCents(parsed, floorCents)
    setAmountCents(cents)
    setAmountDraft(dollarsFromCents(cents))
    return cents
  }

  function stepBy(deltaCents: number) {
    const next = clampBidCents((amountCents + deltaCents) / 100, floorCents)
    setAmountCents(next)
    setAmountDraft(dollarsFromCents(next))
  }

  async function checkout(cents: number, rail: RailChoice) {
    setBusy(true)
    setMessage(null)
    // Only a real redirect leaves the picker up; every other outcome closes it so
    // the error below it is visible.
    let redirecting = false
    try {
      if (!preview) await previewIdentity(input)
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input,
          expectedAmountCents: cents,
          timeZone,
          rail,
        }),
      })
      const body = (await response.json()) as {
        redirectUrl?: string
        error?: string
        message?: string
        amountCents?: number
      }
      if (body.error === 'price_moved' && body.amountCents) {
        setAmountCents(body.amountCents)
        setAmountDraft(dollarsFromCents(body.amountCents))
        setMessage(t('priceMoved', { price: formatUsd(body.amountCents) }))
        return
      }
      if (body.error === 'mp_credentials_missing') {
        setMessage(t('mpCredentialsMissing'))
        return
      }
      if (body.error === 'polar_credentials_missing') {
        setMessage(t('polarCredentialsMissing'))
        return
      }
      if (!response.ok || !body.redirectUrl) {
        setMessage(body.message ?? body.error ?? t('checkoutFail'))
        return
      }
      redirecting = true
      window.location.href = body.redirectUrl
    } finally {
      setBusy(false)
      if (!redirecting) setRailOpen(false)
    }
  }

  /** The CTA no longer starts a payment. It asks which rail first. */
  function onPayClick() {
    setPendingCents(snapAmount())
    setMessage(null)
    setRailOpen(true)
  }

  const stepper =
    'grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-brand-deep active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40'

  /** Inline is the page hero and owns the document's only h1; the corner overlay repeats it. */
  const Headline = layout === 'inline' ? 'h1' : 'p'

  const form = (
    <div className={layout === 'inline' ? 'w-full' : 'w-full max-w-xl rounded-[28px] bg-paper p-5 shadow-[var(--shadow-border)]'}>
      <div className="flex flex-col items-center text-center">
        {onClose ? (
          <button type="button" onClick={onClose} className="self-end text-hush hover:text-ink">
            {t('close')}
          </button>
        ) : null}

        <Headline className="font-display text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t('fomoHeadline')}
        </Headline>
        <p className="mt-3 max-w-lg text-sm text-pretty text-hush sm:text-base">{t('fomoSub')}</p>

        <div className="mt-6 flex flex-col items-center gap-x-3 gap-y-2 sm:flex-row sm:justify-center">
          <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t('claimFor')}</p>
          {/*
            − $12 + are one control and never break across lines. Letting them
            wrap independently reads as three unrelated widgets with a hole in
            the middle, which is exactly what a fixed-width amount field caused.
          */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t('lowerBid')}
              className={stepper}
              disabled={amountCents <= floorCents}
              onClick={() => stepBy(-MIN_INCREMENT_CENTS)}
            >
              −
            </button>
            <label className="inline-flex items-baseline font-display text-3xl font-semibold text-brand sm:text-4xl">
              <span aria-hidden>$</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                aria-label={t('amountLabel')}
                value={amountDraft}
                // Sized to its own content so the + button sits against the
                // number instead of across a gap. Safe in `ch` precisely because
                // the field is tabular-nums: every digit is one `ch` wide.
                style={{ width: `${Math.max(amountDraft.length, 1) + 0.5}ch` }}
                onChange={(event) => setAmountDraft(event.target.value)}
                onBlur={() => snapAmount()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    snapAmount()
                  }
                }}
                className="bg-transparent py-1 font-display font-semibold text-brand tabular-nums outline-none"
              />
            </label>
            <button type="button" aria-label={t('raiseBid')} className={stepper} onClick={() => stepBy(MIN_INCREMENT_CENTS)}>
              +
            </button>
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm text-balance text-hush">
          {t('amountHint')}{' '}
          <a
            href="/rules"
            className="text-brand underline decoration-from-font underline-offset-4 hover:text-brand-deep"
          >
            {t('amountHintMore')}
          </a>
        </p>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch">
        <label
          className="flex w-full min-w-0 items-center gap-2 rounded-full border border-brand/35 bg-paper ps-3 pe-4 shadow-[var(--shadow-border)] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-brand sm:flex-1"
          style={{ height: BID_ROW_HEIGHT_PX }}
        >
          <span className="sr-only">{t('productLabel')}</span>
          <span className="pointer-events-none flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist text-hush">
            {preview?.imageUrl ? (
              // Hotlinked third-party favicon / avatar — never next/image (D4).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.imageUrl}
                alt=""
                width={28}
                height={28}
                className="size-7 object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
              />
            ) : (
              <HugeiconsIcon icon={Globe02Icon} size={16} strokeWidth={1.5} />
            )}
          </span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('productPlaceholder')}
            // 16px on mobile or iOS Safari zooms the page when this focuses.
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none sm:text-sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && input && !busy) onPayClick()
            }}
          />
        </label>
        <button
          type="button"
          className="w-full shrink-0 rounded-full bg-brand px-5 text-sm font-semibold whitespace-nowrap text-white transition-[scale,background-color] duration-150 ease-out hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-6"
          style={{ height: BID_ROW_HEIGHT_PX }}
          disabled={busy || !input || chargeCents <= 0}
          onClick={onPayClick}
        >
          {busy
            ? t('redirecting')
            : takesCorner
              ? t('takeCornerPay', { price: formatUsd(chargeCents) })
              : t('placeOnBoard', { price: formatUsd(chargeCents) })}
        </button>
      </div>

      <p className="mx-auto mt-2 max-w-xl text-center text-[11px] text-hush">{t('raiseHint')}</p>
      {committed > 0 ? (
        <p className="mx-auto mt-1 max-w-xl text-center text-[11px] text-brand">
          {t('alreadyCommitted', {
            paid: formatUsd(committed),
            delta: formatUsd(chargeCents),
          })}
        </p>
      ) : null}

      {/* Stable node so a repeated checkout error still announces. */}
      <p
        role="alert"
        className="mx-auto mt-3 max-w-xl text-center text-xs text-destructive empty:mt-0"
      >
        {message}
      </p>

      <p className="mx-auto mt-3 max-w-xl text-center text-[11px] leading-relaxed text-hush">{t('bidFineprint')}</p>

      <RailModal
        open={railOpen}
        priceLabel={formatUsd(chargeCents)}
        busy={busy}
        onChoose={(rail) => void checkout(pendingCents ?? amountCents, rail)}
        onClose={() => setRailOpen(false)}
      />
    </div>
  )

  if (layout === 'inline') {
    return <div className="mx-auto mt-2 flex w-full justify-center">{form}</div>
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-ink/20 p-4 sm:items-center">
      {form}
    </div>
  )
}
