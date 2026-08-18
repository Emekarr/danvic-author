'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NextImage from 'next/image'
import { apiFetch, type CourseAggregate, type SignedUpload } from '@danvic/api-client'
import { Button, CustomDropdown, Field, FormMessage, Input, Textarea } from '@danvic/ui'
import {
  CreditCard,
  FileUp,
  Layers3,
  Paperclip,
  Plus,
  Radio,
  Trash2,
  Unlock,
  UploadCloud,
  X,
} from 'lucide-react'

type ModuleResource = {
  id: string
  label: string
  file: File | null
}
type ModuleDraft = { title: string; content: string; resources: ModuleResource[] }

const COURSE_FILE_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.svg,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a,.ogg,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip'

async function upload(file: File): Promise<string> {
  if (!file.type) throw new Error(`${file.name} does not have a supported content type`)
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: signed.requiredHeaders,
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded to course storage`)
  return signed.attachmentPath
}

export function CourseCreateForm() {
  const router = useRouter()
  const [modules, setModules] = useState<ModuleDraft[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [type, setType] = useState<'premade' | 'live'>('premade')
  const [liveCallDurationMinutes, setLiveCallDurationMinutes] = useState(60)
  const [accessType, setAccessType] = useState<'free' | 'paid'>('free')
  const [certificateOnCompletion, setCertificateOnCompletion] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [preview, setPreview] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const previewRef = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const addResource = (moduleIndex: number) =>
    setModules((items) =>
      items.map((item, itemIndex) =>
        itemIndex === moduleIndex
          ? {
              ...item,
              resources: [...item.resources, { id: crypto.randomUUID(), label: '', file: null }],
            }
          : item,
      ),
    )
  return (
    <div className="ad-form-page">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          const createAssessment =
            (event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-next') === 'assessment'
          const data = new FormData(event.currentTarget)
          try {
            const moduleAttachments = modules.flatMap((module, moduleIndex) =>
              module.resources.flatMap((resource) =>
                resource.file
                  ? [
                      {
                        file: resource.file,
                        fileName: resource.label.trim() || null,
                        moduleIndex,
                      },
                    ]
                  : [],
              ),
            )
            if (files.length + moduleAttachments.length > 10)
              throw new Error('A course can have at most 10 attachments')
            const attachments = []
            for (const file of files) {
              attachments.push({ attachmentPath: await upload(file), fileName: file.name })
            }
            for (const attachment of moduleAttachments) {
              attachments.push({
                attachmentPath: await upload(attachment.file),
                fileName: attachment.fileName,
                moduleIndex: attachment.moduleIndex,
              })
            }
            const result = await apiFetch<CourseAggregate>('/api/courses', {
              method: 'POST',
              body: JSON.stringify({
                name: data.get('name'),
                durationMinutes: Number(data.get('durationMinutes')),
                type,
                liveCallDurationMinutes: type === 'live' ? liveCallDurationMinutes : null,
                certificateOnCompletion,
                accessType,
                priceNaira: accessType === 'paid' ? Number(data.get('priceNaira')) : 0,
                scheduledAt:
                  scheduleDate && scheduleTime
                    ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
                    : null,
                modules: modules.map(({ title, content }) => ({ title, content })),
                attachments,
              }),
            })
            router.push(
              createAssessment
                ? `/assessments/new?course=${encodeURIComponent(result.course.id)}`
                : `/courses?created=${result.course.id}`,
            )
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Course could not be created')
          } finally {
            setBusy(false)
          }
        }}
      >
        <section className="ad-section ad-section--first">
          <div className="ad-section-heading">
            <div>
              <h2>Course details</h2>
              <p>Define the learning format and when it becomes available.</p>
            </div>
          </div>
          <div className="ad-course-details-grid">
            <Field label="Course name" required>
              <Input name="name" maxLength={160} required />
            </Field>
            <div className="ad-duration-field">
              <Field label="Duration in minutes" required>
                <Input
                  className="ad-duration-input"
                  name="durationMinutes"
                  type="number"
                  min={1}
                  max={100000}
                  required
                />
              </Field>
            </div>
            <Field label="Course format" required>
              <CustomDropdown<'premade' | 'live'>
                value={type}
                onChange={setType}
                options={[
                  {
                    value: 'premade',
                    label: 'Premade',
                    description: 'Available on demand',
                    icon: <Layers3 aria-hidden="true" />,
                  },
                  {
                    value: 'live',
                    label: 'Live',
                    description: 'Teach at a scheduled time',
                    icon: <Radio aria-hidden="true" />,
                  },
                ]}
              />
            </Field>
            {type === 'live' ? (
              <Field
                label="Live class length"
                required
                hint="The call ends automatically at this limit."
              >
                <select
                  className="sb-input"
                  value={liveCallDurationMinutes}
                  onChange={(event) => setLiveCallDurationMinutes(Number(event.target.value))}
                >
                  {Array.from({ length: 30 }, (_, index) => (index + 1) * 10).map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes < 60
                        ? `${minutes} minutes`
                        : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Learner access" required>
              <CustomDropdown<'free' | 'paid'>
                value={accessType}
                onChange={setAccessType}
                options={[
                  {
                    value: 'free',
                    label: 'Free',
                    description: 'No payment required',
                    icon: <Unlock aria-hidden="true" />,
                  },
                  {
                    value: 'paid',
                    label: 'Paid',
                    description: 'Collect payment before access',
                    icon: <CreditCard aria-hidden="true" />,
                  },
                ]}
              />
            </Field>
            <label className="ad-certificate-option">
              <input
                type="checkbox"
                checked={certificateOnCompletion}
                onChange={(event) => setCertificateOnCompletion(event.target.checked)}
              />
              <span>
                <strong>Award a certificate on completion</strong>
                <small>
                  Issue a certificate after the course is completed without requiring an assessment.
                </small>
              </span>
            </label>
            {accessType === 'paid' ? (
              <>
                <Field label="Price (NGN)" required>
                  <Input
                    name="priceNaira"
                    type="number"
                    min={0.01}
                    max={10_000_000}
                    step="0.01"
                    required
                  />
                </Field>
              </>
            ) : null}
            <div className="ad-course-schedule">
              <Field
                label={
                  type === 'live'
                    ? 'First class date and time (optional)'
                    : 'Release date and time (optional)'
                }
                hint="Times are shown in your local time zone."
              >
                <div className="ad-schedule-field">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>
        </section>
        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Modules</h2>
              <p>Optional plain-text learning sections, displayed in this order.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() =>
                setModules((items) => [...items, { title: '', content: '', resources: [] }])
              }
            >
              <Plus aria-hidden="true" /> Add module
            </Button>
          </div>
          <div className="sb-list">
            {modules.map((module, index) => (
              <div className="ad-form-panel sb-module" key={index}>
                <div className="ad-section-heading" style={{ minHeight: 0, marginBottom: 16 }}>
                  <p className="sb-module-index">Module {index + 1}</p>
                  {modules.length > 1 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove module ${index + 1}`}
                      onClick={() =>
                        setModules((items) => items.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
                <div className="sb-list">
                  <Field label="Title" required>
                    <Input
                      value={module.title}
                      maxLength={200}
                      onChange={(event) =>
                        setModules((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: event.target.value } : item,
                          ),
                        )
                      }
                      required
                    />
                  </Field>
                  <Field label="Content" required>
                    <Textarea
                      value={module.content}
                      maxLength={100000}
                      onChange={(event) =>
                        setModules((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, content: event.target.value } : item,
                          ),
                        )
                      }
                      required
                    />
                  </Field>
                  <div className="ad-module-resources">
                    <div className="ad-module-resources-head">
                      <div>
                        <strong>Module attachments</strong>
                        <small>Choose any supported file · 10 attachments per course</small>
                      </div>
                      {module.resources.length < 10 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="soft"
                          onClick={() => addResource(index)}
                        >
                          <Plus aria-hidden="true" /> Add attachment
                        </Button>
                      ) : null}
                    </div>
                    {!module.resources.length ? (
                      <button
                        type="button"
                        className="ad-module-resources-empty"
                        onClick={() => addResource(index)}
                      >
                        <span className="ad-module-resources-empty-icon" aria-hidden="true">
                          <Plus />
                        </span>
                        <span>
                          <strong>Add supporting material</strong>
                          <small>
                            Choose a file directly, just as you would for course attachments.
                          </small>
                        </span>
                        <span className="ad-module-resources-empty-action">Add attachment</span>
                      </button>
                    ) : null}
                    {module.resources.map((resource, resourceIndex) => (
                      <div className="ad-module-resource-card" key={resource.id}>
                        <div className="ad-module-resource-head">
                          <div>
                            <strong>Attachment {resourceIndex + 1}</strong>
                            <small>
                              {resource.file ? resource.file.name : 'Choose a file to attach'}
                            </small>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove resource ${resourceIndex + 1}`}
                            onClick={() =>
                              setModules((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        resources: item.resources.filter(
                                          (_, entryIndex) => entryIndex !== resourceIndex,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="ad-resource-fields">
                          <div className="sb-field">
                            <span className="sb-label">File</span>
                            <label
                              className="ad-custom-file-picker"
                              htmlFor={`module-file-${resource.id}`}
                            >
                              <input
                                id={`module-file-${resource.id}`}
                                className="ad-custom-file-picker-input"
                                type="file"
                                accept={COURSE_FILE_ACCEPT}
                                onChange={(event) =>
                                  setModules((items) =>
                                    items.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            resources: item.resources.map((entry, entryIndex) =>
                                              entryIndex === resourceIndex
                                                ? {
                                                    ...entry,
                                                    file: event.target.files?.[0] ?? null,
                                                  }
                                                : entry,
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <UploadCloud aria-hidden="true" />
                              <span>
                                {resource.file ? 'Choose a different file' : 'Choose file'}
                              </span>
                              {resource.file ? <small>{resource.file.name}</small> : null}
                            </label>
                          </div>
                          <Field label="Display name (optional)">
                            <Input
                              placeholder="Name shown to learners"
                              value={resource.label}
                              onChange={(event) =>
                                setModules((items) =>
                                  items.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          resources: item.resources.map((entry, entryIndex) =>
                                            entryIndex === resourceIndex
                                              ? { ...entry, label: event.target.value }
                                              : entry,
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!modules.length ? (
              <p className="ad-empty-line">No modules yet. You can publish this course without them.</p>
            ) : null}
          </div>
        </section>
        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Attachments</h2>
              <p>
                Upload documents, images, audio, video, archives, and office files up to 100 MiB.
                Files upload directly to R2 using short-lived signed URLs. Add up to 10 attachments
                per course.
              </p>
            </div>
          </div>
          <label className="ad-upload-zone">
            <FileUp aria-hidden="true" />
            <strong>Choose files or drop them here</strong>
            <small>
              Documents, images, audio, video, archives, and office files · up to 100 MiB each · 10
              files maximum
            </small>
            <input
              type="file"
              multiple
              accept={COURSE_FILE_ACCEPT}
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files ?? [])
                setFiles((items) => {
                  if (items.length + selectedFiles.length > 10) {
                    setError('A course can have at most 10 attachments')
                    return items
                  }
                  setError('')
                  return [...items, ...selectedFiles]
                })
                event.currentTarget.value = ''
              }}
            />
          </label>
          {files.length ? (
            <div className="ad-attachment-list">
              {files.map((file, fileIndex) => (
                <div className="ad-attachment-item" key={`${file.name}-${file.size}`}>
                  <button
                    className="sb-attachment ad-file-preview-trigger"
                    type="button"
                    onClick={() => {
                      setPreview(file)
                      setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
                      previewRef.current?.showModal()
                    }}
                  >
                    <span className="ad-attachment-copy">
                      <span className="ad-attachment-icon">
                        <Paperclip aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{file.name}</strong>
                        <small>{file.type || 'Unknown file type'}</small>
                      </span>
                    </span>
                    <span className="sb-cell-secondary">
                      {(file.size / 1024 / 1024).toFixed(2)} MiB
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${file.name}`}
                    onClick={() =>
                      setFiles((items) => items.filter((_, index) => index !== fileIndex))
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        <section className="ad-section">
          <FormMessage>{error}</FormMessage>
          <div className="sb-form-footer" style={{ justifyContent: 'flex-end' }}>
            <Button busy={busy} type="submit">
              <UploadCloud aria-hidden="true" /> Proceed without assessment
            </Button>
            <Button type="submit" variant="secondary" busy={busy} data-next="assessment">
              Create assessment
            </Button>
          </div>
        </section>
      </form>
      <dialog ref={previewRef} className="ad-dialog" aria-labelledby="course-file-preview">
        <div className="ad-dialog-head">
          <h2 id="course-file-preview">Attachment preview</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close attachment preview"
            onClick={() => previewRef.current?.close()}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="ad-dialog-body">
          {preview ? (
            <>
              <strong>{preview.name}</strong>
              <p className="ad-dialog-count">
                {preview.type || 'Unknown type'} · {(preview.size / 1024 / 1024).toFixed(2)} MiB
              </p>
              {previewUrl ? (
                <NextImage
                  className="ad-file-preview"
                  src={previewUrl}
                  alt={`Preview of ${preview.name}`}
                  width={960}
                  height={540}
                  unoptimized
                />
              ) : (
                <div className="ad-file-preview ad-file-preview--fallback">
                  This{' '}
                  {preview.type.startsWith('video/')
                    ? 'video'
                    : preview.type.startsWith('audio/')
                      ? 'audio'
                      : 'document'}{' '}
                  is ready to attach. The learner view will render the supported file inline.
                </div>
              )}
            </>
          ) : null}
        </div>
        <div className="ad-dialog-footer">
          <Button type="button" variant="ghost" onClick={() => previewRef.current?.close()}>
            Close
          </Button>
        </div>
      </dialog>
    </div>
  )
}

export function AddCourseContentForm({
  courses,
}: {
  courses: Array<{ id: string; name: string }>
}) {
  const [moduleBusy, setModuleBusy] = useState(false)
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [moduleCourseId, setModuleCourseId] = useState('')
  const [attachmentCourseId, setAttachmentCourseId] = useState('')
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="ad-content-layout">
      <section className="ad-content-card">
        <h2>New module</h2>
        <p>Build the next focused lesson for an existing course.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setModuleBusy(true)
            setMessage('')
            setError('')
            const form = event.currentTarget
            const data = new FormData(form)
            try {
              await apiFetch(
                `/api/courses/${encodeURIComponent(String(data.get('courseId')))}/modules`,
                {
                  method: 'POST',
                  body: JSON.stringify({ title: data.get('title'), content: data.get('content') }),
                },
              )
              setMessage('Module added to the course.')
              form.reset()
              setModuleCourseId('')
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Module could not be added')
            } finally {
              setModuleBusy(false)
            }
          }}
        >
          <div className="sb-list">
            <Field label="Course" required>
              <CustomDropdown
                name="courseId"
                value={moduleCourseId}
                onChange={setModuleCourseId}
                placeholder="Choose a course"
                options={courses.map((course) => ({ value: course.id, label: course.name }))}
              />
            </Field>
            <Field label="Module title" required>
              <Input name="title" maxLength={200} required />
            </Field>
            <Field label="Module content" required>
              <Textarea name="content" maxLength={100000} required />
            </Field>
            <div className="ad-form-actions">
              <Button busy={moduleBusy}>Add module</Button>
            </div>
          </div>
        </form>
      </section>
      <section className="ad-content-card">
        <h2>Attach resources</h2>
        <p>Upload up to 10 resources, then link them securely to the selected course.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            setAttachmentBusy(true)
            setMessage('')
            setError('')
            const form = event.currentTarget
            const data = new FormData(form)
            try {
              if (!attachmentFiles.length) throw new Error('Choose at least one file')
              if (attachmentFiles.length > 10)
                throw new Error('A course can have at most 10 attachments')
              const courseId = encodeURIComponent(String(data.get('courseId')))
              for (const file of attachmentFiles) {
                const attachmentPath = await upload(file)
                await apiFetch(`/api/courses/${courseId}/attachments`, {
                  method: 'POST',
                  body: JSON.stringify({ attachmentPath, fileName: file.name }),
                })
              }
              setMessage(
                `${attachmentFiles.length} attachment${attachmentFiles.length === 1 ? '' : 's'} uploaded and linked.`,
              )
              form.reset()
              setAttachmentCourseId('')
              setAttachmentFiles([])
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Attachment could not be added')
            } finally {
              setAttachmentBusy(false)
            }
          }}
        >
          <div className="sb-list">
            <Field label="Course" required>
              <CustomDropdown
                name="courseId"
                value={attachmentCourseId}
                onChange={setAttachmentCourseId}
                placeholder="Choose a course"
                options={courses.map((course) => ({ value: course.id, label: course.name }))}
              />
            </Field>
            <label className="ad-upload-zone">
              <Paperclip aria-hidden="true" />
              <strong>Choose files to attach</strong>
              <small>Up to 10 files; each will be securely linked to this course.</small>
              <input
                name="file"
                type="file"
                multiple
                accept={COURSE_FILE_ACCEPT}
                required
                onChange={(event) => {
                  const selectedFiles = Array.from(event.target.files ?? [])
                  if (selectedFiles.length > 10) {
                    setAttachmentFiles([])
                    setError('A course can have at most 10 attachments')
                    return
                  }
                  setError('')
                  setAttachmentFiles(selectedFiles)
                }}
              />
            </label>
            {attachmentFiles.length ? (
              <p className="sb-field-hint">{attachmentFiles.length} of 10 attachments selected</p>
            ) : null}
            <div className="ad-form-actions">
              <Button busy={attachmentBusy}>
                <UploadCloud aria-hidden="true" /> Upload attachment
              </Button>
            </div>
          </div>
        </form>
      </section>
      <div>
        <FormMessage tone="success">{message}</FormMessage>
        <FormMessage>{error}</FormMessage>
      </div>
    </div>
  )
}
