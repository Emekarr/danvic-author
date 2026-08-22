'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LiveClasses } from '@/components/live-classes'
import { SessionLiveView } from '@/components/dynamic-views'
import { useWorkspace } from '@/lib/data'

export default function LiveClassesPage() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Loading live classes…</p>}>
      <LiveClassesRouteView />
    </Suspense>
  )
}

function LiveClassesRouteView() {
  const query = useSearchParams()
  const sessionId = query.get('sessionId')?.trim() ?? ''
  if (sessionId) return <SessionLiveView sessionId={sessionId} />
  return <LiveClassesIndex />
}

function LiveClassesIndex() {
  const { courses, sessions, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading live classes…</p>
  if (error)
    return (
      <p className="ad-empty-line" data-tone="error">
        {error}
      </p>
    )

  return <LiveClasses courses={courses} sessions={sessions} />
}
