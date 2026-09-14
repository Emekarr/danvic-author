'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiFetch, type ContentReview, type ContentVersion, type Course, type PaginatedResult, type ReviewableContent } from '@danvic/api-client'
import { Badge, Button, Field, FormMessage, Input, PageHeader, Select, Textarea } from '@danvic/ui'

const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-NG') : '—'
const status = (item: Pick<ReviewableContent, 'reviewStatus' | 'publicationStatus'>) => item.publicationStatus === 'archived' ? 'Archived' : item.publicationStatus === 'published' ? 'Published' : item.reviewStatus === 'approved' ? 'Approved' : item.reviewStatus === 'pending_review' ? 'Pending review' : item.reviewStatus === 'needs_revision' ? 'Needs revision' : item.reviewStatus === 'rejected' ? 'Rejected' : 'Draft'
const tone = (value: string) => value === 'Published' || value === 'Approved' ? 'green' : value === 'Rejected' ? 'red' : value === 'Needs revision' ? 'amber' : value === 'Pending review' ? 'violet' : 'blue'
const errorCode = (cause: unknown) => (cause as { code?: string })?.code ?? ''

export function ReviewStatusBadge({ value }: { value: Pick<ReviewableContent, 'reviewStatus' | 'publicationStatus'> }) { const label = status(value); return <Badge dot tone={tone(label)}>{label}</Badge> }

