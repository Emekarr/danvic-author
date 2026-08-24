'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Course, LiveSession } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Badge, Button, CustomDropdown, Field, FormMessage, Input } from '@danvic/ui'
import { CalendarPlus, Video } from 'lucide-react'
import { courseStudioHref, standaloneLiveClassHref } from '@/lib/course-route'

const durations = Array.from({ length: 30 }, (_, index) => (index + 1) * 10)
const labelDuration = (minutes: number) =>
  minutes < 60
    ? `${minutes} minutes`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`

export function LiveClasses({ courses, sessions }: { courses: Course[]; sessions: LiveSession[] }) {
  const [items, setItems] = useState(sessions)
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const selectedCourse = courses.find((course) => course.id === courseId)
  const [durationMinutes, setDurationMinutes] = useState(
    selectedCourse?.liveCallDurationMinutes ?? 60,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState<number | null>(null)
  const active = useMemo(() => items.filter((item) => item.status !== 'ended').length, [items])
  useEffect(() => {
    const refresh = () => setNow(Date.now())
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="ad-directory-page">
      <header className="sb-page-header">
        <div>
          <p className="sb-page-eyebrow">Teaching room</p>
          <h1>Live classes</h1>
          <p>
            Create focused classes, link them to a course, and keep a clear view of what is next.
          </p>
        </div>
        <Badge tone={active ? 'violet' : 'blue'}>
          {active ? `${active} active or scheduled` : 'No active or scheduled classes'}
        </Badge>
      </header>
      <div className="ad-overview-split">
        <section className="ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>Class schedule</h2>
              <p>Start a class when you are ready; its Agora access ends at the chosen limit.</p>
            </div>
          </div>
          {items.length ? (
            <div className="sb-table-wrap">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>When</th>
                    <th>Length</th>
                    <th>Status</th>
                    <th>Remaining</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((session) => {
                    const course = courses.find((item) => item.id === session.courseId)
                    const remaining =
                      session.expiresAt && now !== null
                        ? Math.max(
                            0,
                            Math.ceil((new Date(session.expiresAt).getTime() - now) / 60000),
                          )
                        : null
                    const startsIn =
                      session.scheduledAt && now !== null
                        ? Math.max(
                            0,
                            Math.ceil((new Date(session.scheduledAt).getTime() - now) / 60000),
                          )
                        : null
                    return (
                      <tr key={session.id}>
                        <td>
                          <strong>{course?.name ?? 'Standalone class'}</strong>
                        </td>
                        <td>
                          {session.scheduledAt
                            ? new Date(session.scheduledAt).toLocaleString('en-NG')
                            : '-'}
                        </td>
                        <td>{labelDuration(session.durationMinutes)}</td>
                        <td>
                          <Badge
                            tone={
                              session.status === 'live'
                                ? 'green'
                                : session.status === 'ended'
                                  ? 'blue'
                                  : 'violet'
                            }
                          >
                            {session.status}
                          </Badge>
                        </td>
                        <td>
                          {session.status === 'live'
                            ? `${remaining ?? 0} min left`
                            : session.status === 'scheduled' && startsIn !== null
                              ? startsIn
                                ? `Starts in ${startsIn} min`
                                : 'Ready to start'
                              : '-'}
                        </td>
                        <td>
                          <Link
                            className="ad-row-action"
                            href={
                              session.courseId
                                ? courseStudioHref(session.courseId, session.id)
                                : standaloneLiveClassHref(session.id)
                            }
                          >
                            <Video aria-hidden="true" /> Open
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ad-empty-line">No live classes yet. Create one for any course below.</p>
          )}
        </section>
        <section className="ad-overview-section">
          <div className="ad-section-heading">
            <div>
              <h2>New live class</h2>
              <p>This does not alter the course; it simply links the class to enrolled learners.</p>
            </div>
          </div>
          <form
            className="sb-list"
            onSubmit={async (event) => {
              event.preventDefault()
              const form = event.currentTarget
              setBusy(true)
              setError('')
              const data = new FormData(form)
              const scheduledAt = String(data.get('scheduledAt') ?? '')
              if (!scheduledAt) {
                setError('Choose a date and time; every live class must have a start time.')
                setBusy(false)
                return
              }
                try {
                  if (!courseId) {
                    setError('Choose a course to attach this class to.')
                    return
                  }
                  const result = await apiFetch<{ session: LiveSession }>('/api/live/live-sessions', {
                    method: 'POST',
                    body: JSON.stringify({
                      courseId,
                      durationMinutes,
                      scheduledAt: new Date(scheduledAt).toISOString(),
                    }),
                  })
                  setItems((current) => [result.session, ...current])
                  form.reset()
                } catch (cause) {
                setError(cause instanceof Error ? cause.message : 'Could not create the live class')
              } finally {
                setBusy(false)
              }
            }}
          >
            <Field
              label="Attach to course"
              hint="Required. Every live class belongs to a course; only enrolled learners can join."
            >
              <CustomDropdown<string>
                value={courseId}
                onChange={(next) => {
                  setCourseId(next)
                  setDurationMinutes(
                    courses.find((course) => course.id === next)?.liveCallDurationMinutes ?? 60,
                  )
                }}
                options={courses.map((course) => ({
                  value: course.id,
                  label: course.name,
                  description:
                    course.type === 'live'
                      ? `Live course · ${course.liveCallDurationMinutes ?? 60}-minute default`
                      : 'Premade course',
                  icon: <Video aria-hidden="true" />,
                }))}
              />
            </Field>
            <Field
              label="Date and time"
              required
              hint="Every live class must have a start time."
            >
              <Input className="ad-live-date-picker" name="scheduledAt" type="datetime-local" />
            </Field>
            <Field label="Call length" required>
              <CustomDropdown<string>
                value={String(durationMinutes)}
                onChange={(minutes) => setDurationMinutes(Number(minutes))}
                options={durations.map((minutes) => ({
                  value: String(minutes),
                  label: labelDuration(minutes),
                  ...(minutes === selectedCourse?.liveCallDurationMinutes
                    ? { description: 'Course default' }
                    : {}),
                }))}
              />
            </Field>
            <Button busy={busy} disabled={!courses.length || !courseId}>
              <CalendarPlus aria-hidden="true" /> Create live class
            </Button>
            {!courses.length ? (
              <FormMessage>Create a course first; every live class must be attached to one.</FormMessage>
            ) : null}
            <FormMessage>{error}</FormMessage>
          </form>
        </section>
      </div>
    </div>
  )
}
