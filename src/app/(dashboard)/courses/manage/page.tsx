'use client'

import { PageHeader } from '@danvic/ui'
import { AddCourseContentForm } from '@/components/course-forms'
import { useWorkspace } from '@/lib/data'

export default function ManageCoursePage() {
  const { courses, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading your courses…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return (
    <>
      <PageHeader
        eyebrow="Course maintenance"
        title="Add modules or attachments"
        description="Extend an existing course with modules or attachments. Ownership is checked on every request."
      />
      <AddCourseContentForm courses={courses} />
    </>
  )
}