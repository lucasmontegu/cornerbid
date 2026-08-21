'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { GifVideo, OFFICE_CLIPS, pickOfficeClip, type OfficeClip } from '@/components/gif-video'
import { useI18n } from '@/components/locale-provider'
import { trackGoal } from '@/lib/datafast-client'

const CTA_DELAY_MS = 1800

export function CornerModal({
  open,
  displayName,
  identityId,
  identityKey,
  onDismiss,
}: {
  open: boolean
  displayName: string
  identityId: string
  identityKey?: string
  onDismiss: () => void
}) {
  const { t } = useI18n()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [showCta, setShowCta] = useState(false)
  const [clip, setClip] = useState<OfficeClip>(OFFICE_CLIPS.celebrate)

  useEffect(() => {
    if (!open) {
      setShowCta(false)
      return
    }

    setClip(pickOfficeClip())
    closeRef.current?.focus()
    trackGoal('corner_modal_opened', identityKey ? { identity_key: identityKey } : undefined)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) setShowCta(true)
    const timeoutId = reduced ? undefined : window.setTimeout(() => setShowCta(true), CTA_DELAY_MS)

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, identityKey, onDismiss])

  if (!open) return null

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-md overflow-hidden rounded-[28px] bg-paper p-3 shadow-[var(--shadow-border)] ${
          reduced ? '' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <GifVideo
          src={clip.src}
          poster={clip.poster}
          reducedMotion={reduced}
          onEnded={() => setShowCta(true)}
          className="aspect-[6/5] w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        />

        <div className="px-3 pt-4 pb-2">
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
            {t('modalTitle')}
          </h2>
          <p className="mt-2 text-sm text-hush">{t('modalBody', { name: displayName })}</p>

          <div
            className={`mt-5 flex flex-col gap-2 sm:flex-row ${
              showCta ? 'opacity-100' : 'pointer-events-none opacity-0'
            } transition-[opacity] duration-200 ease-out motion-reduce:opacity-100 motion-reduce:transition-none`}
          >
            <a
              href={`/go/${identityId}`}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-brand-deep active:scale-[0.96]"
              onClick={() => {
                trackGoal('corner_visit', identityKey ? { identity_key: identityKey } : undefined)
              }}
            >
              {t('modalCta', { name: displayName })}
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onDismiss}
              className="h-12 rounded-2xl px-5 text-sm text-hush transition-[scale,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:text-ink active:scale-[0.96]"
            >
              {t('modalDismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
