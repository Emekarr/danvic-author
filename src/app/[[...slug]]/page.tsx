import { Suspense } from 'react'
import { CatchAllClient } from './catch-all-client'

export function generateStaticParams() {
  return [{ slug: [] }]
}

export default function CatchAllPage() {
  return (
    <Suspense
      fallback={
        <main className="sb-login-form-wrap">
          <p className="sb-form-message">Loading…</p>
        </main>
      }
    >
      <CatchAllClient />
    </Suspense>
  )
}