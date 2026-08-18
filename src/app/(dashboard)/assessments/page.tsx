'use client'

import { AssessmentsPage } from '@/components/assessments-page'
import { useWorkspace } from '@/lib/data'

export default function AssessmentsRoutePage() {
  const { assessments, courses, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading assessments…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <AssessmentsPage assessments={assessments} courses={courses} />
}