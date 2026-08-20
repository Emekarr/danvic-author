import { Suspense } from 'react'
import { CourseRouteView } from '@/components/dynamic-views'

export default function CoursePage() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading the course studio…</p>
        </main>
      }
    >
      <CourseRouteView />
    </Suspense>
  )
}