export function VersionHistory({ versions }: { versions: ContentVersion[] }) { return versions.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Version</th><th>State</th><th>Created by</th><th>Updated</th><th>Changes</th></tr></thead><tbody>{versions.map((version) => <tr key={version.id}><td>{version.label || `v${version.number}`}</td><td>{version.state}</td><td>{version.createdBy.firstName} {version.createdBy.lastName}</td><td>{date(version.updatedAt)}</td><td>{version.changeSummary ?? '—'}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No versions recorded yet.</p> }

export function ReviewFeedbackPanel({ reviews }: { reviews: ContentReview[] }) { return <section className="ad-section"><div className="ad-section-heading"><div><h2>Review feedback</h2><p>Scores and comments returned by the reviewer.</p></div></div>{reviews.length ? reviews.map((review) => <article className="ad-review-record" key={review.id}><div><Badge>{review.decision.replace(/_/g, ' ')}</Badge><span>{review.reviewer.firstName} {review.reviewer.lastName} · {date(review.createdAt)}</span></div><p>{review.summary}</p><ul>{review.criteria.map((criterion) => <li key={criterion.criterion}>{criterion.criterion.replace(/_/g, ' ')}: {criterion.score ?? '—'} · {criterion.comment ?? 'No comment'}</li>)}</ul></article>) : <p className="ad-empty-line">No review feedback yet.</p>}</section> }

export function SubmitForReviewDialog({ content, onDone }: { content: ReviewableContent; onDone: () => void }) { return <GovernanceAction content={content} endpoint={content.reviewStatus === 'needs_revision' ? 'resubmit' : 'submit'} label={content.reviewStatus === 'needs_revision' ? 'Resubmit revision' : 'Submit for review'} onDone={onDone} /> }

export function ControlledUpdateDialog({ content, onDone }: { content: ReviewableContent; onDone: () => void }) { return <GovernanceAction content={content} endpoint="controlled-update" label="Create controlled update" onDone={onDone} /> }

function GovernanceAction({ content, endpoint, label, onDone }: { content: ReviewableContent; endpoint: 'submit' | 'resubmit' | 'controlled-update'; label: string; onDone: () => void }) {
  const [open, setOpen] = useState(false); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const submit = async () => { setBusy(true); setError(''); try { await apiFetch(`/api/content-governance/${encodeURIComponent(content.id)}/${endpoint}`, { method: 'POST', body: JSON.stringify(endpoint === 'controlled-update' ? { sourceVersionId: content.currentVersion?.id, changeSummary: note } : { versionId: content.currentVersion?.id ?? null, submissionNote: note }) }); setOpen(false); setNote(''); onDone() } catch (cause) { setError(errorCode(cause) === 'PUBLISHED_VERSION_IMMUTABLE' ? 'Published versions cannot be edited. Create a controlled update draft.' : cause instanceof Error ? cause.message : 'The request could not be completed.') } finally { setBusy(false) } }
  return <div className="ad-governance-action"><Button onClick={() => setOpen(true)}>{label}</Button>{open ? <div className="ad-inline-dialog" role="dialog" aria-label={label}><Field label={endpoint === 'controlled-update' ? 'Change summary' : 'Submission note'} required={endpoint === 'controlled-update'}><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={endpoint === 'controlled-update' ? 'Describe the controlled update' : 'Tell the reviewer what changed'} /></Field><div><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button busy={busy} onClick={() => void submit()}>{label}</Button></div><FormMessage>{error}</FormMessage></div> : null}</div>
}

function ContentRows({ items }: { items: ReviewableContent[] }) { return items.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><Link href={`/content-review/${encodeURIComponent(item.id)}`}>{item.title}</Link><small className="ad-table-subline">{item.courseName ?? 'No course'}</small></td><td>{item.type}</td><td><ReviewStatusBadge value={item} /></td><td>{date(item.updatedAt)}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No content matches your filters.</p> }

export function ContentReviewDashboard() {
  const [search, setSearch] = useState(''); const [result, setResult] = useState<PaginatedResult<ReviewableContent> | null>(null); const [error, setError] = useState<unknown>(null)
  const path = useMemo(() => {
    const params = new URLSearchParams({ page: '1', limit: '25' })
    const query = search.trim()
    if (query) params.set('search', query)
    return `/api/content-governance/mine?${params}`
  }, [search])
  useEffect(() => { void apiFetch<PaginatedResult<ReviewableContent>>(path).then(setResult).catch(setError) }, [path])
  if (error) return <p className="ad-empty-line" data-tone="error">{error instanceof Error ? error.message : 'Could not load your content status.'}</p>
  const counts = result?.items.reduce<Record<string, number>>((all, item) => { const value = status(item); all[value] = (all[value] ?? 0) + 1; return all }, {}) ?? {}
  const total = result?.page.total ?? null
  return <div className="ad-directory-page"><PageHeader title="My content status" description="Track draft, review, feedback, approval and publication state for every item you create." actions={<><Link className="sb-button sb-button--secondary sb-button--md" href="/courses/new">Create course</Link><Link className="sb-button sb-button--primary sb-button--md" href="/assessments/new">Create assessment</Link></>} /><section className="ad-section ad-section--plain"><div className="ad-directory-grid">{['Draft', 'Pending review', 'Needs revision', 'Approved', 'Published', 'Rejected', 'Archived'].map((label) => <div className="ad-directory-card" key={label}><span className="ad-directory-card-label">{label}</span><strong>{counts[label] ?? 0}</strong></div>)}</div></section><section className="ad-section"><div className="ad-section-heading"><div><h2>All my content</h2><p>{total ?? '—'} records</p></div><Input placeholder="Search content" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{result ? (result.items.length ? <ContentRows items={result.items} /> : <div className="ad-empty-state"><p className="ad-empty-line">{search.trim() ? 'No content matches your search.' : 'No content yet. Create your first course or assessment to see it here.'}</p><div className="sb-page-actions"><Link className="sb-button sb-button--secondary sb-button--md" href="/courses/new">Create course</Link><Link className="sb-button sb-button--primary sb-button--md" href="/assessments/new">Create assessment</Link></div></div>) : <p className="ad-empty-line">Loading content status…</p>}</section></div>
}

export function ContentReviewDetail({ contentId, update = false }: { contentId: string; update?: boolean }) {
  const [data, setData] = useState<{ content: ReviewableContent; reviews: ContentReview[]; versions: ContentVersion[]; capabilities?: Record<string, boolean> } | null>(null); const [error, setError] = useState<unknown>(null)
  useEffect(() => { void apiFetch<typeof data>(`/api/content-governance/${encodeURIComponent(contentId)}`).then(setData).catch(setError) }, [contentId])
  if (error) return <p className="ad-empty-line" data-tone="error">{errorCode(error) === 'FORBIDDEN' ? 'You do not have access to this content.' : error instanceof Error ? error.message : 'Could not load content detail.'}</p>
  if (!data) return <p className="ad-empty-line">Loading content detail…</p>
  const { content } = data; const reload = () => { void apiFetch<typeof data>(`/api/content-governance/${encodeURIComponent(contentId)}`).then(setData).catch(setError) }
  const editable = content.reviewStatus === 'draft' || content.reviewStatus === 'needs_revision'
  return <div className="ad-directory-page"><Link className="ad-course-back" href="/content-review">Back to my content</Link><PageHeader title={content.title} description={`${content.type} · ${content.courseName ?? 'No course'}`} actions={<ReviewStatusBadge value={content} />} />{update ? <section className="ad-section ad-section--plain"><h2>Controlled update draft</h2><p>The live published snapshot remains unchanged until an authorized review and publication.</p><ControlledUpdateDialog content={content} onDone={reload} /></section> : null}<section className="ad-section ad-section--plain"><div className="ad-detail-grid"><div><span className="ad-directory-card-label">Current version</span><strong>{content.currentVersion?.label || (content.currentVersion ? `v${content.currentVersion.number}` : 'Initial submission')}</strong></div><div><span className="ad-directory-card-label">Submitted</span><strong>{date(content.submittedAt)}</strong></div><div><span className="ad-directory-card-label">Approved</span><strong>{date(content.approvedAt)}</strong></div><div><span className="ad-directory-card-label">Published</span><strong>{date(content.publishedAt)}</strong></div></div>{editable && data.capabilities?.submit !== false ? <SubmitForReviewDialog content={content} onDone={reload} /> : null}{content.reviewStatus === 'pending_review' ? <p className="ad-form-callout">Submitted and awaiting the Content Assessment Admin’s decision.</p> : null}{content.publicationStatus === 'published' && data.capabilities?.controlledUpdate !== false ? <ControlledUpdateDialog content={content} onDone={reload} /> : null}{content.reviewStatus === 'approved' ? <p className="ad-form-callout">Approved — awaiting publication. It is not student-visible until published.</p> : null}</section><ReviewFeedbackPanel reviews={data.reviews} /><section className="ad-section"><div className="ad-section-heading"><div><h2>Version history</h2><p>Drafts and published snapshots remain separately auditable.</p></div><Link href={`/content-review/${encodeURIComponent(contentId)}/versions`}>Open full history</Link></div><VersionHistory versions={data.versions} /></section></div>
}

type BankQuestionType = 'multiple_choice' | 'free_text'

interface BankItem {
  id?: unknown
  prompt?: unknown
  question?: unknown
  title?: unknown
  type?: unknown
  points?: unknown
  reviewStatus?: unknown
  status?: unknown
  courseName?: unknown
  updatedAt?: unknown
  date?: unknown
}

const bankText = (value: unknown, fallback: string) => typeof value === 'string' && value ? value : fallback

export function AuthorQuestionBank() {
  const [items, setItems] = useState<BankItem[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [prompt, setPrompt] = useState('')
  const [kind, setKind] = useState<BankQuestionType>('multiple_choice')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [points, setPoints] = useState('5')
  const [courseId, setCourseId] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => { void apiFetch<{ items?: BankItem[] }>('/api/question-bank').then((result) => setItems(result.items ?? [])).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load question bank.')) }
  useEffect(load, [])
  useEffect(() => { void apiFetch<{ courses?: Course[] }>('/api/courses').then((result) => setCourses(result.courses ?? [])).catch(() => setCourses([])) }, [])
  const setOption = (index: number, value: string) => setOptions((previous) => previous.map((option, position) => (position === index ? value : option)))
  const create = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      const trimmedPrompt = prompt.trim()
      if (!trimmedPrompt) throw new Error('Enter the question prompt.')
      const parsedPoints = Number(points)
      if (!Number.isInteger(parsedPoints) || parsedPoints < 1 || parsedPoints > 1000) throw new Error('Points must be a whole number between 1 and 1000.')
      let payloadOptions: Array<{ id: string; label: string }> = []
      let correctOptionIds: string[] = []
      if (kind === 'multiple_choice') {
        const labels = options.map((option) => option.trim()).filter(Boolean)
        if (labels.length < 2) throw new Error('Add at least two answer options.')
        payloadOptions = labels.map((label, index) => ({ id: `option-${index + 1}`, label }))
        const safeIndex = Math.min(Math.max(correctIndex, 0), payloadOptions.length - 1)
        const correctId = payloadOptions[safeIndex]?.id
        if (!correctId) throw new Error('Select the correct answer.')
        correctOptionIds = [correctId]
      }
      await apiFetch('/api/question-bank', { method: 'POST', body: JSON.stringify({ ...(courseId ? { courseId } : {}), prompt: trimmedPrompt, type: kind, options: payloadOptions, correctOptionIds, points: parsedPoints }) })
      setPrompt(''); setOptions(['', '']); setCorrectIndex(0); setPoints('5'); setCourseId(''); setKind('multiple_choice')
      setNotice('Draft question created.')
      load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Question could not be created.') } finally { setBusy(false) }
  }
  return <div className="ad-directory-page"><PageHeader title="Question bank" description="Create draft questions with answer options, then reuse them in assessments." /><section className="ad-section ad-section--plain"><h2>Create draft question</h2><div className="ad-form-grid"><Field label="Question prompt" required><Textarea rows={3} placeholder="Enter the question" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></Field><div className="ad-form-row"><Field label="Question type" required><Select value={kind} onChange={(event) => { setKind(event.target.value as BankQuestionType); setCorrectIndex(0) }}><option value="multiple_choice">Multiple choice</option><option value="free_text">Free text</option></Select></Field><Field label="Points" required hint="Whole number between 1 and 1000"><Input type="number" min={1} max={1000} step={1} value={points} onChange={(event) => setPoints(event.target.value)} /></Field><Field label="Course (optional)"><Select value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">No course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</Select></Field></div>{kind === 'multiple_choice' ? <fieldset className="ad-fieldset"><legend>Answer options — select the correct answer</legend>{options.map((option, index) => <div className="ad-inline-create" key={index}><input className="sb-radio" type="radio" name="correct-option" aria-label={`Mark option ${index + 1} as correct`} checked={correctIndex === index} onChange={() => setCorrectIndex(index)} /><Input placeholder={`Option ${index + 1}`} value={option} onChange={(event) => setOption(index, event.target.value)} />{options.length > 2 ? <Button variant="ghost" type="button" onClick={() => { setOptions((previous) => previous.filter((_, position) => position !== index)); setCorrectIndex((previous) => (previous >= options.length - 1 ? Math.max(options.length - 2, 0) : previous)) }}>Remove</Button> : null}</div>)}<Button variant="secondary" type="button" onClick={() => setOptions((previous) => [...previous, ''])}>Add option</Button></fieldset> : <p className="ad-form-callout">Free-text questions are answered in the learner’s own words — no options or correct answer needed.</p>}<div><Button busy={busy} onClick={() => void create()}>Create draft question</Button></div><FormMessage>{error}</FormMessage><FormMessage tone="success">{notice}</FormMessage></div></section><section className="ad-section"><div className="ad-section-heading"><div><h2>Drafts and bank items</h2><p>{items.length} question(s)</p></div></div>{items.length ? <div className="sb-table-wrap"><table className="sb-table"><thead><tr><th>Question</th><th>Type</th><th>Points</th><th>Course</th><th>Status</th><th>Updated</th></tr></thead><tbody>{items.map((item, index) => <tr key={String(item.id ?? index)}><td style={{ maxWidth: 420 }}><span className="sb-cell-primary" style={{ whiteSpace: 'normal' }}>{bankText(item.prompt ?? item.question ?? item.title, 'Question')}</span></td><td>{bankText(item.type, 'question')}</td><td>{typeof item.points === 'number' ? item.points : '—'}</td><td>{bankText(item.courseName, '—')}</td><td>{bankText(item.reviewStatus ?? item.status, 'draft')}</td><td>{bankText(item.updatedAt ?? item.date, '—')}</td></tr>)}</tbody></table></div> : <p className="ad-empty-line">No questions yet. Create the first draft above.</p>}</section></div>
}

export function ContentReviewRoute({ slug }: { slug: string[] }) { if (!slug.length) return <ContentReviewDashboard />; if (slug[0] === 'question-bank') return <AuthorQuestionBank />; const contentId = slug[0] ?? ''; return <ContentReviewDetail contentId={contentId} update={slug[1] === 'update'} /> }
