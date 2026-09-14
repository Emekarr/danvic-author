'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { dummyTutors, dummyContent } from '@/lib/author-dummy'

type Tab = 'overview' | 'all' | 'pending' | 'approved' | 'rejected' | 'requiring-updates'

const tabLabels: Record<Tab, string> = {
  overview: 'Overview',
  all: 'All Tutors',
  pending: 'Tutors with Pending Content',
  approved: 'Tutors with Approved Content',
  rejected: 'Tutors with Rejected Content',
  'requiring-updates': 'Tutors with Content Requiring Updates',
}

const tabs: Tab[] = ['overview','all','pending','approved','rejected','requiring-updates']

export function AuthorTutors({ tab }: { tab: Tab }) {
  let list = dummyTutors
  if (tab === 'pending') list = dummyTutors.filter((t) => t.pending > 0)
  if (tab === 'approved') list = dummyTutors.filter((t) => t.approved > 0)
  if (tab === 'rejected') list = dummyTutors.filter((t) => t.rejected > 0)
  if (tab === 'requiring-updates') list = dummyTutors.filter((t) => t.requiresUpdate > 0)

  const totalPendingContent = dummyTutors.reduce((s, t) => s + t.pending, 0)
  const totalApproved = dummyTutors.reduce((s, t) => s + t.approved, 0)
  const totalRequiring = dummyTutors.reduce((s, t) => s + t.requiresUpdate, 0)

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Tutors — {tabLabels[tab]}</h1>
          <p>Dummy tutor roster aggregated from content statuses.</p>
        </div>
      </header>
      <div className="ad-security-tabs" style={{ overflowX: 'auto' }}>
        {tabs.map((t) => (
          <Link key={t} href={t==='overview' ? '/tutors' : `/tutors/${t}`} className="ad-security-tab" aria-selected={tab===t} style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>{tabLabels[t]}</Link>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="ad-section ad-section--plain">
          <div className="ad-directory-grid">
            <div className="ad-directory-card"><span className="ad-directory-card-label">All Tutors</span><strong>{dummyTutors.length}</strong><span className="ad-directory-card-note">{dummyContent.length} pieces of content</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Pending Content</span><strong>{totalPendingContent}</strong><span className="ad-directory-card-note">{dummyTutors.filter(t=>t.pending>0).length} tutors</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Approved</span><strong>{totalApproved}</strong><span className="ad-directory-card-note">{dummyTutors.filter(t=>t.approved>0).length} tutors</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Requiring Updates</span><strong>{totalRequiring}</strong><span className="ad-directory-card-note">{dummyTutors.filter(t=>t.requiresUpdate>0).length} tutors</span></div>
          </div>
        </section>
      ) : null}

      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>{tabLabels[tab]}</h2>
            <p>{list.length} tutor(s)</p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead><tr><th>Tutor</th><th>Total</th><th>Pending</th><th>Approved</th><th>Rejected</th><th>Requiring Updates</th><th>Published</th><th>Last Active</th></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'var(--sb-primary-soft)', color: 'var(--sb-primary-strong)', fontSize: 11, fontWeight: 800 }}>{t.avatar}</span>
                      <span style={{ display: 'grid' }}><strong style={{ fontSize: 13 }}>{t.name}</strong><small style={{ color: 'var(--sb-muted)', fontSize: 12 }}>{t.email}</small></span>
                    </span>
                  </td>
                  <td><strong>{t.totalContent}</strong></td>
                  <td>{t.pending > 0 ? <Badge tone="violet" dot>{t.pending}</Badge> : <span style={{ color: 'var(--sb-muted)' }}>0</span>}</td>
                  <td>{t.approved > 0 ? <Badge tone="green" dot>{t.approved}</Badge> : <span style={{ color: 'var(--sb-muted)' }}>0</span>}</td>
                  <td>{t.rejected > 0 ? <Badge tone="red" dot>{t.rejected}</Badge> : <span style={{ color: 'var(--sb-muted)' }}>0</span>}</td>
                  <td>{t.requiresUpdate > 0 ? <Badge tone="amber" dot>{t.requiresUpdate}</Badge> : <span style={{ color: 'var(--sb-muted)' }}>0</span>}</td>
                  <td>{t.published}</td>
                  <td>{new Date(t.lastActive).toLocaleDateString('en-NG')}</td>
                </tr>
              ))}
              {list.length===0 ? <tr><td colSpan={8}><p className="ad-empty-line">No tutors in this filter.</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
