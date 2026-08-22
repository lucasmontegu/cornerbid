'use client'

import { useEffect, useId, useRef } from 'react'
import { useI18n } from '@/components/locale-provider'
import { detectArgentinaClient } from '@/lib/rails/select'

export type RailChoice = 'mercadopago' | 'paypal'

/**
 * Payment-rail picker. Opens on the bid CTA so the buyer chooses before any order
 * exists — no order is created on either provider until a rail is picked.
 *
 * Focus moves in on open and returns to the trigger on close, and the background is
 * inert while it is up.
 */
export function RailModal({
  open,
  priceLabel,
  busy,
  onChoose,
  onClose,
}: {
  open: boolean
  priceLabel: string
  busy?: boolean
  onChoose: (rail: RailChoice) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const titleId = useId()
  const firstRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreRef.current = document.activeElement as HTMLElement | null
    firstRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Keep Tab inside the dialog.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      restoreRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const option =
    'flex w-full items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-start transition-[scale,border-color,background-color] duration-150 ease-out hover:border-brand hover:bg-mist active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50'

  /*
   * PayPal decides guest checkout from the buyer's IP. An Argentine buyer sent
   * to PayPal does not get a card form — they get an account-opening form
   * asking for DNI and date of birth, and most of them leave. Mercado Pago
   * takes the same card with no account at all.
   *
   * So the order is not cosmetic: whichever option sits first is the one most
   * people click. Safe to read during render because the modal only mounts
   * after a click, and the helper guards for a missing navigator.
   */
  const argentina = detectArgentinaClient()

  const paypal = {
    rail: 'paypal' as const,
    badge: 'PP',
    label: t('railPayPal'),
    hint: argentina ? t('railPayPalHintAr') : t('railPayPalHint'),
    recommended: !argentina,
  }
  const mercadopago = {
    rail: 'mercadopago' as const,
    badge: 'MP',
    label: t('railMercadoPago'),
    hint: t('railMercadoPagoHint'),
    recommended: argentina,
  }
  const options = argentina ? [mercadopago, paypal] : [paypal, mercadopago]

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end overscroll-contain bg-ink/40 p-4 sm:place-items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-md rounded-[28px] bg-paper p-5 shadow-[var(--shadow-border)] ${
          reduced ? '' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          {t('railModalTitle')}
        </h2>
        <p className="mt-2 text-sm text-pretty text-hush">
          {t('railModalBody', { price: priceLabel })}
        </p>

        <div className="mt-5 grid gap-3">
          {options.map((entry, index) => (
            <button
              key={entry.rail}
              ref={index === 0 ? firstRef : undefined}
              type="button"
              className={option}
              disabled={busy}
              onClick={() => onChoose(entry.rail)}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mist font-display text-base font-semibold text-brand-deep">
                {entry.badge}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-ink">{entry.label}</span>
                  {entry.recommended ? (
                    <span className="rounded-full bg-brand-3 px-2 py-0.5 text-[11px] font-semibold text-brand-deep">
                      {t('railRecommended')}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-pretty text-hush">{entry.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="mt-4 h-11 w-full rounded-2xl text-sm text-hush transition-[scale,color] duration-150 ease-out hover:text-ink active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {busy ? t('redirecting') : t('railCancel')}
        </button>
      </div>
    </div>
  )
}
