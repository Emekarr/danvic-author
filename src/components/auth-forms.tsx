'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiFetch, type LoginResult } from '@danvic/api-client'
import { AuthLayout, Button, CodeInput, Field, FormMessage, Input, PasswordInput } from '@danvic/ui'
import { BookOpen, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react'
import styles from './auth-layout.module.css'

const features = [
  { icon: BookOpen, label: 'Build structured courses' },
  { icon: ShieldCheck, label: 'Optional authenticator security' },
  { icon: LockKeyhole, label: 'Author-only publishing access' },
]

export function LoginForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Author workspace"
      headline="Turn expertise into clear learning."
      description="Create scheduled live sessions, focused premade courses, modules, and learning attachments in one calm workspace."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<LoginResult>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
            })
            router.push(result.next)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Sign-in failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Welcome back</p>
        <h2>Sign in as an author</h2>
        <p>Use the account from your DANVIC invitation.</p>
        <div className="sb-login-fields">
          <Field label="Work email" required>
            <Input name="email" type="email" autoComplete="username" required />
          </Field>
          <Field label="Password" required>
            <PasswordInput name="password" autoComplete="current-password" required />
          </Field>
          <Button size="lg" busy={busy}>
            Open author workspace
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function TwoFactorForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Second factor"
      headline="Confirm it is really you."
      description="This author account has optional authenticator protection enabled. Enter a current code to continue."
      features={features}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const result = await apiFetch<{ next: string }>('/api/auth/two-factor/verify', {
              method: 'POST',
              body: JSON.stringify({ code: data.get('code') }),
            })
            router.push(result.next)
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Verification failed')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Verification</p>
        <h2>Enter your six-digit code</h2>
        <p>Each authenticator time step can be used only once.</p>
        <div className="sb-login-fields">
          <Field label="Authenticator code" required>
            <CodeInput
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Verify and continue
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AuthLayout
      className={styles.authLayout!}
      eyebrow="Secure invitation"
      headline="Welcome to your author workspace."
      description="Create your account, then start turning field knowledge into practical DANVIC learning."
      features={[{ icon: CheckCircle2, label: 'Single-use invitation' }, ...features.slice(1)]}
    >
      <form
        className="sb-login-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          const password = String(data.get('password') ?? '')
          if (password !== data.get('confirmPassword')) {
            setError('Passwords do not match')
            setBusy(false)
            return
          }
          try {
            await apiFetch('/api/invitations/accept', {
              method: 'POST',
              body: JSON.stringify({
                token,
                firstName: data.get('firstName'),
                lastName: data.get('lastName'),
                password,
              }),
            })
            router.push('/login?invitation=accepted')
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Invitation could not be accepted')
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="sb-page-eyebrow">Create account</p>
        <h2>Accept author invitation</h2>
        <p>Two-factor authentication can be enabled after sign-in.</p>
        <div className="sb-login-fields">
          <div className="sb-form-grid">
            <Field label="First name" required>
              <Input name="firstName" autoComplete="given-name" required />
            </Field>
            <Field label="Last name" required>
              <Input name="lastName" autoComplete="family-name" required />
            </Field>
          </div>
          <Field label="Create password" hint="Between 12 and 128 characters." required>
            <PasswordInput
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password" required>
            <PasswordInput
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button size="lg" busy={busy}>
            Create author account
          </Button>
          <FormMessage>{error}</FormMessage>
        </div>
      </form>
    </AuthLayout>
  )
}
