'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import type { Attachment, Course, CourseAggregate, CourseParticipant } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Badge, Button } from '@danvic/ui'
import { Download, ExternalLink, FileText, MoreHorizontal, Pencil, X } from 'lucide-react'
import { CourseCreateButton } from '@/components/course-create-button'
import { courseStudioHref } from '@/lib/course-route'

export function CourseWorkspace({
  courses,
  participants,
}: {
  courses: Course[]
  participants: CourseParticipant[]
}) {
  const enrolledRef = useRef<HTMLDialogElement>(null)
  const materialsRef = useRef<HTMLDialogElement>(null)
  const [current, setCurrent] = useState<Course | null>(null)
  const [courseList] = useState(courses)
  const [materials, setMaterials] = useState<Attachment[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsError, setMaterialsError] = useState('')
  const [menuCourseId, setMenuCourseId] = useState<string | null>(null)
  const enrolled = participants.filter((item) => item.enrollment.courseId === current?.id)
  const openMaterials = async (course: Course) => {
    setCurrent(course)
    setMaterials([])
    setMaterialsError('')
    setMaterialsLoading(true)
    try {
      const aggregate = await apiFetch<CourseAggregate>(`/api/courses/${encodeURIComponent(course.id)}`)
      setMaterials(aggregate.attachments)
      materialsRef.current?.showModal()
    } catch (cause) {
      setMaterialsError(cause instanceof Error ? cause.message : 'Course materials could not be loaded')
    } finally {
      setMaterialsLoading(false)
    }
  }
  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <h1>Courses</h1>
          <p>Publish, update, and review every authored learning experience.</p>
        </div>
        <div className="sb-page-actions">
          <CourseCreateButton />
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
                        className="ad-enrolled-button ad-course-enrollment"
                        type="button"
                        aria-label={`View ${count} enrolled ${count === 1 ? 'learner' : 'learners'}`}
                        onClick={() => {
                          setCurrent(course)
                          enrolledRef.current?.showModal()
                        }}
                      >
                        {count}
                      </button>
                    </td>
                    <td>
                      <div className="ad-course-actions">
                        <Link
                          className="ad-course-action"
                          href={`/courses/edit?id=${encodeURIComponent(course.id)}`}
                        >
                          <Pencil aria-hidden="true" /> <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          className="ad-course-action"
                          onClick={() => void openMaterials(course)}
                          disabled={materialsLoading}
                        >
                          <FileText aria-hidden="true" /> <span>Materials</span>
                        </button>
                        {course.type === 'live' ? (
                          <Link
                            className="ad-course-action ad-course-action--studio"
                            href={courseStudioHref(course.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span>Join live class now</span>
                          </Link>
                        ) : null}
                      </div>
                      <div className="ad-course-mobile-actions">
                        {course.type === 'live' ? (
                          <Link
                            className="ad-course-live-button"
                            href={courseStudioHref(course.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Join live class now
                          </Link>
                        ) : null}
                        <div className="ad-course-more">
                          <button
                            type="button"
                            className="ad-course-more-trigger"
                            aria-label={`More actions for ${course.name}`}
                            aria-expanded={menuCourseId === course.id}
                            onClick={() => setMenuCourseId((id) => (id === course.id ? null : course.id))}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </button>
                          {menuCourseId === course.id ? (
                            <div className="ad-course-more-menu">
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuCourseId(null)
                                  void openMaterials(course)
                                }}
                              >
                                <FileText aria-hidden="true" /> Materials
                              </button>
                              <Link
                                href={`/courses/edit?id=${encodeURIComponent(course.id)}`}
                                onClick={() => setMenuCourseId(null)}
                              >
                                <Pencil aria-hidden="true" /> Edit
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {materialsError ? <p className="sb-form-message" data-tone="error">{materialsError}</p> : null}
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
      <dialog ref={materialsRef} className="ad-dialog ad-course-materials-dialog" aria-labelledby="course-materials-title">
        <div className="ad-dialog-head">
          <div>
            <p className="ad-dialog-eyebrow">Course library</p>
            <h2 id="course-materials-title">{current?.name} materials</h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => materialsRef.current?.close()}>
            Cancel
          </Button>
        </div>
        <div className="ad-dialog-body">
          {materials.length ? (
            <div className="ad-course-material-list">
              {materials.map((attachment) => (
                <AuthorAttachmentAccess
                  key={attachment.id}
                  courseId={attachment.courseId}
                  attachment={attachment}
                />
              ))}
            </div>
          ) : (
            <p className="ad-empty-line">This course has no materials yet.</p>
          )}
        </div>
      </dialog>
    </div>
  )
}

function AuthorAttachmentAccess({ courseId, attachment }: { courseId: string; attachment: Attachment }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [viewUrl, setViewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attachmentPath = `/api/courses/${encodeURIComponent(courseId)}/attachments/${encodeURIComponent(attachment.id)}`
  const close = () => dialogRef.current?.close()
  const open = async () => {
    setBusy(true)
    setError('')
    try {
      const signed = await apiFetch<{ viewUrl: string }>(`${attachmentPath}/view`)
      setViewUrl(signed.viewUrl)
      dialogRef.current?.showModal()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This material could not be opened')
    } finally {
      setBusy(false)
    }
  }
  const download = async () => {
    close()
    try {
      const signed = await apiFetch<{ downloadUrl: string }>(`${attachmentPath}/download`)
      const link = document.createElement('a')
      link.href = signed.downloadUrl
      link.click()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This material could not be downloaded')
    }
  }
  return (
    <>
      <button type="button" className="ad-course-material" onClick={() => void open()} disabled={busy}>
        <span><FileText aria-hidden="true" /></span>
        <strong>{attachment.fileName}</strong>
        <ExternalLink aria-hidden="true" />
      </button>
      {error ? <p className="sb-form-message" data-tone="error">{error}</p> : null}
      <dialog ref={dialogRef} className="ad-dialog ad-attachment-access-dialog" aria-labelledby={`attachment-${attachment.id}`}>
        <div className="ad-dialog-head">
          <div>
            <p className="ad-dialog-eyebrow">Course material</p>
            <h2 id={`attachment-${attachment.id}`}>Choose how to open this file</h2>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={close}>Cancel</Button>
        </div>
        <div className="ad-dialog-body">
          <div className="ad-attachment-access-file">
            <span><FileText aria-hidden="true" /></span>
            <strong>{attachment.fileName}</strong>
          </div>
          <p className="ad-dialog-question">Open a secure view in a new tab, or download a copy to your device.</p>
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="secondary" onClick={() => void download()}><Download aria-hidden="true" /> Download</Button>
          <Button type="button" onClick={() => { close(); window.open(viewUrl, '_blank', 'noopener,noreferrer') }}><ExternalLink aria-hidden="true" /> View in new tab</Button>
        </div>
      </dialog>
    </>
  )
}
