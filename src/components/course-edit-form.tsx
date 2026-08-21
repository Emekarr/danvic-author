'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Attachment, CourseAggregate, SignedUpload } from '@danvic/api-client'
import { apiFetch } from '@danvic/api-client'
import { Button, CustomDropdown, Field, FormMessage, Input } from '@danvic/ui'
import {
  ArrowLeft,
  CircleAlert,
  CreditCard,
  Layers3,
  Paperclip,
  Plus,
  Radio,
  Trash2,
  Unlock,
  UploadCloud,
} from 'lucide-react'
import { attachmentIsTooLarge } from '@/lib/pending-course-draft'
import { moduleContentIsEmpty } from '@/lib/module-content'
import { ModuleEditor } from '@/components/module-editor'

const COURSE_FILE_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.svg,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a,.ogg,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip'

const LIVE_CLASS_DURATIONS = Array.from({ length: 30 }, (_, index) => (index + 1) * 10)
const labelDuration = (minutes: number) =>
  minutes < 60
    ? `${minutes} minutes`
    : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`

type ModuleRow = { key: string; id: string | null; title: string; content: string }
type NewFileRow = { key: string; file: File; moduleKey: string | null }

async function upload(file: File): Promise<string> {
  if (!file.type) throw new Error(`${file.name} does not have a supported content type`)
  const signed = await apiFetch<SignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded to course storage`)
  return signed.attachmentPath
}

