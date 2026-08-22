'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { ArrowRight, FilePlus2 } from 'lucide-react'
import type { Assessment, Course } from '@danvic/api-client'
import { assessmentSubmissionsHref } from '@/lib/course-route'

export function AssessmentsPage({
  assessments,
  courses,
}: {
  assessments: Assessment[]
  courses: Course[]
}) {
  const courseNames = new Map(courses.map((course) => [course.id, course.name]))
  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <h1>Assessments</h1>
        <div className="sb-page-actions">
          <Link href="/assessments/new" className="sb-button sb-button--primary sb-button--md">
            <FilePlus2 aria-hidden="true" /> Create assessment
          </Link>
        </div>
      </header>
      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>All assessments</h2>
            <p>
              {assessments.length} total ·{' '}
              {assessments.filter((assessment) => assessment.availability === 'open').length} open
            </p>
          </div>
        </div>
        {assessments.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Duration</th>
                  <th>Pass mark</th>
                  <th>Attempts</th>
                  <th>Submissions</th>
                  <th aria-label="Assessment actions" />
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => {
                  const status = assessment.availability ?? 'scheduled'
                  return (
                    <tr key={assessment.id}>
                      <td>
                        <span className="sb-cell-primary">{assessment.title}</span>
                        <span className="sb-cell-secondary">
                          {assessment.courseId
                            ? `Final for ${courseNames.get(assessment.courseId) ?? 'linked course'}`
                            : 'Standalone assessment'}
                        </span>
                      </td>
                      <td>
                        <Badge
                          dot
                          tone={
                            status === 'open'
                              ? 'green'
                              : status === 'scheduled'
                                ? 'blue'
                                : 'neutral'
                          }
                        >
                          {status}
                        </Badge>
                      </td>
                      <td>{assessment.questions.length}</td>
                      <td>{assessment.durationMinutes} min</td>
                      <td>{assessment.passingScorePercent}%</td>
                      <td>
                        {assessment.retrySupported
                          ? `Up to ${assessment.maxAttempts}`
                          : 'Single attempt'}
                      </td>
                      <td>{assessment.submissionCount ?? 0}</td>
                      <td>
                        <Link
                          className="ad-row-action"
                          href={assessmentSubmissionsHref(assessment.id)}
                        >
                          View <ArrowRight aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-empty-line">No assessments yet. Create your first assessment.</p>
        )}
      </section>
    </div>
  )
}
