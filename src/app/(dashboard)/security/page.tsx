'use client'

import { PageHeader } from '@danvic/ui'
import { SecuritySetup } from '@/components/security-setup'
import { useAuthor } from '@/lib/data'

export default function SecurityPage() {
  const { author, loading, error } = useAuthor()

  if (loading) return <p className="ad-empty-line">Loading security settings…</p>
  if (error || !author)
    return <p className="ad-empty-line" data-tone="error">{error || 'Could not load security settings.'}</p>

  return (
    <>
      <PageHeader title="Security settings" />
      <SecuritySetup enabled={author.twoFactorEnabled} />
    </>
  )
}