export function CourseEditForm({ aggregate }: { aggregate: CourseAggregate }) {
  const router = useRouter()
  const course = aggregate.course
  const [name, setName] = useState(course.name)
  const [durationMinutes, setDurationMinutes] = useState(course.durationMinutes)
  const [type, setType] = useState<CourseAggregate['course']['type']>(course.type)
  const [liveCallDurationMinutes, setLiveCallDurationMinutes] = useState(
    course.liveCallDurationMinutes ?? 60,
  )
  const [accessType, setAccessType] = useState<CourseAggregate['course']['accessType']>(
    course.accessType,
  )
  const [priceNaira, setPriceNaira] = useState((course.priceKobo / 100).toString())
  const [certificateOnCompletion, setCertificateOnCompletion] = useState(
    course.certificateOnCompletion,
  )
  const pad = (value: number) => String(value).padStart(2, '0')
  const initialSchedule = course.scheduledAt ? new Date(course.scheduledAt) : null
  const [scheduleDate, setScheduleDate] = useState(
    initialSchedule
      ? `${initialSchedule.getFullYear()}-${pad(initialSchedule.getMonth() + 1)}-${pad(initialSchedule.getDate())}`
      : '',
  )
  const [scheduleTime, setScheduleTime] = useState(
    initialSchedule ? `${pad(initialSchedule.getHours())}:${pad(initialSchedule.getMinutes())}` : '',
  )
  const [modules, setModules] = useState<ModuleRow[]>(() =>
    aggregate.modules.map((module) => ({
      key: module.id,
      id: module.id,
      title: module.title,
      content: module.content,
    })),
  )
  const [attachments, setAttachments] = useState<Attachment[]>(aggregate.attachments)
  const [newFiles, setNewFiles] = useState<NewFileRow[]>([])
  const [invalidModuleIndexes, setInvalidModuleIndexes] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const totalAttachments = attachments.length + newFiles.length
  const addNewFiles = (files: File[], moduleKey: string | null) =>
    setNewFiles((items) => {
      if (totalAttachments + files.length > 10) {
        setError('A course can have at most 10 attachments')
        return items
      }
      setError('')
      return [...items, ...files.map((file) => ({ key: crypto.randomUUID(), file, moduleKey }))]
    })
  const removeModule = (index: number) => {
    const entry = modules[index]
    if (!entry) return
    setAttachments((items) => items.filter((item) => item.moduleId !== entry.id))
    setNewFiles((items) => items.filter((item) => item.moduleKey !== entry.key))
    setModules((items) => items.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="ad-form-page">
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (type === 'premade' && modules.length === 0) {
            setError('A premade course needs at least one module')
            return
          }
          const emptyModuleIndexes = modules.flatMap((module, index) =>
            moduleContentIsEmpty(module.content) ? [index] : [],
          )
          if (emptyModuleIndexes.length) {
            setInvalidModuleIndexes(emptyModuleIndexes)
            setError(`Write some content for module ${emptyModuleIndexes[0]! + 1} before saving.`)
            return
          }
          setInvalidModuleIndexes([])
          if (attachments.length + newFiles.length > 10) {
            setError('A course can have at most 10 attachments')
            return
          }
          setBusy(true)
          setError('')
          try {
            const uploadedAttachments = []
            for (const row of newFiles) {
              uploadedAttachments.push({
                attachmentPath: await upload(row.file),
                fileName: row.file.name,
                moduleIndex: row.moduleKey
                  ? modules.findIndex((item) => item.key === row.moduleKey)
                  : null,
              })
            }
            await apiFetch(`/api/courses/${encodeURIComponent(course.id)}`, {
              method: 'PUT',
              body: JSON.stringify({
                name,
                durationMinutes,
                type,
                liveCallDurationMinutes: type === 'live' ? liveCallDurationMinutes : null,
                certificateOnCompletion,
                accessType,
                priceNaira: accessType === 'paid' ? Number(priceNaira || 0) : 0,
                scheduledAt:
                  scheduleDate && scheduleTime
                    ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
                    : null,
                modules: modules.map((module) => ({
                  ...(module.id ? { id: module.id } : {}),
                  title: module.title,
                  content: module.content,
                })),
                attachments: [
                  ...attachments.map((attachment) => ({
                    id: attachment.id,
                    moduleId: attachment.moduleId,
                  })),
                  ...uploadedAttachments,
                ],
              }),
            })
            router.push('/courses')
            router.refresh()
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'The course could not be updated')
          } finally {
            setBusy(false)
          }
        }}
      >
        <section className="ad-section ad-section--first">
          <div className="ad-section-heading">
            <div>
              <h2>Course details</h2>
              <p>Update the learning format and when the course becomes available.</p>
            </div>
          </div>
          <div className="ad-course-details-grid">
            <Field label="Course name" required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                required
              />
            </Field>
            <Field label="Duration in minutes" required>
              <Input
                type="number"
                min={1}
                max={100000}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                required
              />
            </Field>
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
              <Field label="Live class length" required>
                <CustomDropdown<string>
                  value={String(liveCallDurationMinutes)}
                  onChange={(minutes) => setLiveCallDurationMinutes(Number(minutes))}
                  options={LIVE_CLASS_DURATIONS.map((minutes) => ({
                    value: String(minutes),
                    label: labelDuration(minutes),
                  }))}
                />
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
            {accessType === 'paid' ? (
              <Field label="Price (NGN)" required>
                <Input
                  type="number"
                  min={0.01}
                  max={10_000_000}
                  step="0.01"
                  value={priceNaira}
                  onChange={(event) => setPriceNaira(event.target.value)}
                  required
                />
              </Field>
            ) : null}
            <label className="ad-certificate-option">
              <input
                type="checkbox"
                checked={certificateOnCompletion}
                onChange={(event) => setCertificateOnCompletion(event.target.checked)}
              />
              <span>
                <strong>Award a certificate on completion</strong>
                <small>Issue a certificate after the course is completed.</small>
              </span>
            </label>
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
        </section>

        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Modules</h2>
              <p>Edit titles and content, remove modules, or add new ones.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="soft"
              onClick={() =>
                setModules((items) => [
                  ...items,
                  { key: crypto.randomUUID(), id: null, title: '', content: '' },
                ])
              }
            >
              <Plus aria-hidden="true" /> Add module
            </Button>
          </div>
          <div className="sb-list">
            {modules.map((entry, index) => {
              const moduleExisting = attachments.filter(
                (attachment) => attachment.moduleId === entry.id,
              )
              const moduleNew = newFiles.filter((row) => row.moduleKey === entry.key)
              return (
                <div className="ad-form-panel sb-module" key={entry.key}>
                  <div className="ad-section-heading" style={{ minHeight: 0, marginBottom: 16 }}>
                    <p className="sb-module-index">Module {index + 1}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove module ${index + 1}`}
                      onClick={() => removeModule(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="sb-list">
                    <Field label="Title" required>
                      <Input
                        value={entry.title}
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
                    <ModuleEditor
                      documentId={entry.key}
                      value={entry.content}
                      invalid={invalidModuleIndexes.includes(index)}
                      onChange={(content) => {
                        setInvalidModuleIndexes((items) => items.filter((item) => item !== index))
                        setModules((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, content } : item,
                          ),
                        )
                      }}
                    />
                    {[...moduleExisting, ...moduleNew].length ? (
                      <div className="ad-attachment-list">
                        {moduleExisting.map((attachment) => (
                          <div className="ad-attachment-item" key={attachment.id}>
                            <span className="ad-attachment-copy">
                              <span className="ad-attachment-icon">
                                <Paperclip aria-hidden="true" />
                              </span>
                              <span>
                                <strong>{attachment.fileName ?? 'Attachment'}</strong>
                                <small>Current attachment</small>
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove ${attachment.fileName ?? 'attachment'}`}
                              onClick={() =>
                                setAttachments((items) => items.filter((item) => item.id !== attachment.id))
                              }
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                        {moduleNew.map((row) => (
                          <div className="ad-attachment-item" key={row.key}>
                            <span className="ad-attachment-copy">
                              <span className="ad-attachment-icon">
                                <UploadCloud aria-hidden="true" />
                              </span>
                              <span>
                                <strong>{row.file.name}</strong>
                                <small>New — uploads when you save</small>
                              </span>
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`Remove ${row.file.name}`}
                              onClick={() =>
                                setNewFiles((items) => items.filter((item) => item.key !== row.key))
                              }
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <label className="ad-upload-zone">
                      <Paperclip aria-hidden="true" />
                      <strong>Add module attachment</strong>
                      <small>{totalAttachments}/10 attachments used</small>
                      <input
                        type="file"
                        accept={COURSE_FILE_ACCEPT}
                        disabled={totalAttachments >= 10}
                        onChange={(event) => {
                          const selected = Array.from(event.target.files ?? [])
                          event.currentTarget.value = ''
                          if (selected.length) addNewFiles(selected, entry.key)
                        }}
                      />
                    </label>
                  </div>
                </div>
              )
            })}
            {!modules.length ? (
              <p className="ad-empty-line">No modules. Add at least one for a premade course.</p>
            ) : null}
          </div>
        </section>

        <section className="ad-section">
          <div className="ad-section-heading">
            <div>
              <h2>Attachments</h2>
              <p>Course-level files. Remove existing ones or upload replacements.</p>
            </div>
          </div>
          {attachments.filter((attachment) => attachment.moduleId === null).length ||
          newFiles.filter((row) => row.moduleKey === null).length ? (
            <div className="ad-attachment-list">
              {attachments
                .filter((attachment) => attachment.moduleId === null)
                .map((attachment) => (
                  <div className="ad-attachment-item" key={attachment.id}>
                    <span className="ad-attachment-copy">
                      <span className="ad-attachment-icon">
                        <Paperclip aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{attachment.fileName ?? 'Attachment'}</strong>
                        <small>Current attachment</small>
                      </span>
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${attachment.fileName ?? 'attachment'}`}
                      onClick={() => setAttachments((items) => items.filter((item) => item.id !== attachment.id))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              {newFiles
                .filter((row) => row.moduleKey === null)
                .map((row) => (
                  <div
                    className={`ad-attachment-item${attachmentIsTooLarge(row.file) ? ' is-invalid' : ''}`}
                    key={row.key}
                  >
                    <span className="ad-attachment-copy">
                      <span className="ad-attachment-icon">
                        <UploadCloud aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{row.file.name}</strong>
                        <small>New — uploads when you save</small>
                      </span>
                    </span>
                    {attachmentIsTooLarge(row.file) ? (
                      <span className="ad-file-size-warning">
                        <CircleAlert aria-hidden="true" /> Over 100 MiB
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${row.file.name}`}
                      onClick={() =>
                        setNewFiles((items) => items.filter((item) => item.key !== row.key))
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : null}
          <label className="ad-upload-zone">
            <UploadCloud aria-hidden="true" />
            <strong>Choose files to attach to the course</strong>
            <small>Up to 100 MiB each · {totalAttachments}/10 used</small>
            <input
              type="file"
              multiple
              accept={COURSE_FILE_ACCEPT}
              disabled={totalAttachments >= 10}
              onChange={(event) => {
                const selected = Array.from(event.target.files ?? [])
                event.currentTarget.value = ''
                if (selected.length) addNewFiles(selected, null)
              }}
            />
          </label>
        </section>

        <section className="ad-section">
          <FormMessage>{error}</FormMessage>
          <div className="sb-form-footer">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button busy={busy}>Save changes</Button>
          </div>
        </section>
      </form>
      <p className="sb-field-hint">
        <ArrowLeft aria-hidden="true" /> Saving updates the live course immediately.
      </p>
    </div>
  )
}
