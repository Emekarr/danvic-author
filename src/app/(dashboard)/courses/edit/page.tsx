'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@danvic/ui'
import type { CourseAggregate } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { CourseEditForm } from '@/components/course-edit-form'

export default function EditCourseRoutePage() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Loading course editor…</p>}>
      <EditCourseView />
    </Suspense>
  )
}

function EditCourseView() {
  const query = useSearchParams()
  const courseId = query.get('id') ?? ''
  const [aggregate, setAggregate] = useState<CourseAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!courseId) return
    let active = true
    apiFetch<CourseAggregate>(`/api/courses/${encodeURIComponent(courseId)}`)
      .then((result) => {
        if (active) setAggregate(result)
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'The course could not be loaded')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [courseId])

  if (!courseId)
    return (
      <p className="ad-empty-line" data-tone="error">
        No course was selected. Open this editor from the courses list.
      </p>
    )

  return (
    <>
      <PageHeader
        eyebrow="Course builder"
        title="Edit course"
        description="Update the course details, modules, and attachments. Your changes go live when you save."
      />
      {loading ? <p className="ad-empty-line">Loading course…</p> : null}
      {!loading && error ? (
        <p className="ad-empty-line" data-tone="error">
          {error}
        </p>
      ) : null}
      {!loading && !error && aggregate ? <CourseEditForm aggregate={aggregate} /> : null}
    </>
  )
}
