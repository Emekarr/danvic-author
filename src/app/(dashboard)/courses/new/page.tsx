'use client'

import { PageHeader } from '@danvic/ui'
import { CourseCreateForm } from '@/components/course-forms'

export default function NewCoursePage() {
  return (
    <>
      <PageHeader
        eyebrow="Course builder"
        title="Create a course"
        description="Provide course details, ordered modules, and optional attachments. New courses start as drafts and must be submitted for review before publication."
      />
      <CourseCreateForm />
    </>
  )
}
