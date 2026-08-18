'use client'

import { useState } from 'react'
import { apiFetch, type AuthorProfile } from '@danvic/api-client'
import { Button, Field, FormMessage, Textarea } from '@danvic/ui'

type ProfileValues = Pick<
  AuthorProfile,
  'bio' | 'linkedInUrl' | 'xUrl' | 'instagramUrl' | 'facebookUrl' | 'websiteUrl'
>

const links: Array<{ key: Exclude<keyof ProfileValues, 'bio'>; label: string }> = [
  { key: 'linkedInUrl', label: 'LinkedIn' },
  { key: 'xUrl', label: 'X' },
  { key: 'instagramUrl', label: 'Instagram' },
  { key: 'facebookUrl', label: 'Facebook' },
  { key: 'websiteUrl', label: 'Personal website' },
]

export function ProfileForm({ author }: { author: AuthorProfile }) {
  const [values, setValues] = useState<ProfileValues>({
    bio: author.bio,
    linkedInUrl: author.linkedInUrl,
    xUrl: author.xUrl,
    instagramUrl: author.instagramUrl,
    facebookUrl: author.facebookUrl,
    websiteUrl: author.websiteUrl,
  })
  const [savedValues, setSavedValues] = useState<ProfileValues>({
    bio: author.bio,
    linkedInUrl: author.linkedInUrl,
    xUrl: author.xUrl,
    instagramUrl: author.instagramUrl,
    facebookUrl: author.facebookUrl,
    websiteUrl: author.websiteUrl,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const unchanged =
    values.bio.trim() === savedValues.bio.trim() &&
    links.every(
      (item) => (values[item.key]?.trim() || null) === (savedValues[item.key]?.trim() || null),
    )

  const update = (key: keyof ProfileValues, value: string) =>
    setValues((current) => ({ ...current, [key]: key === 'bio' ? value : value || null }))

  return (
    <form
      className="ad-profile-form"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setError('')
        setMessage('')
        try {
          const normalizedValues = {
            ...values,
            bio: values.bio.trim(),
            ...Object.fromEntries(links.map(({ key }) => [key, values[key]?.trim() || null])),
          } as ProfileValues
          await apiFetch<{ author: AuthorProfile }>('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(normalizedValues),
          })
          setValues(normalizedValues)
          setSavedValues(normalizedValues)
          setMessage('Your author profile has been saved.')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not save your profile')
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field label="Bio" hint="Tell learners a little about your experience and teaching.">
        <Textarea
          name="bio"
          value={values.bio}
          onChange={(event) => update('bio', event.currentTarget.value)}
          rows={6}
          maxLength={2000}
        />
      </Field>
      <div className="ad-profile-links">
        {links.map(({ key, label }) => (
          <Field key={key} label={label} hint="Optional. Use a full https:// link.">
            <input
              className="sb-input"
              name={key}
              type="url"
              inputMode="url"
              value={values[key] ?? ''}
              onChange={(event) => update(key, event.currentTarget.value)}
              maxLength={500}
              placeholder="https://"
            />
          </Field>
        ))}
      </div>
      <Button busy={busy} disabled={unchanged}>
        Save profile
      </Button>
      <FormMessage tone="success">{message}</FormMessage>
      <FormMessage>{error}</FormMessage>
    </form>
  )
}
