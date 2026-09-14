'use client'

import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { dummyReviews } from '@/lib/author-dummy'

type Criterion = 'technical-accuracy' | 'brand-consistency' | 'copyright' | 'safety' | 'quality' | 'history'

const criterionMap: Record<Criterion, string> = {
  'technical-accuracy': 'Technical Accuracy',
  'brand-consistency': 'Brand Consistency',
  copyright: 'Copyright / IP',
  safety: 'Safety & Regulatory',
  quality: 'Content Quality',
  history: 'Review History',
}

const tabs: Criterion[] = ['technical-accuracy','brand-consistency','copyright','safety','quality','history']

export function AuthorContentReview({ tab }: { tab: Criterion }) {
  const isHistory = tab === 'history'
  const criterionLabel = criterionMap[tab]
  const list = isHistory ? dummyReviews : dummyReviews.filter((r) => r.criterion === criterionLabel)

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Content Review — {criterionLabel}</h1>
          <p>{isHistory ? 'Full review trail across all criteria (dummy).' : `Queue for ${criterionLabel} review. Dummy data only.`}</p>
        </div>
      </header>

      <div className="ad-security-tabs" style={{ overflowX: 'auto' }}>
        {tabs.map((t) => (
          <Link key={t} href={`/content-review/${t}`} className="ad-security-tab" aria-selected={tab===t} style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {criterionMap[t]}
          </Link>
        ))}
      </div>

      {!isHistory ? (
        <section className="ad-section ad-section--plain">
          <div className="ad-directory-grid">
            <div className="ad-directory-card"><span className="ad-directory-card-label">Queue</span><strong>{list.length}</strong><span className="ad-directory-card-note">{criterionLabel}</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Pass</span><strong>{list.filter((r)=>r.status==='pass').length}</strong><span className="ad-directory-card-note">Approved</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Needs revision</span><strong>{list.filter((r)=>r.status==='needs_revision').length}</strong><span className="ad-directory-card-note">Requires updates</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Pending / Fail</span><strong>{list.filter((r)=>r.status==='pending' || r.status==='fail').length}</strong><span className="ad-directory-card-note">Attention needed</span></div>
          </div>
        </section>
      ) : null}

      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>{isHistory ? 'Review History' : `${criterionLabel} queue`}</h2>
            <p>{list.length} record(s)</p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead><tr><th>Content</th><th>Criterion</th><th>Status</th><th>Reviewer</th><th>Score</th><th>Updated</th><th>Comment</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td><span className="sb-cell-primary">{r.contentTitle}</span><span className="sb-cell-secondary">{r.contentId}</span></td>
                  <td>{r.criterion}</td>
                  <td><Badge tone={r.status==='pass'?'green':r.status==='fail'?'red':r.status==='needs_revision'?'amber':'violet'} dot>{r.status.replace('_',' ')}</Badge></td>
                  <td>{r.reviewer}</td>
                  <td>{r.score ?? '—'}</td>
                  <td>{new Date(r.updatedAt).toLocaleDateString('en-NG')}</td>
                  <td style={{ maxWidth: 260 }}><span style={{ whiteSpace: 'normal', fontSize: 12, lineHeight: 1.5 }}>{r.comment}</span></td>
                </tr>
              ))}
              {list.length===0 ? <tr><td colSpan={7}><p className="ad-empty-line">No reviews for this criterion.</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
