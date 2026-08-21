'use client'

import { PageHeader } from '@danvic/ui'
import { CourseCreateForm } from '@/components/course-forms'

export default function NewCoursePage() {
  return (
    <>
      <PageHeader
        eyebrow="Course builder"
        title="Create a course"
        description="Provide course details, ordered modules, and optional attachments. Your progress is saved automatically. Proceed with the final assessment, or publish the course as is."
      />
      <CourseCreateForm />
    </>
  )
}