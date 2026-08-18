'use client'

import dynamic from 'next/dynamic'
import type { LiveSession } from '@danvic/api-client'

const AuthorLiveClassroom = dynamic(
  () => import('./live-classroom').then((module) => module.AuthorLiveClassroom),
  { ssr: false },
)

export function LiveClassroomLoader({
  courseId,
  courseName,
  initialSession,
}: {
  courseId: string | null
  courseName: string
  initialSession: LiveSession | null
}) {
  return (
    <AuthorLiveClassroom
      courseId={courseId}
      courseName={courseName}
      initialSession={initialSession}
    />
  )
}
