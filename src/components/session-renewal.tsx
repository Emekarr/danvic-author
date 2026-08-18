'use client'

import { useEffect } from 'react'
import { apiFetch } from '@danvic/api-client'

const RENEWAL_INTERVAL_MS = 90 * 60 * 1000

export function SessionRenewal() {
  useEffect(() => {
    const renew = () => {
      void apiFetch('/api/auth/refresh', { method: 'POST', body: '{}' })
    }
    const interval = window.setInterval(renew, RENEWAL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [])

  return null
}
