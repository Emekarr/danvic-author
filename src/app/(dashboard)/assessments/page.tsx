'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AssessmentsPage } from '@/components/assessments-page'
import { SubmissionsView } from '@/components/submissions-view'
import { useWorkspace } from '@/lib/data'

export default function AssessmentsRoutePage() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Loading assessments…</p>}>
      <AssessmentsRouteView />
    </Suspense>
  )
}

function AssessmentsRouteView() {
  const query = useSearchParams()
  const assessmentId = query.get('assessmentId')?.trim() ?? ''
  if (assessmentId) return <SubmissionsView assessmentId={assessmentId} />
  return <AssessmentsIndex />
}

function AssessmentsIndex() {
  const { assessments, courses, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading assessments…</p>
  if (error)
    return (
      <p className="ad-empty-line" data-tone="error">
        {error}
      </p>
    )

  return <AssessmentsPage assessments={assessments} courses={courses} />
}
