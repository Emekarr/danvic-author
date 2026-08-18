'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import type { Course, CourseParticipant } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Badge, Button, CustomDropdown, Field, Input } from '@danvic/ui'
import { ArrowRight, CreditCard, Layers3, Pencil, Radio, Unlock, Users, X } from 'lucide-react'
import styles from './course-workspace.module.css'

export function CourseWorkspace({
  courses,
  participants,
}: {
  courses: Course[]
  participants: CourseParticipant[]
}) {
  const enrolledRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState<Course | null>(null)
  const [courseList, setCourseList] = useState(courses)
  const [editType, setEditType] = useState<Course['type']>('premade')
  const [editLiveCallDurationMinutes, setEditLiveCallDurationMinutes] = useState(60)
  const [editCertificateOnCompletion, setEditCertificateOnCompletion] = useState(false)
  const [editAccessType, setEditAccessType] = useState<Course['accessType']>('free')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const openEdit = (course: Course) => {
    setCurrent(course)
    setEditType(course.type)
    setEditLiveCallDurationMinutes(course.liveCallDurationMinutes ?? 60)
    setEditCertificateOnCompletion(course.certificateOnCompletion)
    setEditAccessType(course.accessType)
    setEditError('')
    editRef.current?.showModal()
  }
  const enrolled = participants.filter((item) => item.enrollment.courseId === current?.id)
  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Courses</h1>
          <p>Publish, update, and review every authored learning experience.</p>
        </div>
        <div className="sb-page-actions">
          <Link href="/courses/new" className="sb-button sb-button--primary sb-button--md">
            Create course
          </Link>
        </div>
      </header>
      <section className="ad-section ad-section--plain">
        <div className="ad-section-heading">
          <div>
            <h2>All courses</h2>
            <p>
              {courseList.length} total ·{' '}
              {courseList.filter((course) => course.type === 'live').length} live
            </p>
          </div>
        </div>
        <div className="sb-table-wrap">
          <table className="sb-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Type</th>
                <th>Access</th>
                <th>Duration</th>
                <th>Scheduled</th>
                <th>Enrolled</th>
                <th aria-label="Course actions" />
              </tr>
            </thead>
            <tbody>
              {courseList.map((course) => {
                const count = participants.filter(
                  (item) => item.enrollment.courseId === course.id,
                ).length
                return (
                  <tr key={course.id}>
                    <td>
                      <span className="sb-cell-primary">{course.name}</span>
                    </td>
                    <td>
                      <Badge tone={course.type === 'live' ? 'violet' : 'blue'}>{course.type}</Badge>
                    </td>
                    <td>
                      {course.accessType === 'paid'
                        ? new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                          }).format(course.priceKobo / 100)
                        : 'Free'}
                    </td>
                    <td>{course.durationMinutes} min</td>
                    <td>
                      {course.scheduledAt
                        ? new Date(course.scheduledAt).toLocaleString('en-NG')
                        : '-'}
                    </td>
                    <td>
                      <button
                        className="ad-enrolled-button"
                        type="button"
                        onClick={() => {
                          setCurrent(course)
                          enrolledRef.current?.showModal()
                        }}
                      >
                        <Users aria-hidden="true" /> {count} enrolled
                      </button>
                    </td>
                    <td>
                      <div className="ad-course-actions">
                        <button
                          type="button"
                          className="ad-row-action"
                          onClick={() => openEdit(course)}
                        >
                          <Pencil aria-hidden="true" /> Edit
                        </button>
                        {course.type === 'live' ? (
                          <a
                            className="ad-row-action"
                            href={`/courses/${course.id}/live`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Studio <ArrowRight aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <dialog
        ref={enrolledRef}
        className="ad-dialog ad-course-dialog"
        aria-labelledby="enrolled-title"
      >
        <div className="ad-dialog-head">
          <div>
            <h2 id="enrolled-title">{current?.name} · enrolled learners</h2>
            <p className="ad-dialog-count">Progress and latest assessment score.</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close enrolled learners"
            onClick={() => enrolledRef.current?.close()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="ad-dialog-body">
          {enrolled.length ? (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Progress</th>
                    <th>Assessment</th>
                    <th>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolled.map((item) => (
                    <tr key={item.enrollment.id}>
                      <td>
                        <strong>
                          {item.student.firstName} {item.student.lastName}
                        </strong>
                        <span className="sb-cell-secondary">{item.student.email}</span>
                      </td>
                      <td>
                        {item.completedCount}/{item.moduleCount} modules
                      </td>
                      <td>
                        {item.assessment ? (
                          <Badge
                            tone={
                              item.assessment.passed === true
                                ? 'green'
                                : item.assessment.passed === false
                                  ? 'red'
                                  : item.assessment.status === 'not_started'
                                    ? 'blue'
                                    : 'amber'
                            }
                          >
                            {item.assessment.status.replace(/_/g, ' ')}
                            {item.assessment.score !== null
                              ? ` · ${Math.round(item.assessment.score)}%`
                              : ''}
                          </Badge>
                        ) : (
                          'No assessment'
                        )}
                      </td>
                      <td>{new Date(item.enrollment.enrolledAt).toLocaleDateString('en-NG')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ad-empty-line">No learners are enrolled in this course yet.</p>
          )}
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={() => enrolledRef.current?.close()}>
            Close
          </Button>
        </div>
      </dialog>
      <dialog
        ref={editRef}
        className={`ad-dialog ${styles.dialog}`}
        aria-labelledby="course-editor-title"
      >
        {current ? (
          <form
            className={styles.editor}
            onSubmit={async (event) => {
              event.preventDefault()
              setSaving(true)
              setEditError('')
              const form = new FormData(event.currentTarget)
              const scheduledValue = String(form.get('scheduledAt') ?? '')
              try {
                const aggregate = await apiFetch<{ course: Course }>(
                  `/api/courses/${encodeURIComponent(current.id)}`,
                  {
                    method: 'PATCH',
                    body: JSON.stringify({
                      name: form.get('name'),
                      durationMinutes: Number(form.get('durationMinutes')),
                      type: editType,
                      liveCallDurationMinutes:
                        editType === 'live' ? editLiveCallDurationMinutes : null,
                      certificateOnCompletion: editCertificateOnCompletion,
                      accessType: editAccessType,
                      priceNaira: editAccessType === 'paid' ? Number(form.get('priceNaira')) : 0,
                      scheduledAt: scheduledValue ? new Date(scheduledValue).toISOString() : null,
                    }),
                  },
                )
                setCourseList((items) =>
                  items.map((course) =>
                    course.id === aggregate.course.id ? aggregate.course : course,
                  ),
                )
                setCurrent(aggregate.course)
                editRef.current?.close()
              } catch (cause) {
                setEditError(cause instanceof Error ? cause.message : 'Course could not be updated')
              } finally {
                setSaving(false)
              }
            }}
          >
            <header className={styles.header}>
              <div className={styles.heading}>
                <span className={styles.mark} aria-hidden="true">
                  <Pencil />
                </span>
                <div>
                  <h2 id="course-editor-title">Edit course</h2>
                  <p>{current.name}</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Close course editor"
                onClick={() => editRef.current?.close()}
              >
                <X aria-hidden="true" />
              </Button>
            </header>
            <div className={styles.body}>
              <section className={styles.section} aria-labelledby="course-details-heading">
                <div className={styles.sectionHead}>
                  <h3 id="course-details-heading">Course details</h3>
                </div>
                <div className={styles.details}>
                  <Field label="Course name" required>
                    <Input name="name" defaultValue={current.name} required />
                  </Field>
                  <Field label="Duration" required>
                    <Input
                      className="ad-duration-input"
                      name="durationMinutes"
                      type="number"
                      min={1}
                      defaultValue={current.durationMinutes}
                      required
                    />
                  </Field>
                  <Field label="Schedule">
                    <Input
                      name="scheduledAt"
                      type="datetime-local"
                      defaultValue={current.scheduledAt?.slice(0, 16) ?? ''}
                    />
                  </Field>
                </div>
              </section>
              <section className={styles.section} aria-labelledby="course-access-heading">
                <div className={styles.sectionHead}>
                  <h3 id="course-access-heading">Delivery & access</h3>
                </div>
                <div className={styles.preferences}>
                  <Field label="Course format">
                    <CustomDropdown<Course['type']>
                      value={editType}
                      onChange={setEditType}
                      options={[
                        {
                          value: 'premade',
                          label: 'Premade',
                          description: 'Available on demand',
                          icon: <Layers3 aria-hidden="true" />,
                        },
                        {
                          value: 'live',
                          label: 'Live',
                          description: 'Host live teaching sessions',
                          icon: <Radio aria-hidden="true" />,
                        },
                      ]}
                    />
                  </Field>
                  {editType === 'live' ? (
                    <Field label="Live class length" required>
                      <select
                        className="sb-input"
                        value={editLiveCallDurationMinutes}
                        onChange={(event) =>
                          setEditLiveCallDurationMinutes(Number(event.target.value))
                        }
                      >
                        {Array.from({ length: 30 }, (_, index) => (index + 1) * 10).map(
                          (minutes) => (
                            <option key={minutes} value={minutes}>
                              {minutes < 60
                                ? `${minutes} minutes`
                                : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Learner access">
                    <CustomDropdown<Course['accessType']>
                      value={editAccessType}
                      onChange={setEditAccessType}
                      options={[
                        {
                          value: 'free',
                          label: 'Free',
                          description: 'No payment required',
                          icon: <Unlock aria-hidden="true" />,
                        },
                        {
                          value: 'paid',
                          label: 'Paid',
                          description: 'Collect payment before access',
                          icon: <CreditCard aria-hidden="true" />,
                        },
                      ]}
                    />
                  </Field>
                  <Field label="Price (NGN)" required={editAccessType === 'paid'}>
                    <Input
                      name="priceNaira"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(current.priceKobo / 100).toFixed(2)}
                      disabled={editAccessType === 'free'}
                      required={editAccessType === 'paid'}
                    />
                  </Field>
                  <label className="ad-certificate-option">
                    <input
                      type="checkbox"
                      checked={editCertificateOnCompletion}
                      onChange={(event) => setEditCertificateOnCompletion(event.target.checked)}
                    />
                    <span>
                      <strong>Award a certificate on completion</strong>
                      <small>No assessment is required for the certificate.</small>
                    </span>
                  </label>
                </div>
              </section>
              {editError ? (
                <p className="sb-form-message" data-tone="error">
                  {editError}
                </p>
              ) : null}
            </div>
            <footer className={styles.footer}>
              <Button type="button" variant="ghost" onClick={() => editRef.current?.close()}>
                Cancel
              </Button>
              <Button busy={saving}>Save changes</Button>
            </footer>
          </form>
        ) : null}
      </dialog>
    </div>
  )
}
