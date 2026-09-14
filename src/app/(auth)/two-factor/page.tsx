import { Suspense } from 'react'
import { TwoFactorForm } from '@/components/auth-forms'

export const metadata = { title: 'Two-factor verification' }

export default function Page() {
  return <Suspense fallback={<main className="sb-login-form-wrap"><p className="sb-form-message">Loading…</p></main>}><TwoFactorForm /></Suspense>
}
