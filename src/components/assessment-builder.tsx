'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Course, SignedUpload } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Button, CustomDropdown, Field, FormMessage, Input, Textarea } from '@danvic/ui'
import { CheckSquare2, CircleAlert, Paperclip, Plus, Trash2, UploadCloud } from 'lucide-react'
import {
  attachmentIsTooLarge,
  clearPendingCourseDraft,
  createCourseFromDraft,
  loadPendingCourseDraft,
  savePendingCourseDraft,
  type PendingCourseDraft,
} from '@/lib/pending-course-draft'
import { assessmentSubmissionsHref } from '@/lib/course-route'

type OptionDraft = { id: string; label: string; correct: boolean }
type QuestionDraft = {
  prompt: string
  type: 'multiple_choice' | 'free_text'
  options: OptionDraft[]
  mediaType: '' | 'image' | 'video' | 'audio'
  mediaFile: File | null
  resources: File[]
  points: number
}

const MAX_QUESTION_RESOURCES = 10

const newQuestion = (index: number): QuestionDraft => ({
  prompt: '',
  type: 'multiple_choice',
  options: [
    { id: `q${index}-a`, label: '', correct: false },
    { id: `q${index}-b`, label: '', correct: false },
  ],
  mediaType: '',
  mediaFile: null,
  resources: [],
  points: 1,
})

