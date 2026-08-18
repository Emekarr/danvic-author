'use client'

import { Overview } from '@/components/overview'
import { useWorkspace } from '@/lib/data'

export default function DashboardPage() {
  const { courses, assessments, transactions, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading your workspace…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <Overview courses={courses} assessments={assessments} transactions={transactions} />
}