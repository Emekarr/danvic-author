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

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="sb-login-form-wrap">
      <p className="sb-form-message" data-tone="error">
        {message}
      </p>
    </main>
  )
}

export function CourseRouteView() {
  const query = useSearchParams()
  const courseId = query.get('courseId')?.trim() ?? ''

  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(courseId)) {
    return <ErrorPage message="A valid 26-character course ID is required." />
  }

  return <CourseLiveView courseId={courseId} />
}

export function CourseLiveView({ courseId }: { courseId: string }) {
  const courses = useResource<{ courses: Course[] }>('/api/courses')
  const sessions = useResource<{ sessions: LiveSession[] }>('/api/live/live-sessions')
  const query = useSearchParams()

  if (courses.loading || sessions.loading) return <LoadingPage />
  if (courses.error || sessions.error)
    return <ErrorPage message={courses.error || sessions.error} />

  const course = courses.data?.courses.find((item) => item.id === courseId)
  if (!course) return <ErrorPage message="This course was not found in your author workspace." />
  if (course.type !== 'live')
    return <ErrorPage message="Only live courses can be opened in the course studio." />

  const sessionId = query.get('session')
  const session = sessionId
    ? sessions.data?.sessions.find(
        (item) => item.id === sessionId && item.courseId === course.id,
      ) ?? null
    : null

  return (
    <LiveClassroomLoader courseId={course.id} courseName={course.name} initialSession={session} />
  )
}

export function SessionLiveView({ sessionId }: { sessionId: string }) {
  const sessions = useResource<{ sessions: LiveSession[] }>('/api/live/live-sessions')

  if (sessions.loading) return <LoadingPage />
  if (sessions.error) return <ErrorPage message={sessions.error} />

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
