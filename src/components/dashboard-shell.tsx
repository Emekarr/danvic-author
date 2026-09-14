'use client'

import { useEffect, type ReactNode } from 'react'
import { AppShell } from '@danvic/ui'
import { Award, Bookmark, BookOpen, ClipboardCheck, Clock, FileText, LayoutDashboard, Library, LockKeyhole, UserRound } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch } from '@danvic/api-client'
import { SessionRenewal } from '@/components/session-renewal'
import { useAuthor } from '@/lib/data'

const dummyAuthorFallback = { firstName: 'Danvic', lastName: 'Author', email: 'author@danvic.ng' }

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { author, loading, code } = useAuthor()

  useEffect(() => {
    if (code === 'TWO_FACTOR_SETUP_REQUIRED') router.replace(`/two-factor/setup?next=${encodeURIComponent(pathname?.startsWith('/') ? pathname : '/dashboard')}`)
  }, [code, pathname, router])
  if (code === 'TWO_FACTOR_SETUP_REQUIRED') return <main className="sb-login-form-wrap"><p className="sb-form-message">Two-factor setup is required before opening your workspace.</p></main>

  if (loading)
    return (
      <main className="sb-login-form-wrap">
        <p className="sb-form-message">Loading your workspace…</p>
      </main>
    )

  const displayAuthor = author ?? dummyAuthorFallback

  return (
    <AppShell
      kind="author"
      displayName={`${displayAuthor.firstName} ${displayAuthor.lastName}`}
      email={displayAuthor.email}
      navigationOverride={[
        { items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }] },
        { label: 'Content', items: [
          { label: 'My content status', href: '/content-review', icon: BookOpen },
          { label: 'Question bank', href: '/content-review/question-bank', icon: Library },
        ] },
        {
          label: 'Assessment',
          items: [
            { label: 'Overview', href: '/assessments', icon: ClipboardCheck },
            { label: 'Assignments', href: '/assessments/assignments', icon: FileText },
            { label: 'Quizzes', href: '/assessments/quizzes', icon: Bookmark },
            { label: 'Exams', href: '/assessments/exams', icon: Award },
            { label: 'Question Bank', href: '/assessments/question-bank', icon: Library },
            { label: 'Pending Assessment Review', href: '/assessments/pending-review', icon: Clock },
          ],
        },
        { label: 'Account', items: [{ label: 'Profile', href: '/profile', icon: UserRound }, { label: 'Security', href: '/security', icon: LockKeyhole }] },
      ]}
      onLogout={async () => {
        await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
      }}
    >
      <SessionRenewal />
      <div className="ad-page">{children}</div>
    </AppShell>
  )
}
