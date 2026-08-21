'use client'

import { useEffect } from 'react'

function getSessionId(): string {
  const key = 'cornerbid.session'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

/** Records one view per session per holder. Idempotent on the server. */
export function ViewBeacon({ identityId }: { identityId: string }) {
  useEffect(() => {
    void fetch('/api/view', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identityId, sessionId: getSessionId() }),
    })
  }, [identityId])

  return null
}
