'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  apiFetch,
  type Assessment,
  type AssessmentAttempt,
  type AuthorPaymentTransaction,
  type AuthorProfile,
  type Course,
  type CourseParticipant,
  type LiveSession,
} from '@danvic/api-client'

export type Workspace = {
  author: AuthorProfile
  courses: Course[]
  participants: CourseParticipant[]
  assessments: Assessment[]
  transactions: AuthorPaymentTransaction[]
  sessions: LiveSession[]
}

const emptyWorkspace: Workspace = {
  author: {} as AuthorProfile,
  courses: [],
  participants: [],
  assessments: [],
  transactions: [],
  sessions: [],
}

export interface ResourceState<T> {
  data: T | null
  loading: boolean
  error: string
  reload: () => void
}

export function useResource<T>(path: string, gate = false): ResourceState<T> {
  const router = useRouter()
  const [tick, setTick] = useState(0)
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null,
    loading: true,
    error: '',
  })
  useEffect(() => {
    let active = true
    apiFetch<T>(path)
      .then((data) => {
        if (active) setState({ data, loading: false, error: '' })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setState({
          data: null,
          loading: false,
          error: cause instanceof Error ? cause.message : 'Could not load data.',
        })
        if (gate) router.replace('/login')
      })
    return () => {
      active = false
    }
  }, [path, router, gate, tick])
  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: '' }))
    setTick((value) => value + 1)
  }, [])
  return { ...state, reload }
}

export function useAuthor(): { author: AuthorProfile | null } & ResourceState<{
  author: AuthorProfile
}> {
  const state = useResource<{ author: AuthorProfile }>('/api/auth/me', true)
  return { author: state.data?.author ?? null, ...state }
}

export function useWorkspace(): Workspace & { loading: boolean; error: string } {
  const router = useRouter()
  const [state, setState] = useState({ ...emptyWorkspace, loading: true, error: '' })
  useEffect(() => {
    let active = true
    void Promise.all([
      apiFetch<{ author: AuthorProfile }>('/api/auth/me'),
      apiFetch<{ courses: Course[] }>('/api/courses'),
      apiFetch<{ assessments: Assessment[] }>('/api/assessments'),
      apiFetch<{ transactions: AuthorPaymentTransaction[] }>('/api/payments'),
      apiFetch<{ sessions: LiveSession[] }>('/api/live/live-sessions'),
    ])
      .then(
        async ([me, courses, assessments, transactions, sessions]: [
          { author: AuthorProfile },
          { courses: Course[] },
          { assessments: Assessment[] },
          { transactions: AuthorPaymentTransaction[] },
          { sessions: LiveSession[] },
        ]) => {
          const lists = await Promise.all(
            courses.courses.map((course) =>
              apiFetch<{ participants: CourseParticipant[] }>(
                `/api/courses/${encodeURIComponent(course.id)}/participants`,
              ).catch(() => ({ participants: [] })),
            ),
          )
          if (active) {
            setState({
              author: me.author,
              courses: courses.courses,
              assessments: assessments.assessments,
              transactions: transactions.transactions,
              sessions: sessions.sessions,
              participants: lists.flatMap((value) => value.participants),
              loading: false,
              error: '',
            })
          }
        },
      )
      .catch((cause: unknown) => {
        if (active) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              cause instanceof Error ? cause.message : 'Could not load your workspace.',
          }))
          router.replace('/login')
        }
      })
    return () => {
      active = false
    }
  }, [router])
  return state
}

export function useAssessment(assessmentId: string) {
  return useResource<Assessment>(`/api/assessments/${encodeURIComponent(assessmentId)}`)
}

export function useAssessmentSubmissions(assessmentId: string) {
  return useResource<{ submissions: AssessmentAttempt[] }>(
    `/api/assessments/${encodeURIComponent(assessmentId)}/submissions`,
  )
}