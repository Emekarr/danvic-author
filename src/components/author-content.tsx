'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@danvic/ui'
import { Search, X } from 'lucide-react'
import { dummyContent, type ContentStatus, type DummyContent } from '@/lib/author-dummy'

const filters: Array<{ label: string; value: ContentStatus | 'all'; tone: 'neutral' | 'blue' | 'violet' | 'green' | 'red' | 'amber' }> = [
  { label: 'All', value: 'all', tone: 'neutral' },
  { label: 'Pending review', value: 'pending_review', tone: 'violet' },
  { label: 'Approved', value: 'approved', tone: 'green' },
  { label: 'Rejected', value: 'rejected', tone: 'red' },
  { label: 'Published', value: 'published', tone: 'green' },
  { label: 'Archived', value: 'archived', tone: 'neutral' },
]

function statusTone(status: ContentStatus) {
  if (status === 'published' || status === 'approved') return 'green' as const
  if (status === 'rejected') return 'red' as const
  if (status === 'pending_review') return 'violet' as const
  if (status === 'archived') return 'neutral' as const
  return 'blue' as const
}

function statusLabel(status: ContentStatus) {
  return status.replace('_', ' ')
}

export function AuthorContentPage({ initialFilter }: { initialFilter?: string | undefined }) {
  const normalized = (initialFilter && filters.some((f) => f.value === initialFilter) ? initialFilter : 'all') as typeof filters[number]['value']
  const [active, setActive] = useState<typeof filters[number]['value']>(normalized)
  const [search, setSearch] = useState('')

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: dummyContent.length }
    for (const f of filters) if (f.value !== 'all') map[f.value] = dummyContent.filter((c) => c.status === f.value).length
    return map
  }, [])

  const filtered: DummyContent[] = useMemo(() => {
    return dummyContent.filter((c) => {
      if (active !== 'all' && c.status !== active) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return c.title.toLowerCase().includes(q) || c.tutor.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
      }
      return true
    })
  }, [active, search])

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Content</h1>
          <p>All content first — filter by status. Badges indicate review state. No backend, dummy data only.</p>
        </div>
      </header>

      {/* Filter badges */}
      <section className="ad-section ad-section--plain" style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActive(f.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 34,
                padding: '0 12px',
                borderRadius: 999,
                border: f.value === active ? '1px solid var(--sb-primary)' : '1px solid var(--sb-border)',
                background: f.value === active ? 'var(--sb-primary-soft)' : '#fff',
                color: f.value === active ? 'var(--sb-primary-strong)' : 'var(--sb-foreground)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              aria-pressed={f.value === active}
            >
              <Badge tone={f.tone} dot>{f.label}</Badge>
              <span style={{ minWidth: 18, height: 18, display: 'grid', placeItems: 'center', borderRadius: 999, background: f.value === active ? 'var(--sb-primary)' : '#eef2f7', color: f.value === active ? '#fff' : '#344054', fontSize: 11 }}>{counts[f.value] ?? 0}</span>
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--sb-muted)', fontSize: 12 }}>
            Showing <strong>{filtered.length}</strong> of <strong>{dummyContent.length}</strong>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="ad-search-control" style={{ flex: '0 1 360px', width: 360, maxWidth: '100%' }}>
            <Search aria-hidden="true" />
            <input className="sb-input" placeholder="Search title, tutor, course, type" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search ? (
              <button className="ad-search-clear" aria-label="Clear search" onClick={() => setSearch('')}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            ) : null}
          </div>
          <span style={{ fontSize: 12, color: 'var(--sb-muted)' }}>Quick filters: click a badge above — list below updates instantly.</span>
        </div>
      </section>

      {/* Table */}
      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>{active === 'all' ? 'All content' : filters.find((f) => f.value === active)?.label}</h2>
            <p>{filtered.length} record(s) {active !== 'all' ? `· filtered by ${statusLabel(active as ContentStatus)}` : '· showing everything first'}</p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Tutor</th>
                <th>Course</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="sb-cell-primary">{c.title}</span>
                    <span className="sb-cell-secondary">{c.views} views</span>
                  </td>
                  <td>{c.type}</td>
                  <td>{c.tutor}</td>
                  <td>{c.courseName}</td>
                  <td><Badge tone={statusTone(c.status)} dot>{statusLabel(c.status)}</Badge></td>
                  <td>{new Date(c.updatedAt).toLocaleDateString('en-NG')}</td>
                  <td>{c.version}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><p className="ad-empty-line">No content for this filter.</p></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Helper cards for each status quick link (mirrors requirement: a way to get list of all ...) */}
      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>Quick status breakdown</h2>
            <p>Jump directly to each status list.</p>
          </div>
        </div>
        <div className="ad-directory-grid">
          {filters.filter((f) => f.value !== 'all').map((f) => (
            <button key={f.value} onClick={() => setActive(f.value)} className="ad-directory-card" style={{ textAlign: 'left', cursor: 'pointer', background: 'transparent', border: 0, borderBottom: '1px solid var(--sb-border)' }}>
              <span className="ad-directory-card-label">{f.label}</span>
              <strong>{counts[f.value] ?? 0}</strong>
              <span className="ad-directory-card-note">Click to filter table above</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
