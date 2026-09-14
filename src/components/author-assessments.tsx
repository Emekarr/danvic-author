'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@danvic/ui'
import { Search } from 'lucide-react'
import { dummyAssessments, dummyQuestionBank, type DummyAssessment } from '@/lib/author-dummy'

type Tab = 'overview' | 'assignment' | 'quiz' | 'exam' | 'question-bank' | 'pending-review'

const tabLabels: Record<Tab, string> = {
  overview: 'Overview',
  assignment: 'Assignments',
  quiz: 'Quizzes',
  exam: 'Exams',
  'question-bank': 'Question Bank',
  'pending-review': 'Pending Assessment Review',
}

function TabNav({ active }: { active: Tab }) {
  const tabs: Tab[] = ['overview', 'assignment', 'quiz', 'exam', 'question-bank', 'pending-review']
  return (
    <div className="ad-security-tabs" style={{ overflowX: 'auto' }}>
      {tabs.map((t) => (
        <Link key={t} href={t === 'overview' ? '/assessments' : `/assessments/${t}`} className="ad-security-tab" aria-selected={active === t} style={{ textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
          {tabLabels[t]}
        </Link>
      ))}
    </div>
  )
}

export function AuthorAssessments({ tab }: { tab: Tab }) {
  const [search, setSearch] = useState('')
  const counts = {
    assignment: dummyAssessments.filter((a) => a.type === 'assignment').length,
    quiz: dummyAssessments.filter((a) => a.type === 'quiz').length,
    exam: dummyAssessments.filter((a) => a.type === 'exam').length,
    pending: dummyAssessments.filter((a) => a.status === 'pending_review').length,
    bank: dummyQuestionBank.length,
  }

  const filtered = useMemo(() => {
    let list: DummyAssessment[] = dummyAssessments
    if (tab === 'assignment') list = list.filter((a) => a.type === 'assignment')
    if (tab === 'quiz') list = list.filter((a) => a.type === 'quiz')
    if (tab === 'exam') list = list.filter((a) => a.type === 'exam')
    if (tab === 'pending-review') list = list.filter((a) => a.status === 'pending_review')
    if (tab === 'question-bank') return [] as DummyAssessment[]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.course.toLowerCase().includes(q))
    }
    return list
  }, [tab, search])

  if (tab === 'question-bank') {
    const qFiltered = dummyQuestionBank.filter((q) => !search.trim() || q.prompt.toLowerCase().includes(search.toLowerCase()) || q.category.toLowerCase().includes(search.toLowerCase()))
    return (
      <div className="ad-directory-page">
        <header className="sb-page-header"><div><h1>Assessment — Question Bank</h1><p>Dummy bank items; no backend.</p></div></header>
        <TabNav active={tab} />
        <section className="ad-section ad-section--plain">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div className="ad-search-control" style={{ flex: '0 1 360px' }}><Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, color: 'var(--sb-subtle)' }} /><input className="sb-input" style={{ paddingLeft: 34 }} placeholder="Search prompt or category" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <span style={{ fontSize: 12, color: 'var(--sb-muted)' }}>{qFiltered.length} question(s)</span>
          </div>
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead><tr><th>Prompt</th><th>Type</th><th>Category</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>
                {qFiltered.map((q) => (
                  <tr key={q.id}><td style={{ maxWidth: 420 }}><span className="sb-cell-primary" style={{ whiteSpace: 'normal' }}>{q.prompt}</span></td><td>{q.type}</td><td>{q.category}</td><td><Badge tone={q.status==='approved'?'green':q.status==='pending_review'?'violet':'blue'} dot>{q.status.replace('_',' ')}</Badge></td><td>{new Date(q.updatedAt).toLocaleDateString('en-NG')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header"><div><h1>Assessment — {tabLabels[tab]}</h1><p>Working with dummy data — {dummyAssessments.length} total assessments.</p></div></header>
      <TabNav active={tab} />

      {tab === 'overview' ? (
        <section className="ad-section ad-section--plain">
          <div className="ad-directory-grid">
            <div className="ad-directory-card"><span className="ad-directory-card-label">Assignments</span><strong>{counts.assignment}</strong><span className="ad-directory-card-note">Open + pending</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Quizzes</span><strong>{counts.quiz}</strong><span className="ad-directory-card-note">{dummyAssessments.filter(a=>a.type==='quiz' && a.status==='open').length} open</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Exams</span><strong>{counts.exam}</strong><span className="ad-directory-card-note">{dummyAssessments.filter(a=>a.type==='exam').length} total</span></div>
            <div className="ad-directory-card"><span className="ad-directory-card-label">Pending Review</span><strong>{counts.pending}</strong><span className="ad-directory-card-note">Needs assessment review</span></div>
          </div>
        </section>
      ) : null}

      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>{tabLabels[tab]}</h2>
            <p>{filtered.length} record(s){tab==='pending-review' ? ' awaiting review' : ''}</p>
          </div>
          <div className="ad-search-control" style={{ flex: '0 1 320px' }}>
            <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 15, color: 'var(--sb-subtle)' }} />
            <input className="sb-input" placeholder="Search assessment or course" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead><tr><th>Assessment</th><th>Type</th><th>Questions</th><th>Duration</th><th>Pass</th><th>Submissions</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td><span className="sb-cell-primary">{a.title}</span><span className="sb-cell-secondary">{a.course}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{a.type}</td>
                  <td>{a.questions}</td>
                  <td>{a.durationMinutes ? `${a.durationMinutes} min` : '—'}</td>
                  <td>{a.passMark}%</td>
                  <td>{a.submissions}</td>
                  <td><Badge tone={a.status==='open'?'green':a.status==='pending_review'?'violet':a.status==='closed'?'neutral':'blue'} dot>{a.status.replace('_',' ')}</Badge></td>
                </tr>
              ))}
              {filtered.length===0 ? <tr><td colSpan={7}><p className="ad-empty-line">No assessments in this tab.</p></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
