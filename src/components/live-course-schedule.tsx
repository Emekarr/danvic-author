'use client'

import { useEffect, useState } from 'react'
import { apiFetch, type Course, type LiveReminderPreference } from '@danvic/api-client'
import { Check } from 'lucide-react'

export function LiveCourseSchedule({
  courses,
  startsIn,
}: {
  courses: Course[]
  startsIn: string[]
}) {
  const [reminders, setReminders] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void apiFetch<{ preferences: LiveReminderPreference[] }>('/api/courses/reminder-preferences')
      .then((result) =>
        setReminders(
          result.preferences.filter((item) => item.enabled).map((item) => item.courseId),
        ),
      )
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : 'Reminder preferences could not be loaded',
        ),
      )
  }, [])
  if (!courses.length) return null
  return (
    <section className="ad-live-schedule" aria-label="Upcoming live courses">
      <div className="ad-live-schedule-head">
        <div>
          <h2>
            Upcoming live courses <span>{courses.length}</span>
          </h2>
        </div>
      </div>
      <div
        className="ad-live-schedule-list"
        data-scrollable={courses.length > 3 || undefined}
        aria-label="Live course schedule"
      >
        {courses.map((course, index) => {
          const checked = reminders.includes(course.id)
          return (
            <div className="ad-live-schedule-row" key={course.id}>
              <div className="ad-live-schedule-session">
                <time className="ad-live-schedule-date" dateTime={course.scheduledAt!}>
                  <strong>
                    {new Date(course.scheduledAt!).toLocaleDateString('en-NG', { day: '2-digit' })}
                  </strong>
                  <span>
                    {new Date(course.scheduledAt!).toLocaleDateString('en-NG', { month: 'short' })}
                  </span>
                </time>
                <span className="ad-live-schedule-copy">
                  <strong>{course.name}</strong>
                  <small>
                    {new Date(course.scheduledAt!).toLocaleString('en-NG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </small>
                </span>
                <em>{startsIn[index]}</em>
              </div>
              <label className="ad-email-reminder" data-checked={checked || undefined}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={saving === course.id}
                  onChange={() => {
                    const enabled = !checked
                    setSaving(course.id)
                    setError('')
                    void apiFetch<{ preference: LiveReminderPreference }>(
                      `/api/courses/${encodeURIComponent(course.id)}/reminder-preferences`,
                      { method: 'PUT', body: JSON.stringify({ enabled }) },
                    )
                      .then(() =>
                        setReminders((items) =>
                          enabled ? [...items, course.id] : items.filter((id) => id !== course.id),
                        ),
                      )
                      .catch((cause: unknown) =>
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Reminder preference could not be saved',
                        ),
                      )
                      .finally(() => setSaving(null))
                  }}
                />
                <span>Remind me by email</span>
                <span className="ad-email-reminder-switch" aria-hidden="true">
                  <span>{checked ? <Check /> : null}</span>
                </span>
              </label>
            </div>
          )
        })}
      </div>
      {error ? (
        <p className="sb-form-message" data-tone="error">
          {error}
        </p>
      ) : null}
    </section>
  )
}
