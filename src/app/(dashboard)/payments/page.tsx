'use client'

import { PaymentsPage } from '@/components/payments-page'
import { useWorkspace } from '@/lib/data'

export default function PaymentsRoutePage() {
  const { transactions, loading, error } = useWorkspace()

  if (loading) return <p className="ad-empty-line">Loading transactions…</p>
  if (error) return <p className="ad-empty-line" data-tone="error">{error}</p>

  return <PaymentsPage transactions={transactions} />
}