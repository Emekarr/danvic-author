'use client'

import { PageHeader } from '@danvic/ui'
import { CourseCreateForm } from '@/components/course-forms'

export default function NewCoursePage() {
  return (
    <>
      <PageHeader
        eyebrow="Course builder"
        title="Create a course"
        description="Provide course details, ordered modules, and optional attachments. New courses enter the Content Assessment queue immediately before publication."
      />
      <CourseCreateForm />
    </>
  )
}
