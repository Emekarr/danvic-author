'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { apiFetch, type Assessment, type AssessmentAttempt, type AuthorPaymentTransaction, type AuthorProfile, type Course, type CourseParticipant, type LiveSession } from '@danvic/api-client'
import { AppShell, Badge, PageHeader } from '@danvic/ui'
import { ArrowLeft, ArrowRight, FilePlus2 } from 'lucide-react'
import { AssessmentBuilder } from '@/components/assessment-builder'
import { AssessmentReview } from '@/components/assessment-review'
import { AcceptInvitationForm, LoginForm, TwoFactorForm } from '@/components/auth-forms'
import { AddCourseContentForm, CourseCreateForm } from '@/components/course-forms'
import { CourseWorkspace } from '@/components/course-workspace'
import { LiveClasses } from '@/components/live-classes'
import { LiveClassroomLoader } from '@/components/live-classroom-loader'
import { LiveCourseSchedule } from '@/components/live-course-schedule'
import { ProfileForm } from '@/components/profile-form'
import { SecuritySetup } from '@/components/security-setup'
import { SessionRenewal } from '@/components/session-renewal'

type Workspace = { author: AuthorProfile; courses: Course[]; participants: CourseParticipant[]; assessments: Assessment[]; transactions: AuthorPaymentTransaction[]; sessions: LiveSession[] }
const empty: Workspace = { author: {} as AuthorProfile, courses: [], participants: [], assessments: [], transactions: [], sessions: [] }
const isAuthPath = (pathname: string) => ['/login', '/two-factor', '/invitations/accept'].includes(pathname)
const formatNaira = (amountKobo: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amountKobo / 100)
const formatStartsIn = (index: number) => ['Starts in 10 mins', 'Starts in 35 mins', 'Starts in 1h 20m', 'Starts tomorrow'][index] ?? 'Upcoming'

export default function AuthorPage() {
  return <Suspense fallback={<main className="sb-login-form-wrap"><p className="sb-form-message">Loading your workspace…</p></main>}><AuthorApp /></Suspense>
}

