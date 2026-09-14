'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { dummyVersions, type DummyVersion } from '@/lib/author-dummy'

type Tab = 'published' | 'draft' | 'history' | 'updates' | 'review-dates'

const tabLabels: Record<Tab, string> = {
  published: 'Published Version',
  draft: 'Draft Version',
  history: 'Version History',
  updates: 'Controlled Updates',
  'review-dates': 'Review Dates',
}

const tabs: Tab[] = ['published','draft','history','updates','review-dates']

export function AuthorVersionControl({ tab }: { tab: Tab }) {
  let list: DummyVersion[] = dummyVersions
  if (tab === 'published') list = dummyVersions.filter((v) => v.state === 'published')
  if (tab === 'draft') list = dummyVersions.filter((v) => v.state === 'draft')
  if (tab === 'updates') list = dummyVersions.filter((v) => v.controlledUpdate)
  // history shows all, review-dates shows all with dates

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Version Control — {tabLabels[tab]}</h1>
          <p>Dummy version snapshots — immutable published vs draft, controlled updates and scheduled reviews.</p>
        </div>
      </header>
      <div className="ad-security-tabs" style={{ overflowX: 'auto' }}>
        {tabs.map((t) => (
          <Link key={t} href={`/version-control/${t === 'history' ? 'history' : t}`} className="ad-security-tab" aria-selected={tab===t} style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>{tabLabels[t]}</Link>
        ))}
      </div>

      <section className="ad-section ad-section--plain">
        <div className="ad-directory-grid">
          <div className="ad-directory-card"><span className="ad-directory-card-label">Published</span><strong>{dummyVersions.filter(v=>v.state==='published').length}</strong><span className="ad-directory-card-note">Live snapshots</span></div>
          <div className="ad-directory-card"><span className="ad-directory-card-label">Draft</span><strong>{dummyVersions.filter(v=>v.state==='draft').length}</strong><span className="ad-directory-card-note">In-progress</span></div>
          <div className="ad-directory-card"><span className="ad-directory-card-label">Controlled Updates</span><strong>{dummyVersions.filter(v=>v.controlledUpdate).length}</strong><span className="ad-directory-card-note">Approved drafts of live</span></div>
          <div className="ad-directory-card"><span className="ad-directory-card-label">Archived</span><strong>{dummyVersions.filter(v=>v.state==='archived').length}</strong><span className="ad-directory-card-note">Superseded</span></div>
        </div>
      </section>

      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>{tabLabels[tab]}</h2>
            <p>{list.length} version(s)</p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead><tr><th>Content</th><th>Version</th><th>State</th><th>Author</th><th>Updated</th><th>{tab==='review-dates' ? 'Review Date' : 'Changes'}</th><th>Controlled?</th></tr></thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td><span className="sb-cell-primary">{v.contentTitle}</span><span className="sb-cell-secondary">{v.contentId}</span></td>
                  <td><Badge tone={v.state==='published'?'green':v.state==='draft'?'violet':'neutral'} dot>{v.label}</Badge></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.state}</td>
                  <td>{v.author}</td>
                  <td>{new Date(v.updatedAt).toLocaleDateString('en-NG')}</td>
                  <td style={{ maxWidth: 260 }}>{tab==='review-dates' ? (v.reviewDate ? new Date(v.reviewDate).toLocaleDateString('en-NG') : '— not scheduled') : <span style={{ whiteSpace: 'normal', fontSize: 12 }}>{v.changeSummary}</span>}</td>
                  <td>{v.controlledUpdate ? <Badge tone="violet">Controlled</Badge> : '—'}</td>
                </tr>
              ))}
              {list.length===0 ? <tr><td colSpan={7}><p className="ad-empty-line">No versions in this tab.</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
