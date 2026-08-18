'use client'

import { useEffect } from 'react'
import { notFound, usePathname, useRouter } from 'next/navigation'
import { CourseLiveView, SessionLiveView } from '@/components/dynamic-views'
import { SubmissionsView } from '@/components/submissions-view'
import { DashboardShell } from '@/components/dashboard-shell'

export function CatchAllClient() {
  const pathname = usePathname()

  if (pathname === '/') return <RootRedirect />

  const courseLive = pathname.match(/^\/courses\/([^/]+)\/live$/)
  if (courseLive) return <CourseLiveView courseId={courseLive[1] ?? ''} />

  const sessionLive = pathname.match(/^\/live-classes\/([^/]+)$/)
  if (sessionLive) return <SessionLiveView sessionId={sessionLive[1] ?? ''} />

  const submissions = pathname.match(/^\/assessments\/([^/]+)\/submissions$/)
  if (submissions)
    return (
      <DashboardShell>
        <SubmissionsView assessmentId={submissions[1] ?? ''} />
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