export function AssessmentBuilder({
  courses,
  initialCourseId = '',
  initialAttempts = 1,
  createWithPendingCourse = false,
  onBackToCourse,
}: {
  courses: Course[]
  initialCourseId?: string
  initialAttempts?: number
  createWithPendingCourse?: boolean
  onBackToCourse?: () => void
}) {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion(1)])
  const [manualReview, setManualReview] = useState(false)
  const [courseId, setCourseId] = useState(initialCourseId)
  const [maxAttempts, setMaxAttempts] = useState(initialAttempts)
  const [passingScorePercent, setPassingScorePercent] = useState(70)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingCourse, setPendingCourse] = useState<PendingCourseDraft | null>(null)
  const [pendingCourseLoading, setPendingCourseLoading] = useState(createWithPendingCourse)
  const attachmentCount = questions.filter((question) => question.mediaFile).length
  const retriesEnabled = maxAttempts > 1
  const hasWrittenResponse = questions.some((question) => question.type === 'free_text')
  const allMcqsHaveOneCorrectAnswer = questions.every(
    (question) =>
      question.type !== 'multiple_choice' ||
      question.options.filter((option) => option.correct).length === 1,
  )
  const totalScore = questions.reduce(
    (sum, question) => sum + (Number.isFinite(question.points) ? question.points : 0),
    0,
  )
  const requiredPoints = Math.ceil((totalScore * passingScorePercent) / 100)
  const passMarkAchievable = totalScore > 0 && requiredPoints <= totalScore

  useEffect(() => {
    if (!createWithPendingCourse) return
    let active = true
    void loadPendingCourseDraft()
      .then((draft) => {
        if (!active) return
        setPendingCourse(draft)
        if (!draft)
          setError(
            'The pending course draft could not be found. Return to course creation and try again.',
          )
      })
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Could not load the course draft')
      })
      .finally(() => {
        if (active) setPendingCourseLoading(false)
      })
    return () => {
      active = false
    }
  }, [createWithPendingCourse])

  const updateQuestion = (index: number, update: Partial<QuestionDraft>) =>
    setQuestions((items) =>
      items.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...update } : question,
      ),
    )

  if (pendingCourseLoading) {
    return <p className="ad-empty-line">Loading the pending course draft…</p>
  }

  return (
    <div className="ad-form-page">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            if (!allMcqsHaveOneCorrectAnswer)
              throw new Error(
                'Select exactly one correct answer for every multiple-choice question',
              )
            const preparedQuestions = []
            for (const question of questions) {
              const resources = []
              for (const file of question.resources) {
                const { attachmentPath, fileName } = await uploadQuestionResource(file)
                resources.push({ id: crypto.randomUUID(), attachmentPath, fileName })
              }
              preparedQuestions.push({
                prompt: question.prompt,
                type: question.type,
                options:
                  question.type === 'multiple_choice'
                    ? question.options.map(({ id, label }) => ({ id, label }))
                    : [],
                correctOptionIds:
                  question.type === 'multiple_choice'
                    ? question.options.filter((option) => option.correct).map((option) => option.id)
                    : [],
                mediaType: question.mediaType || null,
                mediaUrl: question.mediaFile
                  ? await uploadAssessmentMedia(question.mediaFile)
                  : null,
                resources,
                points: question.points,
              })
            }
            if (!createWithPendingCourse && !courseId)
              throw new Error('Select the course this assessment belongs to')
            let assessmentCourseId = courseId
            if (createWithPendingCourse) {
              if (!pendingCourse) {
                throw new Error(
                  'The pending course draft is unavailable. Return to course creation and try again.',
                )
              }
              if (pendingCourse.createdCourseId) {
                assessmentCourseId = pendingCourse.createdCourseId
              } else {
                const courseResult = await createCourseFromDraft(pendingCourse)
                assessmentCourseId = courseResult.course.id
                const savedDraft = { ...pendingCourse, createdCourseId: assessmentCourseId }
                setPendingCourse(savedDraft)
                await savePendingCourseDraft(savedDraft)
              }
            }
            const result = await apiFetch<{ id: string }>('/api/assessments', {
              method: 'POST',
              body: JSON.stringify({
                title: data.get('title'),
                description: data.get('description'),
                courseId: assessmentCourseId,
                durationMinutes: Number(data.get('durationMinutes')),
                opensAt: new Date(String(data.get('opensAt'))).toISOString(),
                closesAt: new Date(String(data.get('closesAt'))).toISOString(),
                manualReview,
                retrySupported: retriesEnabled,
                maxAttempts,
                passingScorePercent: Number(data.get('passingScorePercent')),
                questions: preparedQuestions,
              }),
            })
            if (createWithPendingCourse) await clearPendingCourseDraft()
            router.replace(assessmentSubmissionsHref(result.id))
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Assessment could not be created')
          } finally {
            setBusy(false)
          }
        }}
      >
        <section className="ad-section ad-section--first">
          <div className="ad-section-heading">
            <div>
              <h2>Assessment details</h2>
              <p>
                {createWithPendingCourse
                  ? 'Complete the assessment below. The course and assessment will be created together when you submit.'
                  : 'Every assessment is the final step of a course. Choose the course it belongs to.'}
              </p>
            </div>
          </div>
          <div className="ad-course-details-grid">
            <Field label="Assessment title" required>
              <Input name="title" maxLength={200} required />
            </Field>
            <div className="as-linked-course ad-span-2">
              {createWithPendingCourse && pendingCourse ? (
                <div className="ad-pending-course-summary">
                  <CheckSquare2 aria-hidden="true" />
                  <span>
                    <strong>Assessment for {pendingCourse.name}</strong>
                    <small>
                      {pendingCourse.modules.length} module
                      {pendingCourse.modules.length === 1 ? '' : 's'} · the course has not been
                      created yet
                    </small>
                  </span>
                </div>
              ) : (
                <div className="as-linked-course-row">
                  <Field label="Course" required hint="Every assessment must belong to a course.">
                    <CustomDropdown<string>
                      value={courseId}
                      onChange={setCourseId}
                      placeholder="Choose a course"
                      options={courses.map((course) => ({
                        value: course.id,
                        label: course.name,
                        description: 'Unlocks for learners after course completion',
                      }))}
                    />
                  </Field>
                </div>
              )}
            </div>
            <Field
              label="Time allowed (minutes)"
              required
              hint="Between 5 and 180 minutes (3 hours)."
            >
              <Input
                name="durationMinutes"
                type="number"
                min={5}
                max={180}
                defaultValue={30}
                required
              />
            </Field>
            <Field label="Opens at" required>
              <Input name="opensAt" type="datetime-local" required />
            </Field>
            <Field label="Closes at" required>
              <Input name="closesAt" type="datetime-local" required />
            </Field>
            <Field
              label="Passing score (%)"
              required
              hint={
                passMarkAchievable
                  ? `Learners need at least ${requiredPoints} of ${totalScore} points to pass.`
                  : 'The pass mark is higher than the total score achievable from the questions.'
              }
            >
              <Input
                name="passingScorePercent"
                type="number"
                min={0}
                max={100}
                value={passingScorePercent}
                onChange={(event) => setPassingScorePercent(Number(event.target.value))}
                required
                aria-invalid={!passMarkAchievable || undefined}
              />
            </Field>
            <Field
              label="Assessment attempts"
              required
              hint="1 means no retries. Any higher number enables retries."
            >
              <CustomDropdown<string>
                value={String(maxAttempts)}
                onChange={(attempts) => setMaxAttempts(Number(attempts))}
                options={Array.from({ length: 10 }, (_, index) => index + 1).map((count) => ({
                  value: String(count),
                  label: count === 1 ? '1 attempt (no retries)' : `${count} attempts`,
                }))}
              />
            </Field>
          </div>
          <div className="ad-assessment-instructions">
            <Field label="Instructions" required>
              <Textarea name="description" maxLength={5000} required />
            </Field>
          </div>
          <label className="as-check-row">
            <input
              type="checkbox"
              checked={manualReview}
              disabled={hasWrittenResponse}
              onChange={(event) => setManualReview(event.target.checked)}
            />
            <span>
              <strong>Review all answers manually</strong>
              <small>
                {hasWrittenResponse
                  ? 'Written answers require manual review, so this is always on.'
                  : 'Leave off to mark MCQs automatically.'}
              </small>
            </span>
          </label>
        </section>

        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Questions</h2>
              <p>
                Add any number of questions. MCQs require 2–6 options; media is limited to 10
                attachments across the assessment ({attachmentCount}/10 used).
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() => setQuestions((items) => [...items, newQuestion(items.length + 1)])}
            >
              <Plus aria-hidden="true" /> Add question
            </Button>
          </div>
          <div className="as-question-list">
            {questions.map((question, index) => (
              <div className="as-question-editor ad-form-panel" key={index}>
                <div className="as-question-heading">
                  <span>Question {index + 1}</span>
                  {questions.length > 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() =>
                        setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                <div className="sb-list">
                  <Field label="Question" required>
                    <Textarea
                      value={question.prompt}
                      maxLength={5000}
                      required
                      onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                    />
                  </Field>
                  <div className="sb-form-grid">
                    <Field label="Response type" required>
                      <CustomDropdown<QuestionDraft['type']>
                        value={question.type}
                        onChange={(type) => {
                          updateQuestion(index, {
                            type,
                            options:
                              type === 'multiple_choice' && question.options.length < 2
                                ? newQuestion(index + 1).options
                                : question.options,
                          })
                          if (type === 'free_text') setManualReview(true)
                        }}
                        options={[
                          {
                            value: 'multiple_choice',
                            label: 'Multiple choice',
                            description: 'Learners select from the answer options',
                          },
                          {
                            value: 'free_text',
                            label: 'Written response',
                            description: 'Learners write their answer',
                          },
                        ]}
                      />
                    </Field>
                    <Field label="Points" required>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={question.points}
                        onChange={(event) =>
                          updateQuestion(index, { points: Number(event.target.value) })
                        }
                        required
                      />
                    </Field>
                    <Field
                      label="Diagram/media"
                      hint="Optional: JPEG, PNG, MP4, or MP3 up to 100 MiB."
                    >
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,video/mp4,audio/mpeg"
                        disabled={attachmentCount >= 10 && !question.mediaFile}
                        onChange={(event) => {
                          const mediaFile = event.target.files?.[0] ?? null
                          updateQuestion(index, {
                            mediaFile,
                            mediaType: mediaFile ? mediaTypeForFile(mediaFile) : '',
                          })
                        }}
                      />
                    </Field>
                  </div>
                  <Field
                    label="Resources"
                    hint={`Optional files learners open alongside this question (${question.resources.length}/${MAX_QUESTION_RESOURCES} added).`}
                  >
                    <Input
                      type="file"
                      multiple
                      disabled={question.resources.length >= MAX_QUESTION_RESOURCES}
                      onChange={(event) => {
                        const incoming = Array.from(event.target.files ?? [])
                        updateQuestion(index, {
                          resources: [...question.resources, ...incoming].slice(
                            0,
                            MAX_QUESTION_RESOURCES,
                          ),
                        })
                        event.target.value = ''
                      }}
                    />
                  </Field>
                  {question.resources.length ? (
                    <ul className="as-resource-list">
                      {question.resources.map((file, resourceIndex) => (
                        <li key={`${file.name}-${resourceIndex}`}>
                          <Paperclip aria-hidden="true" />
                          <span>{file.name}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove resource ${file.name}`}
                            onClick={() =>
                              updateQuestion(index, {
                                resources: question.resources.filter(
                                  (_, fileIndex) => fileIndex !== resourceIndex,
                                ),
                              })
                            }
                          >
                            <Trash2 />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {question.mediaFile ? (
                    <div
                      className={`as-media-note${attachmentIsTooLarge(question.mediaFile) ? ' is-invalid' : ''}`}
                    >
                      {attachmentIsTooLarge(question.mediaFile) ? (
                        <CircleAlert aria-hidden="true" />
                      ) : (
                        <UploadCloud aria-hidden="true" />
                      )}
                      {attachmentIsTooLarge(question.mediaFile)
                        ? `${question.mediaFile.name} is over 100 MiB — upload will fail.`
                        : `${question.mediaFile.name} will be uploaded with this assessment.`}
                    </div>
                  ) : null}
                  {question.type === 'multiple_choice' ? (
                    <div className="as-answer-section">
                      <div className="as-answer-heading">
                        <div>
                          <strong>Answers</strong>
                          <small>Select exactly one correct answer.</small>
                        </div>
                        <span>
                          {question.options.filter((option) => option.correct).length === 1
                            ? '1 selected'
                            : 'Select 1'}
                        </span>
                      </div>
                      {question.options.map((option, optionIndex) => (
                        <div className="as-answer-row" key={option.id}>
                          <label className="as-answer-correct">
                            <input
                              type="radio"
                              name={`correct-answer-${index}`}
                              checked={option.correct}
                              aria-label={`Mark option ${optionIndex + 1} correct`}
                              onChange={() =>
                                updateQuestion(index, {
                                  options: question.options.map((item, itemIndex) =>
                                    itemIndex === optionIndex
                                      ? { ...item, correct: true }
                                      : { ...item, correct: false },
                                  ),
                                })
                              }
                            />
                            <span>{option.correct ? 'Correct' : 'Answer'}</span>
                          </label>
                          <Input
                            value={option.label}
                            placeholder={`Option ${optionIndex + 1}`}
                            maxLength={500}
                            required
                            onChange={(event) =>
                              updateQuestion(index, {
                                options: question.options.map((item, itemIndex) =>
                                  itemIndex === optionIndex
                                    ? { ...item, label: event.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                          {question.options.length > 2 ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove option ${optionIndex + 1}`}
                              onClick={() =>
                                updateQuestion(index, {
                                  options: question.options.filter(
                                    (_, itemIndex) => itemIndex !== optionIndex,
                                  ),
                                })
                              }
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      {question.options.length < 6 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateQuestion(index, {
                              options: [
                                ...question.options,
                                { id: crypto.randomUUID(), label: '', correct: false },
                              ],
                            })
                          }
                        >
                          <Plus aria-hidden="true" /> Add option
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="as-answer-section as-written-preview">
                      <strong>Written answer</strong>
                      <p>
                        Learners receive a large text box. This response will be queued for manual
                        review.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="ad-section">
          <FormMessage>{error}</FormMessage>
          <div className="sb-form-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onBackToCourse
                  ? onBackToCourse()
                  : createWithPendingCourse
                    ? router.push('/courses/new')
                    : router.back()
              }
            >
              {createWithPendingCourse ? 'Back to course' : 'Cancel'}
            </Button>
            <Button
              busy={busy}
              disabled={
                !allMcqsHaveOneCorrectAnswer ||
                !passMarkAchievable ||
                (createWithPendingCourse && !pendingCourse)
              }
            >
              <CheckSquare2 aria-hidden="true" />
              {createWithPendingCourse ? 'Create course with assessment' : 'Create assessment'}
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}

async function uploadAssessmentMedia(file: File): Promise<string> {
  if (attachmentIsTooLarge(file))
    throw new Error(`${file.name} is over 100 MiB and cannot be uploaded`)
  const supported = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg']
  if (!supported.includes(file.type))
    throw new Error(`${file.name} must be a JPEG, PNG, MP4, or MP3 file`)
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded`)
  return signed.attachmentPath
}

async function uploadQuestionResource(
  file: File,
): Promise<{ attachmentPath: string; fileName: string }> {
  if (attachmentIsTooLarge(file))
    throw new Error(`${file.name} is over 100 MiB and cannot be uploaded`)
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded`)
  return { attachmentPath: signed.attachmentPath, fileName: file.name }
}

const mediaTypeForFile = (file: File): QuestionDraft['mediaType'] => {
  if (file.type === 'image/jpeg' || file.type === 'image/png') return 'image'
  if (file.type === 'video/mp4') return 'video'
  if (file.type === 'audio/mpeg') return 'audio'
  return ''
}
