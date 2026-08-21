'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@danvic/ui'
import { AssessmentBuilder } from '@/components/assessment-builder'
import { useWorkspace } from '@/lib/data'

export default function NewAssessmentRoutePage() {
  return (
    <Suspense
      fallback={
        <p className="ad-empty-line">Loading assessment builder…</p>
      }
    >
      <NewAssessmentView />
    </Suspense>
  )
}

function NewAssessmentView() {
  const query = useSearchParams()
  const { courses, loading, error } = useWorkspace()
  const attempts = Math.min(10, Math.max(1, Number(query.get('attempts')) || 2))
  const createWithPendingCourse = query.get('courseDraft') === '1'

  if (loading) return <p className="ad-empty-line">Loading assessment builder…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return (
    <>
      <PageHeader
        eyebrow="Course builder"
        title={createWithPendingCourse ? 'Add the course assessment' : 'Create an assessment'}
        description={
          createWithPendingCourse
            ? 'Finish the assessment, then create the course and its final assessment together.'
            : 'Build the final learning step with course-style details, availability, questions, and review settings.'
        }
      />
      <AssessmentBuilder
        courses={courses}
        initialCourseId={query.get('course') ?? ''}
        initialAttempts={attempts}
        createWithPendingCourse={createWithPendingCourse}
      />
    </>
  )
}
