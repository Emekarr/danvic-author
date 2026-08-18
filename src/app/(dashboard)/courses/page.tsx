'use client'

import { CourseWorkspace } from '@/components/course-workspace'
import { useWorkspace } from '@/lib/data'

export default function CoursesPage() {
  const { courses, participants, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading your courses…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <CourseWorkspace courses={courses} participants={participants} />
}