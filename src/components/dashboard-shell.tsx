'use client'

import type { ReactNode } from 'react'
import { AppShell } from '@danvic/ui'
import { apiFetch } from '@danvic/api-client'
import { SessionRenewal } from '@/components/session-renewal'
import { useAuthor } from '@/lib/data'

export function DashboardShell({ children }: { children: ReactNode }) {
  const { author, loading, error } = useAuthor()

  if (loading)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Loading your workspace…</p>
      </main>
    )
  if (error || !author)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message" data-tone="error">
          {error || 'Could not load your workspace.'}
        </p>
      </main>
    )

  return (
    <AppShell
      kind="author"
      displayName={`${author.firstName} ${author.lastName}`}
      email={author.email}
      onLogout={async () => {
        await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
      }}
    >
      <SessionRenewal />
      <div className="ad-page">{children}</div>
    </AppShell>
  )
}