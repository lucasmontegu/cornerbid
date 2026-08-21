'use client'

import { useEffect, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Globe02Icon } from '@hugeicons/core-free-icons'
import { useI18n } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { clampBidCents, dollarsFromCents, formatUsd, parseBidDollars } from '@/lib/money'
import { MIN_INCREMENT_CENTS, MIN_PLACE_CENTS } from '@/lib/pricing-constants'
import type { IdentityPreview } from '@/lib/public-state'
import { detectArgentinaClient } from '@/lib/rails/select'
import type { PreferredRail } from '@/lib/rails/select'

/** Locked height for the URL pill + CTA so the row cannot step. */
export const BID_ROW_HEIGHT_PX = 48

interface BidSheetProps {
  quoteAmountCents: number
  reserved: boolean
  onClose?: () => void
  layout?: 'overlay' | 'inline'
}

type Step = 'compose' | 'rail'

export function BidSheet({
  quoteAmountCents,
  reserved,
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
  const [argentine, setArgentine] = useState(false)
  const [step, setStep] = useState<Step>('compose')
  const [rail, setRail] = useState<PreferredRail>('polar')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setArgentine(detectArgentinaClient())
  }, [])

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
  const chargeCents = Math.max(0, amountCents - committed)
  const takesCorner = amountCents >= quoteAmountCents

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

  async function checkout(chosenRail: PreferredRail, cents = amountCents) {
    setBusy(true)
    setMessage(null)
    try {
      if (!preview) await previewIdentity(input)
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          input,
          expectedAmountCents: cents,
          country: argentine ? 'AR' : undefined,
          timeZone,
          rail: chosenRail,
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
      if (!response.ok || !body.redirectUrl) {
        setMessage(body.message ?? body.error ?? t('checkoutFail'))
        return
      }
      window.location.href = body.redirectUrl
    } finally {
      setBusy(false)
    }
  }

  function onPayClick() {
    const cents = snapAmount()
    if (argentine && step === 'compose') {
      setStep('rail')
      return
    }
    void checkout(argentine ? rail : 'polar', cents)
  }

  const stepper =
    'grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-[scale,background-color,opacity] duration-150 ease-out hover:bg-brand-deep active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40'

  const form = (
    <div className={layout === 'inline' ? 'w-full' : 'w-full max-w-xl rounded-[28px] bg-paper p-5 shadow-[var(--shadow-border)]'}>
      {step === 'rail' ? (
        <div>
          <p className="font-mono text-[11px] tracking-widest text-hush uppercase">{t('takeTheCorner')}</p>
          <h2 className="font-display mt-2 text-xl font-semibold text-ink">{t('railStepTitle')}</h2>
          <p className="mt-2 text-sm text-hush">{t('railStepBody')}</p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setRail('polar')}
              className={`rounded-2xl border p-4 text-left transition-[box-shadow,border-color] duration-150 ease-out ${
                rail === 'polar' ? 'border-ink bg-mist' : 'border-line hover:border-ink/40'
              }`}
            >
              <p className="font-medium">{t('railPolar')}</p>
              <p className="mt-1 text-xs text-hush">{t('railPolarHint')}</p>
            </button>
            <button
              type="button"
              onClick={() => setRail('mercadopago')}
              className={`rounded-2xl border p-4 text-left transition-[box-shadow,border-color] duration-150 ease-out ${
                rail === 'mercadopago' ? 'border-ink bg-mist' : 'border-line hover:border-ink/40'
              }`}
            >
              <p className="font-medium">{t('railMp')}</p>
              <p className="mt-1 text-xs text-hush">{t('railMpHint')}</p>
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep('compose')}>
              {t('railBack')}
            </Button>
            <Button type="button" className="flex-1" disabled={busy} onClick={() => void checkout(rail, snapAmount())}>
              {busy ? t('redirecting') : t('railContinue')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center text-center">
            {onClose ? (
              <button type="button" onClick={onClose} className="self-end text-hush hover:text-ink">
                {t('close')}
              </button>
            ) : null}

            <p className="font-display text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {t('fomoHeadline')}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">{t('claimFor')}</p>
              <button
                type="button"
                aria-label={t('lowerBid')}
                className={stepper}
                disabled={amountCents <= floorCents}
                onClick={() => stepBy(-MIN_INCREMENT_CENTS)}
              >
                −
              </button>
              <label className="relative">
                <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 font-display text-3xl font-semibold text-brand sm:text-4xl">
                  $
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t('amountLabel')}
                  value={amountDraft}
                  onChange={(event) => setAmountDraft(event.target.value)}
                  onBlur={() => snapAmount()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      snapAmount()
                    }
                  }}
                  className="w-[min(42vw,11rem)] bg-transparent py-1 pr-1 pl-7 font-display text-3xl font-semibold text-brand tabular-nums outline-none sm:text-4xl"
                />
              </label>
              <button type="button" aria-label={t('raiseBid')} className={stepper} onClick={() => stepBy(MIN_INCREMENT_CENTS)}>
                +
              </button>
            </div>

            <p className="mt-3 max-w-xl text-sm text-brand/80">{t('amountHint')}</p>
            {reserved ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t('reserved')}</p> : null}
          </div>

          <div className="mx-auto mt-6 flex w-full max-w-xl items-stretch gap-2">
            <label
              className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-brand/35 bg-paper ps-3 pe-4 shadow-[var(--shadow-border)] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-brand"
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
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && input && !busy) onPayClick()
                }}
              />
            </label>
            <button
              type="button"
              className="shrink-0 rounded-full bg-brand px-5 text-sm font-semibold whitespace-nowrap text-white transition-[scale,background-color] duration-150 ease-out hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.96] disabled:opacity-50 sm:px-6"
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

          {message ? <p className="mx-auto mt-3 max-w-xl text-xs text-red-600">{message}</p> : null}

          <p className="mx-auto mt-3 max-w-xl text-center text-[11px] leading-relaxed text-hush">{t('bidFineprint')}</p>
        </>
      )}
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