function AuthorApp() {
  const pathname = usePathname()
  const router = useRouter()
  const query = useSearchParams()
  const [data, setData] = useState<Workspace>(empty)
  const [loading, setLoading] = useState(!isAuthPath(pathname))
  const [error, setError] = useState('')
  const authPage = isAuthPath(pathname)

  useEffect(() => {
    if (authPage) return
    let active = true
    void Promise.all([
      apiFetch<{ author: AuthorProfile }>('/api/auth/me'),
      apiFetch<{ courses: Course[] }>('/api/courses'),
      apiFetch<{ assessments: Assessment[] }>('/api/assessments'),
      apiFetch<{ transactions: AuthorPaymentTransaction[] }>('/api/payments'),
      apiFetch<{ sessions: LiveSession[] }>('/api/live/live-sessions'),
    ]).then(async ([me, courses, assessments, transactions, sessions]) => {
      const lists = await Promise.all(courses.courses.map((course) => apiFetch<{ participants: CourseParticipant[] }>(`/api/courses/${encodeURIComponent(course.id)}/participants`).catch(() => ({ participants: [] }))))
      if (active) setData({ author: me.author, courses: courses.courses, assessments: assessments.assessments, transactions: transactions.transactions, sessions: sessions.sessions, participants: lists.flatMap((value) => value.participants) })
    }).catch((cause: unknown) => {
      if (active) {
        setError(cause instanceof Error ? cause.message : 'Could not load your workspace.')
        router.replace('/login')
      }
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [authPage, router])

  useEffect(() => {
    if (pathname === '/students') router.replace('/courses')
  }, [pathname, router])

  if (pathname === '/login') return <LoginForm />
  if (pathname === '/two-factor') return <TwoFactorForm />
  if (pathname === '/invitations/accept') return <AcceptInvitationForm token={query.get('token') ?? ''} />
  if (pathname === '/students') return null
  if (loading) return <main className="sb-login-form-wrap"><p className="sb-form-message">Loading your workspace…</p></main>
  if (error) return <main className="sb-login-form-wrap"><p className="sb-form-message" data-tone="error">{error}</p></main>
  return <AppShell kind="author" displayName={`${data.author.firstName} ${data.author.lastName}`} email={data.author.email} onLogout={async () => { await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' }) }}><SessionRenewal /><div className="ad-page"><View pathname={pathname} query={query} data={data} /></div></AppShell>
}

function View({ pathname, query, data }: { pathname: string; query: ReturnType<typeof useSearchParams>; data: Workspace }) {
  if (pathname === '/courses') return <CourseWorkspace courses={data.courses} participants={data.participants} />
  if (pathname === '/courses/new') return <><PageHeader eyebrow="Course builder" title="Create a course" description="Provide course details, ordered plain-text modules, and optional attachments in one submission." /><CourseCreateForm /></>
  if (pathname === '/courses/manage') return <><PageHeader eyebrow="Course maintenance" title="Add modules or attachments" description="Extend an existing course with modules or attachments. Ownership is checked on every request." /><AddCourseContentForm courses={data.courses} /></>
  if (pathname === '/live-classes') return <LiveClasses courses={data.courses} sessions={data.sessions} />
  if (pathname.startsWith('/courses/') || pathname.startsWith('/live-classes/')) {
    const courseId = pathname.startsWith('/courses/') ? pathname.split('/')[2] ?? null : null
    const sessionId = pathname.startsWith('/live-classes/') ? pathname.split('/')[2] : query.get('session')
    const session = data.sessions.find((item) => item.id === sessionId) ?? null
    const course = data.courses.find((item) => item.id === courseId)
    return <LiveClassroomLoader courseId={courseId} courseName={course?.name ?? 'Standalone live class'} initialSession={session} />
  }
  if (pathname === '/profile') return <><PageHeader title="Author profile" description="Share a short bio and the links you want administrators and learners to see." /><section className="ad-section ad-section--plain ad-profile-section"><ProfileForm author={data.author} /></section></>
  if (pathname === '/security') return <><PageHeader title="Security settings" /><SecuritySetup enabled={data.author.twoFactorEnabled} /></>
  if (pathname === '/assessments/new') return <><PageHeader eyebrow="Course builder" title="Create an assessment" description="Build the final learning step with course-style details, availability, questions, and review settings." /><AssessmentBuilder courses={data.courses} initialCourseId={query.get('course') ?? ''} initialAttempts={Math.min(10, Math.max(1, Number(query.get('attempts')) || 2))} /></>
  if (pathname.startsWith('/assessments/') && pathname.endsWith('/submissions')) return <SubmissionPage assessmentId={pathname.split('/')[2] ?? ''} />
  if (pathname === '/assessments') return <Assessments assessments={data.assessments} courses={data.courses} />
  if (pathname === '/payments') return <Payments transactions={data.transactions} />
  return <Overview data={data} />
}

function Overview({ data }: { data: Workspace }) {
  const live = data.courses.filter((course) => course.type === 'live')
  const upcomingLive = live.filter((course) => course.scheduledAt && new Date(course.scheduledAt) > new Date()).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
  const scheduled = data.courses.filter((course) => course.scheduledAt)
  const openAssessments = data.assessments.filter((assessment) => assessment.availability === 'open')
  const directory = [
    { label: 'Courses', value: data.courses.length, href: '/courses', note: `${live.length} live · ${data.courses.filter((course) => course.accessType === 'paid').length} paid` },
    { label: 'Live courses', value: live.length, href: '/courses', note: `${scheduled.length} scheduled` },
    { label: 'Assessments', value: data.assessments.length, href: '/assessments', note: `${openAssessments.length} open now` },
    { label: 'Transactions', value: data.transactions.length, href: '/payments', note: `${data.transactions.filter((transaction) => transaction.status === 'succeeded').length} succeeded` },
  ]
  const recentCourses = [...data.courses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const actions = [{ label: 'Create a course', href: '/courses/new' }, { label: 'Add course content', href: '/courses/manage' }, { label: 'Create an assessment', href: '/assessments/new' }, { label: 'Invite students', href: '/students' }]
  return <div className="ad-overview">
    <header className="sb-page-header ad-overview-header"><h1>Overview</h1><div className="sb-page-actions"><Link href="/courses/new" className="sb-button sb-button--primary sb-button--md"><FilePlus2 aria-hidden="true" /> Create course</Link></div></header>
    <section className="ad-directory" aria-label="Workspace overview"><div className="ad-directory-grid">{directory.map((entry) => <Link className="ad-directory-card" href={entry.href} key={entry.label}><span className="ad-directory-card-label">{entry.label}</span><strong>{entry.value}</strong><span className="ad-directory-card-note">{entry.note}</span></Link>)}</div></section>
    <LiveCourseSchedule courses={upcomingLive} startsIn={upcomingLive.map((_, index) => formatStartsIn(index))} />
    <div className="ad-overview-split"><section className="ad-overview-section"><div className="ad-section-heading"><div><h2>Recent courses</h2><p>The newest learning you have published.</p></div><Link className="ad-text-link" href="/courses">View all <ArrowRight aria-hidden="true" /></Link></div>{recentCourses.length ? <div className="ad-overview-list">{recentCourses.map((course) => <Link className="ad-overview-list-row" href={course.type === 'live' ? `/courses/${course.id}/live` : '/courses'} target={course.type === 'live' ? '_blank' : undefined} rel={course.type === 'live' ? 'noopener noreferrer' : undefined} key={course.id}><span className="ad-overview-list-copy"><strong>{course.name}</strong><small>{new Date(course.createdAt).toLocaleDateString('en-NG')}</small></span><Badge tone={course.type === 'live' ? 'violet' : 'blue'}>{course.type === 'live' ? 'Live' : 'Premade'}</Badge></Link>)}</div> : <p className="ad-empty-line">No courses yet. Create your first course to begin.</p>}</section>
    <section className="ad-overview-section"><div className="ad-section-heading"><div><h2>Quick actions</h2><p>Jump straight into the most common author tasks.</p></div></div><div className="ad-action-list">{actions.map((action) => <Link href={action.href} key={action.href}><span>{action.label}</span><ArrowRight aria-hidden="true" /></Link>)}</div></section></div>
  </div>
}

function Assessments({ assessments, courses }: { assessments: Assessment[]; courses: Course[] }) {
  const courseNames = new Map(courses.map((course) => [course.id, course.name]))
  return <div className="ad-directory-page"><header className="sb-page-header"><h1>Assessments</h1><div className="sb-page-actions"><Link href="/assessments/new" className="sb-button sb-button--primary sb-button--md"><FilePlus2 aria-hidden="true" /> Create assessment</Link></div></header><section className="ad-section ad-section--plain"><div className="ad-section-heading"><div><h2>All assessments</h2><p>{assessments.length} total · {assessments.filter((assessment) => assessment.availability === 'open').length} open</p></div></div>{assessments.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Assessment</th><th>Status</th><th>Questions</th><th>Duration</th><th>Pass mark</th><th>Attempts</th><th>Submissions</th><th aria-label="Assessment actions" /></tr></thead><tbody>{assessments.map((assessment) => { const status = assessment.availability ?? 'scheduled'; return <tr key={assessment.id}><td><span className="sb-cell-primary">{assessment.title}</span><span className="sb-cell-secondary">{assessment.courseId ? `Final for ${courseNames.get(assessment.courseId) ?? 'linked course'}` : 'Standalone assessment'}</span></td><td><Badge dot tone={status === 'open' ? 'green' : status === 'scheduled' ? 'blue' : 'neutral'}>{status}</Badge></td><td>{assessment.questions.length}</td><td>{assessment.durationMinutes} min</td><td>{assessment.passingScorePercent}%</td><td>{assessment.retrySupported ? `Up to ${assessment.maxAttempts}` : 'Single attempt'}</td><td>{assessment.submissionCount ?? 0}</td><td><Link className="ad-row-action" href={`/assessments/${assessment.id}/submissions`}>View <ArrowRight aria-hidden="true" /></Link></td></tr> })}</tbody></table></div> : <p className="ad-empty-line">No assessments yet. Create your first assessment.</p>}</section></div>
}

function Payments({ transactions }: { transactions: AuthorPaymentTransaction[] }) {
  return <div className="ad-directory-page"><header className="sb-page-header"><h1>Course transaction log</h1></header><section className="ad-section ad-section--plain"><div className="ad-section-heading"><div><h2>All transactions</h2><p>{transactions.length} total · Paystack payments for courses owned by this author account.</p></div></div>{transactions.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Date / reference</th><th>Course / learner</th><th>Amount / fees</th><th>Adapter / method</th><th>Instrument</th><th>Status</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td><strong>{new Date(transaction.createdAt).toLocaleString()}</strong><span className="sb-cell-secondary">{transaction.reference}</span></td><td><strong>{transaction.courseId ?? '—'}</strong><span className="sb-cell-secondary">{transaction.customerEmail}</span></td><td><strong>{formatNaira(transaction.amountKobo)}</strong><span className="sb-cell-secondary">Fees: {transaction.feesKobo === null ? '—' : formatNaira(transaction.feesKobo)}</span></td><td><strong>{transaction.adapter}</strong><span className="sb-cell-secondary">{transaction.paymentMethod ?? 'Pending selection'}</span></td><td><strong>{transaction.cardBrand ?? transaction.cardType ?? transaction.bankName ?? '—'}</strong><span className="sb-cell-secondary">{transaction.cardLast4 ? `Ending ${transaction.cardLast4}` : transaction.accountName}</span></td><td><Badge tone={transaction.status === 'succeeded' ? 'green' : 'violet'} dot>{transaction.status}</Badge>{transaction.gatewayResponse ? <span className="sb-cell-secondary">{transaction.gatewayResponse}</span> : null}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No course transactions have been recorded.</p>}</section></div>
}

function SubmissionPage({ assessmentId }: { assessmentId: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [submissions, setSubmissions] = useState<AssessmentAttempt[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void Promise.all([apiFetch<Assessment>(`/api/assessments/${encodeURIComponent(assessmentId)}`), apiFetch<{ submissions: AssessmentAttempt[] }>(`/api/assessments/${encodeURIComponent(assessmentId)}/submissions`)]).then(([item, result]) => { if (active) { setAssessment(item); setSubmissions(result.submissions) } }).catch((cause: unknown) => active && setError(cause instanceof Error ? cause.message : 'Could not load assessment submissions.'))
    return () => { active = false }
  }, [assessmentId])
  if (!assessment) return <p className="ad-empty-line">{error || 'Loading assessment submissions…'}</p>
  return <><PageHeader eyebrow="Assessment submissions" title={assessment.title} description={`${assessment.questions.length} questions · ${assessment.durationMinutes} minutes · ${assessment.passingScorePercent}% pass mark · ${assessment.retrySupported ? `${assessment.maxAttempts} attempts allowed` : 'retries disabled'} · ${assessment.manualReview ? 'Manual review' : 'Automatic MCQ marking with written responses reviewed manually'}`} actions={<><Badge tone={assessment.courseId ? 'violet' : 'blue'}>{assessment.courseId ? 'course final' : 'standalone'}</Badge><Link href="/assessments" className="sb-button sb-button--ghost sb-button--md"><ArrowLeft aria-hidden="true" /> All assessments</Link></>} /><AssessmentReview assessment={assessment} submissions={submissions} /></>
}
