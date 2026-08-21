'use client'

import { apiFetch, type CourseAggregate, type SignedUpload } from '@danvic/api-client'

export const MAX_COURSE_ATTACHMENT_BYTES = 100 * 1024 * 1024

export type PendingCourseResource = {
  label: string
  file: File
}

export type PendingCourseModule = {
  title: string
  content: string
  resources: PendingCourseResource[]
}

export type PendingCourseDraft = {
  name: string
  durationMinutes: number
  type: 'premade' | 'live'
  liveCallDurationMinutes: number | null
  certificateOnCompletion: boolean
  accessType: 'free' | 'paid'
  priceNaira: number
  scheduledAt: string | null
  modules: PendingCourseModule[]
  files: File[]
  createdCourseId?: string
}

const DATABASE_NAME = 'danvic-author-workflow-drafts'
const DATABASE_VERSION = 1
const STORE_NAME = 'drafts'
const COURSE_ASSESSMENT_KEY = 'pending-course-assessment'

const openDraftDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Draft storage is not available in this browser'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open draft storage'))
  })

const completeTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the draft'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Draft storage was interrupted'))
  })

export async function savePendingCourseDraft(draft: PendingCourseDraft): Promise<void> {
  const database = await openDraftDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(draft, COURSE_ASSESSMENT_KEY)
    await completeTransaction(transaction)
  } finally {
    database.close()
  }
}

export async function loadPendingCourseDraft(): Promise<PendingCourseDraft | null> {
  const database = await openDraftDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(COURSE_ASSESSMENT_KEY)
    const result = await new Promise<PendingCourseDraft | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as PendingCourseDraft | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Could not load the course draft'))
    })
    await completeTransaction(transaction)
    return result
  } finally {
    database.close()
  }
}

export async function clearPendingCourseDraft(): Promise<void> {
  const database = await openDraftDatabase()
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(COURSE_ASSESSMENT_KEY)
    await completeTransaction(transaction)
  } finally {
    database.close()
  }
}

export const attachmentIsTooLarge = (file: File) => file.size > MAX_COURSE_ATTACHMENT_BYTES

export function validatePendingCourseDraft(draft: PendingCourseDraft): void {
  const moduleFiles = draft.modules.flatMap((module) => module.resources.map((resource) => resource.file))
  const allFiles = [...draft.files, ...moduleFiles]
  if (allFiles.length > 10) throw new Error('A course can have at most 10 attachments')
  const oversized = allFiles.find(attachmentIsTooLarge)
  if (oversized) throw new Error(`${oversized.name} is over 100 MiB and cannot be uploaded`)
}

async function uploadCourseFile(file: File): Promise<string> {
  if (attachmentIsTooLarge(file)) throw new Error(`${file.name} is over 100 MiB and cannot be uploaded`)
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

export async function createCourseFromDraft(draft: PendingCourseDraft): Promise<CourseAggregate> {
  validatePendingCourseDraft(draft)
  const attachments: Array<{ attachmentPath: string; fileName: string | null; moduleIndex?: number }> = []
  for (const file of draft.files) {
    attachments.push({ attachmentPath: await uploadCourseFile(file), fileName: file.name })
  }
  for (const [moduleIndex, module] of draft.modules.entries()) {
    for (const resource of module.resources) {
      attachments.push({
        attachmentPath: await uploadCourseFile(resource.file),
        fileName: resource.label.trim() || null,
        moduleIndex,
      })
    }
  }
  return apiFetch<CourseAggregate>('/api/courses', {
    method: 'POST',
    body: JSON.stringify({
      name: draft.name,
      durationMinutes: draft.durationMinutes,
      type: draft.type,
      liveCallDurationMinutes: draft.liveCallDurationMinutes,
      certificateOnCompletion: draft.certificateOnCompletion,
      accessType: draft.accessType,
      priceNaira: draft.priceNaira,
      scheduledAt: draft.scheduledAt,
      modules: draft.modules.map(({ title, content }) => ({ title, content })),
      attachments,
    }),
  })
}
