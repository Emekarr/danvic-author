'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FilePlus2, Trash2 } from 'lucide-react'
import { clearPendingCourseDraft, loadPendingCourseDraft } from '@/lib/pending-course-draft'

export function CourseCreateButton() {
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    let active = true
    void loadPendingCourseDraft()
      .then((draft) => {
        if (active && draft && !draft.createdCourseId) setHasDraft(true)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (!hasDraft)
    return (
      <Link href="/courses/new" className="sb-button sb-button--primary sb-button--md">
        <FilePlus2 aria-hidden="true" /> Create course
      </Link>
    )

  return (
    <>
      <Link href="/courses/new" className="sb-button sb-button--primary sb-button--md">
        <FilePlus2 aria-hidden="true" /> Continue creating course
      </Link>
      <button
        type="button"
        className="sb-button sb-button--ghost sb-button--md"
        aria-label="Delete the saved course draft"
        onClick={() => {
          void clearPendingCourseDraft().finally(() => setHasDraft(false))
        }}
      >
        <Trash2 aria-hidden="true" /> Delete draft
      </button>
    </>
  )
}
