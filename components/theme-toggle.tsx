'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Moon02Icon, Sun01Icon } from '@hugeicons/core-free-icons'
import { useI18n } from '@/components/locale-provider'

function suppressThemeTransitions() {
  const style = document.createElement('style')
  style.append(document.createTextNode('*,*::before,*::after{transition:none !important}'))
  document.head.append(style)
  const _flushReflow = document.body.offsetHeight
  requestAnimationFrame(() => {
    requestAnimationFrame(() => style.remove())
  })
}

export function ThemeToggle() {
  const { t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const flip = useCallback(() => {
    suppressThemeTransitions()
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={t('themeToggle')}
      aria-pressed={isDark}
      className="relative grid size-9 place-items-center rounded-full text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-mist active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="relative size-[18px]">
        <span
          className={`absolute inset-0 grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            isDark ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]'
          }`}
        >
          <HugeiconsIcon icon={Sun01Icon} size={18} strokeWidth={1.5} />
        </span>
        <span
          className={`grid place-items-center transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
            isDark ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-100 blur-0'
          }`}
        >
          <HugeiconsIcon icon={Moon02Icon} size={18} strokeWidth={1.5} />
        </span>
      </span>
    </button>
  )
}
