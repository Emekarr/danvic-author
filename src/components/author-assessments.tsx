'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch, type Assessment, type AssessmentAttempt } from '@danvic/api-client'
import { Badge, PageHeader } from '@danvic/ui'
import { useWorkspace } from '@/lib/data'
import { AssessmentsPage } from '@/components/assessments-page'
import { AuthorQuestionBank } from '@/components/content-governance'

export type AssessmentTab = 'overview' | 'pending-review' | 'question-bank'

function LiveAssessmentsOverview() {
  const { assessments, courses, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading assessments…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <AssessmentsPage assessments={assessments} courses={courses} />
}

interface PendingRow {
  assessment: Assessment
  submission: AssessmentAttempt
}

function PendingReviewQueue() {
  const [rows, setRows] = useState<PendingRow[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch<{ assessments?: Assessment[] }>('/api/assessments')
      .then(async (result) => {
        const list = result.assessments ?? []
        const settled = await Promise.all(
          list.map(async (assessment) => {
            try {
              const data = await apiFetch<{ submissions?: AssessmentAttempt[] }>(
                `/api/assessments/${encodeURIComponent(assessment.id)}/submissions`,
              )
              return (data.submissions ?? [])
                .filter((submission) => submission.status === 'pending_review')
                .map((submission) => ({ assessment, submission }))
            } catch {
              return [] as PendingRow[]
            }
          }),
        )
        if (!active) return
        const pending = settled
          .flat()
          .sort(
            (left, right) =>
              new Date(right.submission.submittedAt ?? right.submission.startedAt).getTime() -
              new Date(left.submission.submittedAt ?? left.submission.startedAt).getTime(),
          )
        setRows(pending)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load pending reviews.')
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>
  if (!rows) return <p className="ad-empty-line">Loading pending reviews…</p>

  return (
    <div className="ad-directory-page">
      <PageHeader
        title="Pending Review"
        description="Learner submissions waiting for your review and grading."
      />
      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>Review queue</h2>
            <p>{rows.length} submission(s) awaiting review</p>
          </div>
        </div>
        {rows.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Learner</th>
                  <th>Attempt</th>
                  <th>Submitted</th>
                  <th aria-label="Review actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ assessment, submission }) => (
                  <tr key={submission.id}>
                    <td>
                      <span className="sb-cell-primary">{assessment.title}</span>
                      <span className="sb-cell-secondary">Attempt {submission.attemptNumber}</span>
                    </td>
                    <td>
                      {submission.student
                        ? `${submission.student.firstName} ${submission.student.lastName}`
                        : 'Learner'}
                    </td>
                    <td>
                      <Badge tone="amber" dot>
                        Needs review
                      </Badge>
                    </td>
                    <td>
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString('en-NG')
                        : 'In progress'}
                    </td>
                    <td>
                      <Link
                        className="ad-row-action"
                        href={`/assessments/${encodeURIComponent(assessment.id)}/submissions`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-empty-line">No submissions awaiting review.</p>
        )}
      </section>
    </div>
  )
}

export function AuthorAssessments({ tab }: { tab: AssessmentTab }) {
  if (tab === 'question-bank') return <AuthorQuestionBank />
  if (tab === 'pending-review') return <PendingReviewQueue />
  return <LiveAssessmentsOverview />
}
