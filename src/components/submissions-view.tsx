'use client'

import Link from 'next/link'
import { Badge, PageHeader } from '@danvic/ui'
import { ArrowLeft } from 'lucide-react'
import { AssessmentReview } from '@/components/assessment-review'
import { useAssessment, useAssessmentSubmissions } from '@/lib/data'

export function SubmissionsView({ assessmentId }: { assessmentId: string }) {
  const assessment = useAssessment(assessmentId)
  const submissions = useAssessmentSubmissions(assessmentId)

  if (assessment.loading || submissions.loading)
    return <p className="ad-empty-line">Loading assessment submissions…</p>
  if (assessment.error || submissions.error)
    return (
      <p className="ad-empty-line" data-tone="error">
        {assessment.error || submissions.error || 'Could not load assessment submissions.'}
      </p>
    )
  if (!assessment.data) return <p className="ad-empty-line">Assessment not found.</p>

  return (
    <>
      <PageHeader
        eyebrow="Assessment submissions"
        title={assessment.data.title}
        description={`${assessment.data.questions.length} questions · ${assessment.data.durationMinutes} minutes · ${assessment.data.passingScorePercent}% pass mark · ${assessment.data.retrySupported ? `${assessment.data.maxAttempts} attempts allowed` : 'retries disabled'} · ${assessment.data.manualReview ? 'Manual review' : 'Automatic MCQ marking with written responses reviewed manually'}`}
        actions={
          <>
            <Badge tone={assessment.data.courseId ? 'violet' : 'blue'}>
              {assessment.data.courseId ? 'course final' : 'standalone'}
            </Badge>
            <Link href="/assessments" className="sb-button sb-button--ghost sb-button--md">
              <ArrowLeft aria-hidden="true" /> All assessments
            </Link>
          </>
        }
      />
      <AssessmentReview
        assessment={assessment.data}
        submissions={submissions.data?.submissions ?? []}
      />
    </>
  )
}