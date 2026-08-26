'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Assessment, AssessmentAttempt } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Badge, Button, Card, Field, FormMessage, Input, Textarea } from '@danvic/ui'
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, Paperclip } from 'lucide-react'

export function AssessmentReview({
  assessment,
  submissions,
}: {
  assessment: Assessment
  submissions: AssessmentAttempt[]
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (!submissions.length)
    return (
      <Card className="sb-empty-state">
        <h3>No submissions yet</h3>
        <p>Learner submissions will appear here after they finish the assessment.</p>
      </Card>
    )
  const selected = submissions.find((submission) => submission.id === selectedId) ?? null
  if (selected)
    return (
      <div className="as-review-list">
        <button
          type="button"
          className="sb-button sb-button--ghost sb-button--md as-review-back"
          onClick={() => setSelectedId(null)}
        >
          <ArrowLeft aria-hidden="true" /> All attempts
        </button>
        <SubmissionCard assessment={assessment} submission={selected} />
      </div>
    )
  return (
    <div className="as-attempt-list" role="list" aria-label="Assessment attempts">
      {[...submissions]
        .sort((left, right) => left.attemptNumber - right.attemptNumber)
        .map((submission) => {
          const pending = submission.status === 'pending_review'
          return (
            <button
              type="button"
              role="listitem"
              className="as-attempt-row"
              key={submission.id}
              onClick={() => setSelectedId(submission.id)}
            >
              <span className="as-attempt-row-main">
                <strong>
                  {submission.student
                    ? `${submission.student.firstName} ${submission.student.lastName}`
                    : 'Learner'}
                </strong>
                <small>{submission.student?.email}</small>
              </span>
              <Badge>Attempt {submission.attemptNumber}</Badge>
              <Badge tone={pending ? 'amber' : submission.passed ? 'green' : 'red'}>
                {pending
                  ? 'needs review'
                  : `${submission.passed ? 'passed' : 'failed'} · ${submission.score ?? 0}/${submission.maxScore}`}
              </Badge>
              <span className="as-attempt-row-date">
                {submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString()
                  : 'In progress'}
              </span>
              <span className="as-attempt-row-view">
                <Eye aria-hidden="true" /> View <ChevronRight aria-hidden="true" />
              </span>
            </button>
          )
        })}
    </div>
  )
}

function SubmissionCard({
  assessment,
  submission,
}: {
  assessment: Assessment
  submission: AssessmentAttempt
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = submission.status === 'pending_review'
  const selected = (questionId: string) =>
    submission.answers.find((answer) => answer.questionId === questionId)
  return (
    <Card className="as-review-card ad-submission-card">
      <div className="sb-card-header">
        <div>
          <h2>
            {submission.student
              ? `${submission.student.firstName} ${submission.student.lastName}`
              : 'Learner'}
          </h2>
          <p>
            {submission.student?.email} · Submitted{' '}
            {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
          </p>
        </div>
        <div>
          <Badge>Attempt {submission.attemptNumber}</Badge>{' '}
          <Badge tone={pending ? 'amber' : submission.passed ? 'green' : 'red'}>
            {pending
              ? 'needs review'
              : `${submission.passed ? 'passed' : 'failed'} · ${submission.score ?? 0}/${submission.maxScore}`}
          </Badge>
        </div>
      </div>
      <div className="ad-submission-facts">
        <span>
          <small>Attempt</small>
          <strong>{submission.attemptNumber}</strong>
        </span>
        <span>
          <small>Submitted</small>
          <strong>
            {submission.submittedAt
              ? new Date(submission.submittedAt).toLocaleDateString('en-NG')
              : 'In progress'}
          </strong>
        </span>
        <span>
          <small>Score</small>
          <strong>
            {submission.score == null
              ? 'Awaiting review'
              : `${submission.score}/${submission.maxScore}`}
          </strong>
        </span>
      </div>
      <form
        className="sb-card-body as-review-answers"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            await apiFetch(
              `/api/assessments/${assessment.id}/submissions/${submission.id}/review`,
              {
                method: 'POST',
                body: JSON.stringify({
                  grades: assessment.questions.map((question) => ({
                    questionId: question.id,
                    awardedPoints: Number(data.get(`points-${question.id}`)),
                    feedback: String(data.get(`feedback-${question.id}`) ?? '') || null,
                  })),
                }),
              },
            )
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Review could not be saved')
          } finally {
            setBusy(false)
          }
        }}
      >
        {assessment.questions.map((question, index) => {
          const answer = selected(question.id)
          const labels = question.options
            .filter((option) => answer?.selectedOptionIds.includes(option.id))
            .map((option) => option.label)
          return (
            <section className="as-reviewed-answer" key={question.id}>
              <div className="as-answer-title">
                <strong>
                  {index + 1}. {question.prompt}
                </strong>
                <span>{question.points} pts</span>
              </div>
              <div className="as-answer-response">
                {question.type === 'free_text'
                  ? answer?.text || <em>No written response</em>
                  : labels.join(', ') || <em>No option selected</em>}
              </div>
              {question.resources?.length ? (
                <p className="as-question-resources">
                  <Paperclip aria-hidden="true" /> Resources: {question.resources.map((resource) => resource.fileName).join(', ')}
                </p>
              ) : null}
              {pending ? (
                <div className="as-grade-grid">
                  <Field label={`Points awarded (max ${question.points})`} required>
                    <Input
                      name={`points-${question.id}`}
                      type="number"
                      min={0}
                      max={question.points}
                      step="any"
                      defaultValue={answer?.awardedPoints ?? 0}
                      required
                    />
                  </Field>
                  <Field label="Feedback (optional)">
                    <Textarea
                      name={`feedback-${question.id}`}
                      defaultValue={answer?.feedback ?? ''}
                      maxLength={5000}
                    />
                  </Field>
                </div>
              ) : (
                <p className="as-grade-result">
                  <CheckCircle2 aria-hidden="true" /> {answer?.awardedPoints ?? 0}/{question.points}{' '}
                  points {answer?.feedback ? `· ${answer.feedback}` : ''}
                </p>
              )}
            </section>
          )
        })}
        <FormMessage>{error}</FormMessage>
        {pending ? (
          <Button busy={busy}>
            <CheckCircle2 aria-hidden="true" /> Complete review
          </Button>
        ) : null}
      </form>
    </Card>
  )
}
