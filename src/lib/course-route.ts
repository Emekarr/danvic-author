export function courseStudioHref(courseId: string, sessionId?: string) {
  const params = new URLSearchParams({ courseId })
  if (sessionId) params.set('session', sessionId)
  return `/course?${params.toString()}`
}

export function assessmentSubmissionsHref(assessmentId: string) {
  return `/assessments?assessmentId=${encodeURIComponent(assessmentId)}`
}

export function standaloneLiveClassHref(sessionId: string) {
  return `/live-classes?sessionId=${encodeURIComponent(sessionId)}`
}
