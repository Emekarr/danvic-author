'use client'

import { notFound, useSearchParams } from 'next/navigation'
import type { Course, LiveSession } from '@danvic/api-client'
import { LiveClassroomLoader } from '@/components/live-classroom-loader'
import { DashboardShell } from '@/components/dashboard-shell'
import { useResource } from '@/lib/data'

function LoadingPage() {
  return (
    <main className="sb-login-form-wrap">
      <p className="sb-form-message">Loading your workspace…</p>
    </main>
  )
}

export function CourseLiveView({ courseId }: { courseId: string }) {
  const courses = useResource<{ courses: Course[] }>('/api/courses')
  const sessions = useResource<{ sessions: LiveSession[] }>('/api/live/live-sessions')
  const query = useSearchParams()

  if (courses.loading || sessions.loading) return <LoadingPage />

  const course = courses.data?.courses.find((item) => item.id === courseId)
  if (!course) notFound()

  const sessionId = query.get('session')
  const session = sessionId
    ? sessions.data?.sessions.find((item) => item.id === sessionId) ?? null
    : null

  return (
    <LiveClassroomLoader courseId={course.id} courseName={course.name} initialSession={session} />
  )
}

export function SessionLiveView({ sessionId }: { sessionId: string }) {
  const sessions = useResource<{ sessions: LiveSession[] }>('/api/live/live-sessions')

  if (sessions.loading) return <LoadingPage />

  const session = sessions.data?.sessions.find((item) => item.id === sessionId)
  if (!session) notFound()

  return (
    <DashboardShell>
      <LiveClassroomLoader
        courseId={null}
        courseName="Standalone live class"
        initialSession={session}
      />
    </DashboardShell>
  )
}