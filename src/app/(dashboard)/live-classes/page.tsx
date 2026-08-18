'use client'

import { LiveClasses } from '@/components/live-classes'
import { useWorkspace } from '@/lib/data'

export default function LiveClassesPage() {
  const { courses, sessions, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading live classes…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <LiveClasses courses={courses} sessions={sessions} />
}