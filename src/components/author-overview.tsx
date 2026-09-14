'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, BookOpen, ClipboardCheck, FileCheck2, Library } from 'lucide-react'
import { apiFetch, type PaginatedResult, type ReviewableContent } from '@danvic/api-client'
import { useWorkspace } from '@/lib/data'

function StatCard({ label, value, note, href, icon: Icon }: { label: string; value: number | string; note: string; href: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="ad-directory-card" style={{ textDecoration: 'none' }}>
      <span className="ad-directory-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon aria-hidden="true" style={{ width: 14, height: 14 }} /> {label}
      </span>
      <strong>{value}</strong>
      <span className="ad-directory-card-note">{note}</span>
    </Link>
  )
}

export function AuthorOverview() {
  const { courses, assessments, sessions, loading, error } = useWorkspace()
  const [questionTotal, setQuestionTotal] = useState<number | null>(null)
  const [contentTotal, setContentTotal] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void apiFetch<PaginatedResult<unknown>>('/api/question-bank?page=1&limit=1')
      .then((result) => {
        if (active) setQuestionTotal(result.page?.total ?? 0)
      })
      .catch(() => {
        if (active) setQuestionTotal(null)
      })
    void apiFetch<PaginatedResult<ReviewableContent>>('/api/content-governance/mine?page=1&limit=1')
      .then((result) => {
        if (active) setContentTotal(result.page?.total ?? 0)
      })
      .catch(() => {
        if (active) setContentTotal(null)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) return <p className="ad-empty-line">Loading your overview…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  const openAssessments = assessments.filter((assessment) => assessment.availability === 'open').length
  const upcomingSessions = sessions.filter((session) => session.status !== 'ended').length
  const recentCourses = [...courses]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)
  const recentAssessments = [...assessments]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="ad-overview">
      <header className="sb-page-header ad-overview-header">
        <div>
          <h1>Author Overview</h1>
          <p>Track your courses, assessments, content status and question bank at a glance.</p>
        </div>
        <div className="sb-page-actions">
          <Link href="/courses/new" className="sb-button sb-button--secondary sb-button--md">Create course</Link>
          <Link href="/assessments/new" className="sb-button sb-button--primary sb-button--md">Create assessment</Link>
        </div>
      </header>

      <section className="ad-directory" aria-label="Overview stats">
        <div className="ad-directory-grid">
          <StatCard label="Courses" value={courses.length} note={`${upcomingSessions} upcoming live sessions`} href="/courses" icon={BookOpen} />
          <StatCard label="Assessments" value={assessments.length} note={`${openAssessments} open`} href="/assessments" icon={ClipboardCheck} />
          <StatCard label="My content" value={contentTotal ?? '—'} note="Drafts, reviews and publications" href="/content-review" icon={FileCheck2} />
          <StatCard label="Question bank" value={questionTotal ?? '—'} note="Draft and reusable questions" href="/assessments/question-bank" icon={Library} />
        </div>
      </section>

      <div className="ad-overview-split">
        <section className="ad-section ad-section--plain ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Recent courses</h2>
              <p>Latest updates across your courses.</p>
            </div>
            <Link className="ad-text-link" href="/courses">View all <ArrowRight aria-hidden="true" /></Link>
          </div>
          {recentCourses.length ? (
            <div className="ad-overview-list">
              {recentCourses.map((course) => (
                <div className="ad-overview-list-row" key={course.id}>
                  <span className="ad-overview-list-copy">
                    <strong>{course.name}</strong>
                    <small>{course.type === 'live' ? 'Live course' : 'Premade course'} · {new Date(course.updatedAt).toLocaleDateString('en-NG')}</small>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ad-empty-state">
              <p className="ad-empty-line">No courses yet. Create your first course.</p>
              <div className="sb-page-actions">
                <Link href="/courses/new" className="sb-button sb-button--primary sb-button--md">Create course</Link>
              </div>
            </div>
          )}
        </section>

        <section className="ad-section ad-section--plain ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Create content and jump to each workspace area.</p>
            </div>
          </div>
          <div className="ad-action-list" style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Create a course', href: '/courses/new' },
              { label: 'Create an assessment', href: '/assessments/new' },
              { label: 'Create a draft question', href: '/assessments/question-bank' },
              { label: 'My content status', href: '/content-review' },
              { label: 'Pending review queue', href: '/assessments/pending-review' },
            ].map((action) => (
              <Link key={action.href + action.label} href={action.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, padding: '0 12px', border: '1px solid var(--sb-border)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <span>{action.label}</span><ArrowRight style={{ width: 14 }} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="ad-overview-split" style={{ marginTop: 8 }}>
        <section className="ad-section ad-section--plain">
          <div className="ad-section-heading">
            <div>
              <h2>Recent assessments</h2>
              <p>Latest updates across your assessments.</p>
            </div>
            <Link href="/assessments" className="ad-text-link">View all <ArrowRight aria-hidden="true" /></Link>
          </div>
          {recentAssessments.length ? (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead><tr><th>Title</th><th>Questions</th><th>Status</th></tr></thead>
                <tbody>
                  {recentAssessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>{assessment.title}</td>
                      <td>{assessment.questions.length}</td>
                      <td style={{ textTransform: 'capitalize' }}>{assessment.availability ?? 'scheduled'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ad-empty-state">
              <p className="ad-empty-line">No assessments yet. Create your first assessment.</p>
              <div className="sb-page-actions">
                <Link href="/assessments/new" className="sb-button sb-button--primary sb-button--md">Create assessment</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
