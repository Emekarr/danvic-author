'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Course, SignedUpload } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Button, CustomDropdown, Field, FormMessage, Input, Textarea } from '@danvic/ui'
import { CheckSquare2, Link2, Plus, Trash2, UploadCloud } from 'lucide-react'

type OptionDraft = { id: string; label: string; correct: boolean }
type QuestionDraft = {
  prompt: string
  type: 'multiple_choice' | 'free_text'
  options: OptionDraft[]
  mediaType: '' | 'image' | 'video' | 'audio'
  mediaUrl: string
  mediaFile: File | null
  points: number
}

const newQuestion = (index: number): QuestionDraft => ({
  prompt: '',
  type: 'multiple_choice',
  options: [
    { id: `q${index}-a`, label: '', correct: false },
    { id: `q${index}-b`, label: '', correct: false },
  ],
  mediaType: '',
  mediaUrl: '',
  mediaFile: null,
  points: 1,
})

export function AssessmentBuilder({
  courses,
  initialCourseId = '',
  initialAttempts = 2,
}: {
  courses: Course[]
  initialCourseId?: string
  initialAttempts?: number
}) {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion(1)])
  const [manualReview, setManualReview] = useState(false)
  const [retrySupported, setRetrySupported] = useState(false)
  const [courseId, setCourseId] = useState(initialCourseId)
  const [linkToCourse, setLinkToCourse] = useState(Boolean(initialCourseId))
  const [maxAttempts, setMaxAttempts] = useState(initialAttempts)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const attachmentCount = questions.filter((question) => question.mediaType).length

  const updateQuestion = (index: number, update: Partial<QuestionDraft>) =>
    setQuestions((items) =>
      items.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...update } : question,
      ),
    )

  return (
    <div className="ad-form-page">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const data = new FormData(event.currentTarget)
          try {
            const preparedQuestions = []
            for (const question of questions) {
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
                  : question.mediaUrl || null,
                points: question.points,
              })
            }
            const result = await apiFetch<{ id: string }>('/api/assessments', {
              method: 'POST',
              body: JSON.stringify({
                title: data.get('title'),
                description: data.get('description'),
                courseId: linkToCourse && courseId ? courseId : null,
                durationMinutes: Number(data.get('durationMinutes')),
                opensAt: new Date(String(data.get('opensAt'))).toISOString(),
                closesAt: new Date(String(data.get('closesAt'))).toISOString(),
                manualReview,
                retrySupported,
                maxAttempts: retrySupported ? maxAttempts : 1,
                passingScorePercent: Number(data.get('passingScorePercent')),
                questions: preparedQuestions,
              }),
            })
            router.push(`/assessments/${result.id}/submissions`)
            router.refresh()
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
                Link it to a course as the final step, or leave it standalone for direct access.
              </p>
            </div>
          </div>
          <div className="ad-course-details-grid">
            <Field label="Assessment title" required>
              <Input name="title" maxLength={200} required />
            </Field>
            <div className="as-linked-course ad-span-2">
              <div className="as-linked-course-row">
                <label className="as-check-row">
                  <input
                    type="checkbox"
                    checked={linkToCourse}
                    onChange={(event) => {
                      setLinkToCourse(event.target.checked)
                      if (!event.target.checked) setCourseId('')
                    }}
                  />
                  <span>
                    <strong>Linked course (optional)</strong>
                    <small>
                      Require learners to complete a course before this assessment unlocks.
                    </small>
                  </span>
                </label>
                {linkToCourse ? (
                  <Field label="Course" required>
                    <CustomDropdown<string>
                      value={courseId}
                      onChange={setCourseId}
                      placeholder="Choose a course"
                      options={courses.map((course) => ({
                        value: course.id,
                        label: course.name,
                        description: 'Unlock assessment after completion',
                      }))}
                    />
                  </Field>
                ) : null}
              </div>
            </div>
            <Field label="Time allowed (minutes)" required>
              <Input
                name="durationMinutes"
                type="number"
                min={1}
                max={1440}
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
              hint="Scores at or above this percentage pass."
            >
              <Input
                name="passingScorePercent"
                type="number"
                min={0}
                max={100}
                defaultValue={70}
                required
              />
            </Field>
            {retrySupported ? (
              <Field label="Maximum attempts" required hint="Includes the learner's first attempt.">
                <div className="ad-number-picker">
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                    <button
                      type="button"
                      data-selected={maxAttempts === count || undefined}
                      onClick={() => setMaxAttempts(count)}
                      key={count}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}
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
              onChange={(event) => setManualReview(event.target.checked)}
            />
            <span>
              <strong>Review all answers manually</strong>
              <small>
                Leave off to mark MCQs automatically. Written answers always require review.
              </small>
            </span>
          </label>
          <label className="as-check-row">
            <input
              type="checkbox"
              checked={retrySupported}
              onChange={(event) => setRetrySupported(event.target.checked)}
            />
            <span>
              <strong>Allow assessment retries</strong>
              <small>Failed, graded attempts can be retried up to the configured maximum.</small>
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
                    <Field label="Diagram/media">
                      <CustomDropdown<QuestionDraft['mediaType']>
                        value={question.mediaType}
                        onChange={(mediaType) =>
                          updateQuestion(index, {
                            mediaType,
                            ...(mediaType ? {} : { mediaUrl: '', mediaFile: null }),
                          })
                        }
                        options={[
                          { value: '', label: 'No media' },
                          {
                            value: 'image',
                            label: 'Image diagram',
                            disabled: attachmentCount >= 10 && !question.mediaType,
                          },
                          {
                            value: 'video',
                            label: 'Video',
                            disabled: attachmentCount >= 10 && !question.mediaType,
                          },
                          {
                            value: 'audio',
                            label: 'Audio',
                            disabled: attachmentCount >= 10 && !question.mediaType,
                          },
                        ]}
                      />
                    </Field>
                    {question.mediaType ? (
                      <>
                        <Field
                          label="Upload media file"
                          hint="JPEG, PNG, MP4, or MP3 up to 100 MiB."
                        >
                          <Input
                            type="file"
                            accept={mediaAccept(question.mediaType)}
                            onChange={(event) =>
                              updateQuestion(index, {
                                mediaFile: event.target.files?.[0] ?? null,
                                mediaUrl: event.target.files?.[0] ? '' : question.mediaUrl,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label={`Or link an ${question.mediaType === 'image' ? 'image' : question.mediaType}`}
                          hint="A file upload takes precedence over this URL."
                        >
                          <Input
                            type="url"
                            value={question.mediaUrl}
                            disabled={Boolean(question.mediaFile)}
                            placeholder="https://…"
                            onChange={(event) =>
                              updateQuestion(index, { mediaUrl: event.target.value })
                            }
                          />
                        </Field>
                      </>
                    ) : null}
                  </div>
                  {question.mediaType ? (
                    <div className="as-media-note">
                      {question.mediaFile ? (
                        <>
                          <UploadCloud aria-hidden="true" />
                          {question.mediaFile.name} will be uploaded with this assessment.
                        </>
                      ) : question.mediaUrl ? (
                        <>
                          <Link2 aria-hidden="true" />
                          This linked media appears above the question for learners.
                        </>
                      ) : (
                        'Choose a file or paste a secure media link.'
                      )}
                    </div>
                  ) : null}
                  {question.type === 'multiple_choice' ? (
                    <div className="as-answer-section">
                      <div className="as-answer-heading">
                        <div>
                          <strong>Answers</strong>
                          <small>Enter each choice, then mark every correct answer.</small>
                        </div>
                        <span>
                          {question.options.filter((option) => option.correct).length} marked
                        </span>
                      </div>
                      {question.options.map((option, optionIndex) => (
                        <div className="as-answer-row" key={option.id}>
                          <label className="as-answer-correct">
                            <input
                              type="checkbox"
                              checked={option.correct}
                              aria-label={`Mark option ${optionIndex + 1} correct`}
                              onChange={(event) =>
                                updateQuestion(index, {
                                  options: question.options.map((item, itemIndex) =>
                                    itemIndex === optionIndex
                                      ? { ...item, correct: event.target.checked }
                                      : item,
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
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button busy={busy}>
              <CheckSquare2 aria-hidden="true" /> Create assessment
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}

async function uploadAssessmentMedia(file: File): Promise<string> {
  const supported = ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg']
  if (!supported.includes(file.type))
    throw new Error(`${file.name} must be a JPEG, PNG, MP4, or MP3 file`)
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: signed.requiredHeaders,
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded`)
  return signed.attachmentPath
}

const mediaAccept = (type: QuestionDraft['mediaType']) => {
  if (type === 'image') return 'image/jpeg,image/png'
  if (type === 'video') return 'video/mp4'
  if (type === 'audio') return 'audio/mpeg'
  return undefined
}
