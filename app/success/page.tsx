import Link from 'next/link'
import { getLocale } from '@/lib/i18n-server'
import { messages } from '@/lib/i18n'

export default async function SuccessPage() {
  const locale = await getLocale()
  const copy = messages[locale]

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white px-6 text-center text-neutral-900">
      <p className="font-mono text-[11px] tracking-[0.22em] text-neutral-400 uppercase">
        {copy.successKicker}
      </p>
      <h1 className="max-w-lg text-3xl font-semibold tracking-tight">{copy.successTitle}</h1>
      <p className="max-w-md text-sm text-neutral-500">{copy.successBody}</p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white"
      >
        {copy.successCta}
      </Link>
    </main>
  )
}
