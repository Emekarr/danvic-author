'use client'

import { useEffect, useRef, useState } from 'react'
import {
  apiFetch,
  type Course,
  type CourseParticipant,
  type InvitationRecord,
} from '@danvic/api-client'
import { Badge, Button, CustomDropdown, Field, FormMessage } from '@danvic/ui'
import { MailPlus, RefreshCw, X } from 'lucide-react'

const invitationStatus = (item: InvitationRecord) =>
  item.acceptedAt ? 'accepted' : item.deliveryError ? 'failed' : item.sentAt ? 'sent' : 'queued'

export function StudentManager({ courses }: { courses: Course[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const historyRef = useRef<HTMLDialogElement>(null)
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [invitations, setInvitations] = useState<InvitationRecord[]>([])
  const [participants, setParticipants] = useState<CourseParticipant[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [invitationResult, participantResult] = await Promise.all([
        apiFetch<{ invitations: InvitationRecord[] }>('/api/student-invitations', {
          cache: 'no-store',
        }),
        courseId
          ? apiFetch<{ participants: CourseParticipant[] }>(
              `/api/courses/${encodeURIComponent(courseId)}/participants`,
              { cache: 'no-store' },
            )
          : Promise.resolve({ participants: [] }),
      ])
      setInvitations(invitationResult.invitations)
      setParticipants(participantResult.participants)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Student records could not be loaded')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void Promise.all([
      apiFetch<{ invitations: InvitationRecord[] }>('/api/student-invitations', {
        cache: 'no-store',
      }),
      courseId
        ? apiFetch<{ participants: CourseParticipant[] }>(
            `/api/courses/${encodeURIComponent(courseId)}/participants`,
            { cache: 'no-store' },
          )
        : Promise.resolve({ participants: [] }),
    ])
      .then(([invitationResult, participantResult]) => {
        if (!active) return
        setInvitations(invitationResult.invitations)
        setParticipants(participantResult.participants)
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Student records could not be loaded')
      })
    return () => {
      active = false
    }
  }, [courseId])

  if (!courses.length)
    return (
      <div className="ad-directory-page">
        <header className="sb-page-header">
          <h1>Students</h1>
        </header>
        <section className="ad-section ad-section--plain">
          <div className="ad-section-heading">
            <div>
              <h2>Course participants</h2>
              <p>Student invitations are course-specific and require an authored course.</p>
            </div>
          </div>
          <p className="ad-empty-line">Create a course first, then invite students to it.</p>
        </section>
      </div>
    )

  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <h1>Students</h1>
        <div className="sb-page-actions">
          <Button type="button" variant="secondary" onClick={() => historyRef.current?.showModal()}>
            Invitation history
          </Button>
          <div id="invite" className="ad-invite-trigger">
            <Button type="button" onClick={() => dialogRef.current?.showModal()}>
              <MailPlus aria-hidden="true" /> Invite students
            </Button>
          </div>
        </div>
      </header>

      <dialog
        ref={dialogRef}
        className="ad-dialog"
        aria-labelledby="author-invite-title"
        onClose={() => {
          setMessage('')
          setError('')
        }}
      >
        <div className="ad-dialog-head">
          <h2 id="author-invite-title">Invite students</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <form
          id="author-invite-form"
          className="ad-dialog-body"
          onSubmit={async (event) => {
            event.preventDefault()
            setBusy(true)
            setError('')
            setMessage('')
            const data = new FormData(event.currentTarget)
            const emails = String(data.get('emails') ?? '')
              .split(/[\n,;]+/)
              .map((email) => email.trim().toLowerCase())
              .filter(Boolean)
            try {
              const result = await apiFetch<{ invitations: Array<{ status: string }> }>(
                '/api/student-invitations',
                { method: 'POST', body: JSON.stringify({ courseId, emails }) },
              )
              setMessage(
                `${result.invitations.filter((item) => item.status === 'queued').length} invitation(s) queued.`,
              )
              dialogRef.current?.close()
              await load()
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Invitations could not be sent')
            } finally {
              setBusy(false)
            }
          }}
        >
          <Field label="Course" required>
            <CustomDropdown
              value={courseId}
              onChange={setCourseId}
              options={courses.map((course) => ({ value: course.id, label: course.name }))}
            />
          </Field>
          <Field
            label="Student email addresses"
            hint="Separate up to 50 addresses with commas or new lines."
            required
          >
            <textarea className="sb-input sb-textarea" name="emails" rows={5} required />
          </Field>
          <p className="ad-dialog-count">
            Invitations are restricted to the selected course and expire after 72 hours.
          </p>
          <FormMessage tone="success">{message}</FormMessage>
          <FormMessage>{error}</FormMessage>
        </form>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button form="author-invite-form" busy={busy}>
            <MailPlus aria-hidden="true" /> Send invitations
          </Button>
        </div>
      </dialog>

      <dialog ref={historyRef} className="ad-dialog" aria-labelledby="author-invite-history-title">
        <div className="ad-dialog-head">
          <div>
            <h2 id="author-invite-history-title">Invitation history</h2>
            <p className="ad-dialog-count">Recent delivery and acceptance activity.</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close invitation history"
            onClick={() => historyRef.current?.close()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="ad-dialog-body">
          {invitations.length ? (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Course</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((item) => {
                    const value = invitationStatus(item)
                    return (
                      <tr key={item.id}>
                        <td>{item.email}</td>
                        <td>
                          {courses.find((course) => course.id === item.courseId)?.name ?? '—'}
                        </td>
                        <td>
                          <Badge
                            tone={
                              value === 'accepted'
                                ? 'green'
                                : value === 'failed'
                                  ? 'red'
                                  : value === 'sent'
                                    ? 'blue'
                                    : 'amber'
                            }
                          >
                            {value}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ad-empty-line">No invitations have been sent yet.</p>
          )}
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={() => historyRef.current?.close()}>
            Close
          </Button>
        </div>
      </dialog>

      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>Participants</h2>
            <p>Accepted students who enrolled in the selected course.</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            busy={loading}
            onClick={() => void load()}
            aria-label="Refresh participants"
          >
            <RefreshCw aria-hidden="true" />
          </Button>
        </div>
        {participants.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((item) => {
                  const percent = item.moduleCount
                    ? Math.round((item.completedCount / item.moduleCount) * 100)
                    : 0
                  return (
                    <tr key={item.enrollment.id}>
                      <td>
                        <span className="sb-cell-primary">
                          {item.student.firstName} {item.student.lastName}
                        </span>
                        <span className="sb-cell-secondary">{item.student.email}</span>
                      </td>
                      <td>
                        {item.completedCount}/{item.moduleCount} modules ({percent}%)
                      </td>
                      <td>
                        <Badge tone={item.enrollment.completedAt ? 'green' : 'blue'} dot>
                          {item.enrollment.completedAt ? 'completed' : 'in progress'}
                        </Badge>
                      </td>
                      <td>{new Date(item.enrollment.enrolledAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : !loading ? (
          <p className="ad-empty-line">No enrolled participants yet for the selected course.</p>
        ) : null}
      </section>

      <section className="ad-section">
        <div className="ad-section-heading">
          <div>
            <h2>Invitation history</h2>
            <p>Delivery and acceptance state for invitations sent by you.</p>
          </div>
        </div>
        {invitations.length ? (
          <div className="sb-table-wrap">
            <table className="sb-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((item) => {
                  const value = invitationStatus(item)
                  const course = courses.find((entry) => entry.id === item.courseId)
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className="sb-cell-primary">{item.email}</span>
                        {item.deliveryError ? (
                          <span className="sb-cell-secondary">{item.deliveryError}</span>
                        ) : null}
                      </td>
                      <td>{course?.name ?? item.courseId ?? '—'}</td>
                      <td>
                        <Badge
                          dot
                          tone={
                            value === 'accepted'
                              ? 'green'
                              : value === 'failed'
                                ? 'red'
                                : value === 'sent'
                                  ? 'blue'
                                  : 'amber'
                          }
                        >
                          {value}
                        </Badge>
                      </td>
                      <td>{new Date(item.expiresAt).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ad-empty-line">No invitations have been sent yet.</p>
        )}
      </section>
    </div>
  )
}
