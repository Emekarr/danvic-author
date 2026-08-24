'use client'

import { notFound, useSearchParams } from 'next/navigation'
import type { CourseAggregate, LiveSession } from '@danvic/api-client'
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
  const course = useResource<CourseAggregate>(`/api/courses/${encodeURIComponent(courseId)}`)
  const sessions = useResource<{ sessions: LiveSession[] }>('/api/live/live-sessions')
  const query = useSearchParams()

  if (course.loading || sessions.loading) return <LoadingPage />
  if (course.error || sessions.error) return <ErrorPage message={course.error || sessions.error} />

  const resolvedCourse = course.data?.course
  if (!resolvedCourse)
    return <ErrorPage message="This course was not found in your author workspace." />

  const sessionId = query.get('session')
  const session = sessionId
    ? (sessions.data?.sessions.find(
        (item) => item.id === sessionId && item.courseId === resolvedCourse.id,
      ) ?? null)
    : null

  return (
    <LiveClassroomLoader
      courseId={resolvedCourse.id}
      courseName={resolvedCourse.name}
      initialSession={session}
    />
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
