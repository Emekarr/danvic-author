'use client'

import { PageHeader } from '@danvic/ui'
import { ProfileForm } from '@/components/profile-form'
import { useAuthor } from '@/lib/data'

export default function ProfilePage() {
  const { author, loading, error } = useAuthor()

  if (loading) return <p className="ad-empty-line">Loading your profile…</p>
  if (error || !author)
    return <p className="ad-empty-line" data-tone="error">{error || 'Could not load your profile.'}</p>

  return (
    <>
      <PageHeader
        title="Author profile"
        description="Share a short bio and the links you want administrators and learners to see."
      />
      <section className="ad-section ad-section--plain ad-profile-section">
        <ProfileForm author={author} />
      </section>
    </>
  )
}