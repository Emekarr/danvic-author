'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AuthorContentPage } from '@/components/author-content'

function ContentView() {
  const q = useSearchParams()
  const filter = q.get('filter') ?? undefined
  return <AuthorContentPage initialFilter={filter} />
}

export default function Page() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Loading content…</p>}>
      <ContentView />
    </Suspense>
  )
}
