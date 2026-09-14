'use client'

import { useEffect } from 'react'
import { notFound, usePathname, useRouter } from 'next/navigation'
import { SessionLiveView } from '@/components/dynamic-views'
import { SubmissionsView } from '@/components/submissions-view'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContentReviewDetail } from '@/components/content-governance'

export function CatchAllClient() {
  const pathname = usePathname()

  if (pathname === '/') return <RootRedirect />

  const sessionLive = pathname.match(/^\/live-classes\/([^/]+)$/)
  if (sessionLive) return <SessionLiveView sessionId={sessionLive[1] ?? ''} />

  const submissions = pathname.match(/^\/assessments\/([^/]+)\/submissions$/)
  if (submissions)
    return (
      <DashboardShell>
        <SubmissionsView assessmentId={submissions[1] ?? ''} />
      </DashboardShell>
    )

  const contentReview = pathname.match(/^\/content-review\/([^/]+)(?:\/(versions|update))?$/)
  if (contentReview)
    return (
      <DashboardShell>
        <ContentReviewDetail
          contentId={decodeURIComponent(contentReview[1] ?? '')}
          update={contentReview[2] === 'update'}
        />
      </DashboardShell>
    )

  notFound()
}

function RootRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  return (
    <main className="sb-login-form-wrap">
      <p className="sb-form-message">Loading your workspace…</p>
    </main>
  )
}
