export function courseStudioHref(courseId: string, sessionId?: string) {
  const params = new URLSearchParams({ courseId })
  if (sessionId) params.set('session', sessionId)
  return `/course?${params.toString()}`
}
