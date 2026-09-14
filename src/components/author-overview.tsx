'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { ArrowRight, BookOpen, ClipboardCheck, FileCheck2, Users } from 'lucide-react'
import { dummyContent, dummyAssessments, dummyReviews, dummyTutors, countsByStatus } from '@/lib/author-dummy'

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
  const counts = countsByStatus(dummyContent)
  const pendingReview = dummyReviews.filter((r) => r.status === 'pending').length
  const pendingAssessments = dummyAssessments.filter((a) => a.status === 'pending_review').length
  const tutorsPending = dummyTutors.filter((t) => t.pending > 0).length

  const recentContent = [...dummyContent].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  const pendingContent = dummyContent.filter((c) => c.status === 'pending_review').slice(0, 4)
  const tutorsNeedingUpdate = dummyTutors.filter((t) => t.requiresUpdate > 0).slice(0, 4)

  return (
    <div className="ad-overview">
      <header className="sb-page-header ad-overview-header">
        <div>
          <h1>Author Overview</h1>
          <p>Track content, assessments, reviews and tutors at a glance — dummy data only, no backend.</p>
        </div>
        <div className="sb-page-actions">
          <Link href="/content" className="sb-button sb-button--primary sb-button--md">Manage content</Link>
        </div>
      </header>

      {/* Top stats */}
      <section className="ad-directory" aria-label="Overview stats">
        <div className="ad-directory-grid">
          <StatCard label="Content" value={dummyContent.length} note={`${counts.published} published · ${counts.pending_review} pending`} href="/content" icon={BookOpen} />
          <StatCard label="Assessments" value={dummyAssessments.length} note={`${pendingAssessments} pending review · ${dummyAssessments.filter((a)=>a.type==='quiz').length} quizzes`} href="/assessments" icon={ClipboardCheck} />
          <StatCard label="Content for review" value={pendingReview} note={`${dummyReviews.filter((r)=>r.status==='needs_revision').length} needs revision`} href="/content-review/technical-accuracy" icon={FileCheck2} />
          <StatCard label="Tutors" value={dummyTutors.length} note={`${tutorsPending} with pending · ${tutorsNeedingUpdate.length} need updates`} href="/tutors" icon={Users} />
        </div>
      </section>

      {/* Detailed KPI grids */}
      <section className="ad-section ad-section--plain" style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div style={{ display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--sb-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content — pending review</span>
            <strong style={{ fontSize: 22 }}>{counts.pending_review}</strong>
            <Link href="/content?filter=pending_review" className="ad-text-link" style={{ fontSize: 12 }}>View pending <ArrowRight style={{ width: 12 }} /></Link>
          </div>
          <div style={{ display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--sb-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved</span>
            <strong style={{ fontSize: 22 }}>{counts.approved}</strong>
            <span style={{ fontSize: 12, color: 'var(--sb-subtle)' }}>{counts.published} published</span>
          </div>
          <div style={{ display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--sb-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejected &amp; Archived</span>
            <strong style={{ fontSize: 22 }}>{counts.rejected + counts.archived}</strong>
            <span style={{ fontSize: 12, color: 'var(--sb-subtle)' }}>{counts.rejected} rejected · {counts.archived} archived</span>
          </div>
          <div style={{ display: 'grid', gap: 6, padding: '14px 0', borderBottom: '1px solid var(--sb-border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sb-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Bank</span>
            <strong style={{ fontSize: 22 }}>{8}</strong>
            <Link href="/assessments/question-bank" className="ad-text-link" style={{ fontSize: 12 }}>Open bank <ArrowRight style={{ width: 12 }} /></Link>
          </div>
        </div>
      </section>

      <div className="ad-overview-split">
        <section className="ad-section ad-section--plain ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Recent content</h2>
              <p>Latest updates across all statuses.</p>
            </div>
            <Link className="ad-text-link" href="/content">View all <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="ad-overview-list">
            {recentContent.map((c) => (
              <div className="ad-overview-list-row" key={c.id}>
                <span className="ad-overview-list-copy">
                  <strong>{c.title}</strong>
                  <small>{c.tutor} · {c.courseName} · {new Date(c.updatedAt).toLocaleDateString('en-NG')}</small>
                </span>
                <Badge tone={c.status === 'published' || c.status === 'approved' ? 'green' : c.status === 'rejected' ? 'red' : c.status === 'pending_review' ? 'violet' : c.status === 'archived' ? 'neutral' : 'blue'} dot>
                  {c.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="ad-section ad-section--plain ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Jump to each workspace area.</p>
            </div>
          </div>
          <div className="ad-action-list" style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Content — all with filters', href: '/content' },
              { label: 'Assessments overview', href: '/assessments' },
              { label: 'Content review queues', href: '/content-review/technical-accuracy' },
              { label: 'Version control', href: '/version-control/history' },
              { label: 'Tutors overview', href: '/tutors' },
            ].map((a) => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, padding: '0 12px', border: '1px solid var(--sb-border)', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                <span>{a.label}</span><ArrowRight style={{ width: 14 }} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="ad-overview-split" style={{ marginTop: 8 }}>
        <section className="ad-section ad-section--plain">
          <div className="ad-section-heading">
            <div>
              <h2>Pending review — content</h2>
              <p>{pendingContent.length} items awaiting reviewer.</p>
            </div>
            <Link href="/content?filter=pending_review" className="ad-text-link">View pending <ArrowRight style={{ width: 12 }} /></Link>
          </div>
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead><tr><th>Title</th><th>Tutor</th><th>Type</th></tr></thead>
              <tbody>
                {pendingContent.map((c) => (
                  <tr key={c.id}><td>{c.title}</td><td>{c.tutor}</td><td><Badge tone="violet" dot>Pending</Badge></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="ad-section ad-section--plain">
          <div className="ad-section-heading">
            <div>
              <h2>Tutors requiring updates</h2>
              <p>{tutorsNeedingUpdate.length} tutors with content needing revision.</p>
            </div>
            <Link href="/tutors/requiring-updates" className="ad-text-link">View all <ArrowRight style={{ width: 12 }} /></Link>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {tutorsNeedingUpdate.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--sb-border)' }}>
                <span style={{ display: 'grid' }}><strong style={{ fontSize: 13 }}>{t.name}</strong><small style={{ fontSize: 12, color: 'var(--sb-muted)' }}>{t.requiresUpdate} item(s) · {t.email}</small></span>
                <Badge tone="amber" dot>Needs update</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
