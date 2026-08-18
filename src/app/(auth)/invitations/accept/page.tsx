'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AcceptInvitationForm } from '@/components/auth-forms'

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <InvitationForm />
    </Suspense>
  )
}

function InvitationForm() {
  const query = useSearchParams()
  return <AcceptInvitationForm token={query.get('token') ?? ''} />
}