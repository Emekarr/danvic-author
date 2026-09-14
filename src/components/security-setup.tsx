'use client'

import Image from 'next/image'
import { useState } from 'react'
import { apiFetch } from '@danvic/api-client'
import { Badge, Button, Field, FormMessage, PasswordInput } from '@danvic/ui'
import { Check, Fingerprint } from 'lucide-react'
import { TwoFactorCodeInput } from './two-factor-code-input'

export function SecuritySetup({ enabled }: { enabled: boolean }) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(enabled)
  const [tab, setTab] = useState<'password' | 'two-factor'>('password')
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [setupCode, setSetupCode] = useState('')
  return (
    <div className="ad-security-layout">
      <section className="ad-security-details">
        <div className="ad-section-heading">
          <div>
            <h2>Security details</h2>
          </div>
          <Badge dot tone={twoFactorEnabled ? 'green' : 'amber'}>
            {twoFactorEnabled ? 'Protected' : 'At risk'}
          </Badge>
        </div>
        <dl className="ad-details">
          <div>
            <dt>Two-factor</dt>
            <dd>{twoFactorEnabled ? 'Enabled' : 'Not enabled'}</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>Required at sign-in</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>Course author</dd>
          </div>
        </dl>
      </section>

      <div className="ad-security-tabs" role="tablist" aria-label="Security settings">
        <button
          type="button"
          role="tab"
          className="ad-security-tab"
          aria-selected={tab === 'password'}
          onClick={() => setTab('password')}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          className="ad-security-tab"
          aria-selected={tab === 'two-factor'}
          onClick={() => setTab('two-factor')}
        >
          Two-factor
        </button>
      </div>

      {tab === 'password' ? (
        <section className="ad-section ad-section--plain ad-security-panel" role="tabpanel">
          <div className="ad-section-heading">
            <div>
              <h2>Change password</h2>
              <p>
                Author password changes will become available here when the author account password
                endpoint is enabled.
              </p>
            </div>
          </div>
          <form
            className="ad-security-form"
            onSubmit={(event) => {
              event.preventDefault()
              setError('Password changes are not available for author accounts yet.')
            }}
          >
            <Field label="Current password" required>
              <PasswordInput name="currentPassword" autoComplete="current-password" required />
            </Field>
            <Field label="New password" hint="Use between 12 and 128 characters." required>
              <PasswordInput
                name="newPassword"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Confirm new password" required>
              <PasswordInput
                name="confirmPassword"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </Field>
            <Button>Update password</Button>
            <FormMessage>{error}</FormMessage>
          </form>
        </section>
      ) : null}

      {tab === 'two-factor' ? (
        <section className="ad-section ad-section--plain ad-security-panel" role="tabpanel">
          <div className="ad-section-heading">
            <div>
              <h2>Two-factor authentication</h2>
              <p>An extra layer of protection for this author account.</p>
            </div>
          </div>
          <div className="ad-security-2fa">
            <div className="ad-security-2fa-head">
              <span className="ad-security-2fa-icon" data-on={twoFactorEnabled || undefined}>
                <Fingerprint aria-hidden="true" />
              </span>
              <div>
                <h3>{twoFactorEnabled ? 'Authenticator enabled' : 'Authenticator not configured'}</h3>
                <p>
                  {twoFactorEnabled
                    ? 'A one-time code from your authenticator app is required whenever you sign in.'
                    : 'Set up an authenticator app. Two-factor authentication is required for every tutor account.'}
                </p>
              </div>
            </div>
            <ul className="ad-security-checks">
              {twoFactorEnabled ? (
                <>
                  <li>
                    <Check aria-hidden="true" /> A one-time code is required at every sign-in
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Codes are generated by your authenticator app
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Protects against stolen or reused passwords
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Check aria-hidden="true" /> Required for every course author
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Uses one-time codes from an authenticator app
                  </li>
                  <li>
                    <Check aria-hidden="true" /> Required at every sign-in
                  </li>
                </>
              )}
            </ul>
          </div>
          {!twoFactorEnabled ? (
            !setup ? (
              <Button
                busy={busy}
                onClick={async () => {
                  setBusy(true)
                  setError('')
                  try {
                    setSetup(
                      await apiFetch('/api/auth/2fa/setup', {
                        method: 'POST',
                        body: '{}',
                      }),
                    )
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'Could not begin setup')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Set up two-factor authentication
              </Button>
            ) : (
              <form
                className="ad-security-form"
                onSubmit={async (event) => {
                  event.preventDefault()
                  setBusy(true)
                  setError('')
                  try {
                    await apiFetch('/api/auth/2fa/confirm', {
                      method: 'POST',
                      body: JSON.stringify({ code: setupCode }),
                    })
                    setSetupCode('')
                    setSetup(null)
                    setTwoFactorEnabled(true)
                    setMessage('Two-factor authentication is now enabled.')
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'Could not confirm setup')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Image
                  className="sb-qr"
                  src={setup.qrCodeDataUrl}
                  alt="DANVIC author authenticator QR code"
                  width={220}
                  height={220}
                  unoptimized
                />
                <p className="sb-form-message" data-tone="info">
                  Manual key: <strong>{setup.secret}</strong>
                </p>
                <Field label="Authenticator code" required>
                  <TwoFactorCodeInput
                    name="code"
                    value={setupCode}
                    onChange={setSetupCode}
                  />
                </Field>
                <Button busy={busy} disabled={busy || setupCode.length !== 6}>Confirm authenticator</Button>
              </form>
            )
          ) : null}
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
        </section>
      ) : null}
    </div>
  )
}
