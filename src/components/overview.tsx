'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { ArrowRight, FilePlus2 } from 'lucide-react'
import type { Assessment, AuthorPaymentTransaction, Course } from '@danvic/api-client'
import { LiveCourseSchedule } from '@/components/live-course-schedule'

const formatStartsIn = (index: number) =>
  ['Starts in 10 mins', 'Starts in 35 mins', 'Starts in 1h 20m', 'Starts tomorrow'][index] ??
  'Upcoming'

export function Overview({
  courses,
  assessments,
  transactions,
}: {
  courses: Course[]
  assessments: Assessment[]
  transactions: AuthorPaymentTransaction[]
}) {
  const live = courses.filter((course) => course.type === 'live')
  const upcomingLive = live
    .filter((course) => course.scheduledAt && new Date(course.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
  const startsIn = upcomingLive.map((_, index) => formatStartsIn(index))
  const scheduled = courses.filter((course) => course.scheduledAt)
  const openAssessments = assessments.filter(
    (assessment) => assessment.availability === 'open',
  )

  const directory = [
    {
      label: 'Courses',
      value: courses.length,
      href: '/courses',
      note: `${live.length} live · ${courses.filter((course) => course.accessType === 'paid').length} paid`,
    },
    {
      label: 'Live courses',
      value: live.length,
      href: '/courses',
      note: `${scheduled.length} scheduled`,
    },
    {
      label: 'Assessments',
      value: assessments.length,
      href: '/assessments',
      note: `${openAssessments.length} open now`,
    },
    {
      label: 'Transactions',
      value: transactions.length,
      href: '/payments',
      note: `${transactions.filter((transaction) => transaction.status === 'succeeded').length} succeeded`,
    },
  ]

  const recentCourses = [...courses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const actions = [
    { label: 'Create a course', href: '/courses/new' },
    { label: 'Add course content', href: '/courses/manage' },
    { label: 'Create an assessment', href: '/assessments/new' },
    { label: 'Invite students', href: '/students' },
  ]

  return (
    <div className="ad-overview">
      <header className="sb-page-header ad-overview-header">
        <h1>Overview</h1>
        <div className="sb-page-actions">
          <Link href="/courses/new" className="sb-button sb-button--primary sb-button--md">
            <FilePlus2 aria-hidden="true" /> Create course
          </Link>
        </div>
      </header>

      <section className="ad-directory" aria-label="Workspace overview">
        <div className="ad-directory-grid">
          {directory.map((entry) => (
            <Link className="ad-directory-card" href={entry.href} key={entry.label}>
              <span className="ad-directory-card-label">{entry.label}</span>
              <strong>{entry.value}</strong>
              <span className="ad-directory-card-note">{entry.note}</span>
            </Link>
          ))}
        </div>
      </section>

      <LiveCourseSchedule courses={upcomingLive} startsIn={startsIn} />

      <div className="ad-overview-split">
        <section className="ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Recent courses</h2>
              <p>The newest learning you have published.</p>
            </div>
            <Link className="ad-text-link" href="/courses">
              View all <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {recentCourses.length ? (
            <div className="ad-overview-list">
              {recentCourses.map((course) => (
                <Link
                  className="ad-overview-list-row"
                  href={course.type === 'live' ? `/courses/${course.id}/live` : '/courses'}
                  target={course.type === 'live' ? '_blank' : undefined}
                  rel={course.type === 'live' ? 'noopener noreferrer' : undefined}
                  key={course.id}
                >
                  <span className="ad-overview-list-copy">
                    <strong>{course.name}</strong>
                    <small>{new Date(course.createdAt).toLocaleDateString('en-NG')}</small>
                  </span>
                  <Badge tone={course.type === 'live' ? 'violet' : 'blue'}>
                    {course.type === 'live' ? 'Live' : 'Premade'}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="ad-empty-line">No courses yet. Create your first course to begin.</p>
          )}
        </section>

        <section className="ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Jump straight into the most common author tasks.</p>
            </div>
          </div>
          <div className="ad-action-list">
            {actions.map((action) => (
              <Link href={action.href} key={action.href}>
                <span>{action.label}</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}