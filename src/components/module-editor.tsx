'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { TextStyleKit } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import SubscriptExtension from '@tiptap/extension-subscript'
import SuperscriptExtension from '@tiptap/extension-superscript'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { apiFetch } from '@danvic/api-client'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  FileUp,
  Globe,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PaintBucket,
  Quote,
  Redo2,
  RemoveFormatting,
  Rows3,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Trash2,
  TriangleAlert,
  Underline,
  Undo2,
  Unlink,
  ImageUp,
} from 'lucide-react'
import {
  moduleContentIsEmpty,
  moduleContentText,
  parseModuleContent,
  serializeModuleContent,
  type ModuleContentDocument,
} from '@/lib/module-content'

type ModuleEditorProps = {
  value: string
  onChange: (value: string) => void
  label?: string
  invalid?: boolean
  documentId?: string
  standalone?: boolean
}

type ToolbarButtonProps = {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

const alignmentTools = [
  ['left', 'Align left', AlignLeft],
  ['center', 'Align center', AlignCenter],
  ['right', 'Align right', AlignRight],
  ['justify', 'Justify', AlignJustify],
] as const

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  const handledOnPointerDown = useRef(false)
  return (
    <button
      type="button"
      className="ad-module-editor-tool"
      data-active={active || undefined}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault()
        handledOnPointerDown.current = true
        onClick()
      }}
      onClick={() => {
        if (handledOnPointerDown.current) {
          handledOnPointerDown.current = false
          return
        }
        onClick()
      }}
    >
      {children}
    </button>
  )
}

const FONT_FAMILIES = [
  ['', 'Default font'],
  ['Arial, Helvetica, sans-serif', 'Arial'],
  ['Georgia, serif', 'Georgia'],
  ['"Times New Roman", Times, serif', 'Times New Roman'],
  ['Verdana, Geneva, sans-serif', 'Verdana'],
  ['"Courier New", Courier, monospace', 'Courier New'],
] as const

const FONT_SIZES = [
  ['', 'Default size'],
  ['12px', '12'],
  ['14px', '14'],
  ['16px', '16'],
  ['18px', '18'],
  ['20px', '20'],
  ['24px', '24'],
  ['30px', '30'],
  ['36px', '36'],
] as const

const LINE_HEIGHTS = [
  ['', 'Line spacing'],
  ['1', '1.0'],
  ['1.15', '1.15'],
  ['1.5', '1.5'],
  ['2', '2.0'],
] as const

const colorInputValue = (value: string | undefined, fallback: string) =>
  value && /^#[\da-f]{6}$/iu.test(value) ? value : fallback

type ImageSignedUpload = { uploadUrl: string; attachmentPath: string; viewUrl: string }

const IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/gif',
  'image/webp',
])
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024

async function uploadImage(
  file: File,
): Promise<Pick<ImageSignedUpload, 'attachmentPath' | 'viewUrl'>> {
  const signed = await apiFetch<ImageSignedUpload>('/api/uploads/sign', {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })
  const response = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) throw new Error(`${file.name} could not be uploaded to course storage`)
  return { attachmentPath: signed.attachmentPath, viewUrl: signed.viewUrl }
}

type DocxConversionResult = {
  html: string
  warningCount: number
}

function convertDocx(arrayBuffer: ArrayBuffer): Promise<DocxConversionResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/docx-import.worker.ts', import.meta.url), {
      type: 'module',
    })
    const timeout = window.setTimeout(() => {
      worker.terminate()
      reject(new Error('The Word document took too long to import.'))
    }, 45_000)
    worker.onmessage = (event: MessageEvent<DocxConversionResult & { error?: string }>) => {
      window.clearTimeout(timeout)
      worker.terminate()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data)
    }
    worker.onerror = () => {
      window.clearTimeout(timeout)
      worker.terminate()
      reject(new Error('The Word document could not be read.'))
    }
    worker.postMessage(arrayBuffer, [arrayBuffer])
  })
}

function sanitizeImportedHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document
    .querySelectorAll('script, style, iframe, object, embed, form, input, button, meta, link')
    .forEach((element) => element.remove())
  const permittedAttributes = new Set(['href', 'title', 'colspan', 'rowspan', 'start'])
  document.body.querySelectorAll('*').forEach((element) => {
    if (element instanceof HTMLImageElement) {
      const src = element.getAttribute('src') ?? ''
      if (/^data:image\//iu.test(src)) {
        for (const attribute of [...element.attributes])
          if (attribute.name.toLowerCase() !== 'src') element.removeAttribute(attribute.name)
        return
      }
      element.remove()
      return
    }
    for (const attribute of [...element.attributes]) {
      if (!permittedAttributes.has(attribute.name.toLowerCase()))
        element.removeAttribute(attribute.name)
    }
    const href = element.getAttribute('href')
    if (href && !/^(https?:|mailto:)/iu.test(href)) element.removeAttribute('href')
  })
  document.body.querySelectorAll('img').forEach((image) => {
    const parent = image.parentElement
    if (!parent || !(parent instanceof HTMLParagraphElement)) return
    if (!parent.textContent?.trim()) {
      const fragment = document.createDocumentFragment()
      while (parent.firstChild) fragment.appendChild(parent.firstChild)
      parent.replaceWith(fragment)
      return
    }
    parent.after(image)
  })
  return document.body.innerHTML
}

const dataUrlToFile = (dataUrl: string, index: number): File | null => {
  const match = /^data:(image\/[\d.+a-z-]+);base64,([\s\S]+)$/iu.exec(dataUrl)
  if (!match) return null
  try {
    const binary = window.atob(match[2] ?? '')
    const bytes = new Uint8Array(binary.length)
    for (let position = 0; position < binary.length; position += 1)
      bytes[position] = binary.charCodeAt(position)
    const type = match[1] ?? 'image/png'
    const extension = (type.split('/')[1] ?? 'png').replace(/[^a-z0-9]/giu, '') || 'png'
    return new File([bytes], `word-import-${index + 1}.${extension}`, { type })
  } catch {
    return null
  }
}

async function uploadImportedImages(
  html: string,
): Promise<{ html: string; uploaded: number; failed: number }> {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const images = [...document.body.querySelectorAll('img')]
  let uploaded = 0
  let failed = 0
  for (const [index, image] of images.entries()) {
    const file = dataUrlToFile(image.getAttribute('src') ?? '', index)
    if (!file || file.size > MAX_IMAGE_UPLOAD_BYTES || !IMAGE_CONTENT_TYPES.has(file.type)) {
      image.remove()
      failed += 1
      continue
    }
    try {
      const stored = await uploadImage(file)
      image.setAttribute('src', stored.viewUrl)
      image.setAttribute('data-attachment-path', stored.attachmentPath)
      uploaded += 1
    } catch {
      image.remove()
      failed += 1
    }
  }
  return { html: document.body.innerHTML, uploaded, failed }
}

export function ModuleEditor({
  value,
  onChange,
  label = 'Module content',
  invalid = false,
  documentId,
  standalone = false,
}: ModuleEditorProps) {
  const [focusMode, setFocusMode] = useState(false)
  const [importStatus, setImportStatus] = useState<{
    message: string
    tone: 'neutral' | 'success' | 'error'
  }>({ message: '', tone: 'neutral' })
  const [importing, setImporting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const importWarningRef = useRef<HTMLDialogElement>(null)
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      SubscriptExtension,
      SuperscriptExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing this module…' }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            attachmentPath: {
              default: null,
              parseHTML: (element) => element.getAttribute('data-attachment-path'),
              renderHTML: (attributes) =>
                attributes.attachmentPath
                  ? { 'data-attachment-path': attributes.attachmentPath as string }
                  : {},
            },
          }
        },
      }).configure({
        allowBase64: false,
        inline: false,
        resize: {
          enabled: true,
          minWidth: 60,
          minHeight: 60,
          alwaysPreserveAspectRatio: true,
        },
      }),
      TableKit.configure({ table: { resizable: true } }),
    ],
    [],
  )
  const editor = useEditor({
    extensions,
    content: parseModuleContent(value) as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ad-module-editor-page',
        'aria-label': label,
      },
    },
    onUpdate: ({ editor: activeEditor }) =>
      onChange(serializeModuleContent(activeEditor.getJSON() as ModuleContentDocument)),
  })

  useEffect(() => {
    if (!editor) return
    const current = serializeModuleContent(editor.getJSON() as ModuleContentDocument)
    const next = serializeModuleContent(parseModuleContent(value))
    if (current !== next)
      editor.commands.setContent(JSON.parse(next) as JSONContent, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    const refreshPrivateImageUrls = async () => {
      const updates: Array<{ pos: number; attachmentPath: string }> = []
      editor.state.doc.descendants((node, pos) => {
        const attachmentPath = node.attrs.attachmentPath
        if (node.type.name === 'image' && typeof attachmentPath === 'string')
          updates.push({ pos, attachmentPath })
      })
      for (const { pos, attachmentPath } of updates) {
        try {
          const signed = await apiFetch<{ viewUrl: string }>('/api/uploads/view', {
            method: 'POST',
            body: JSON.stringify({ attachmentPath }),
          })
          const node = editor.state.doc.nodeAt(pos)
          if (node?.type.name === 'image' && node.attrs.attachmentPath === attachmentPath)
            editor.view.dispatch(
              editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: signed.viewUrl }),
            )
        } catch {
          // The learner-facing renderer still resolves an authorized URL after the course saves.
        }
      }
    }
    void refreshPrivateImageUrls()
  }, [editor])

  useEffect(() => {
    if (!focusMode) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', close)
    }
  }, [focusMode])

  useEffect(() => {
    if (!documentId || standalone) return
    const channel = new BroadcastChannel(`danvic-module-document:${documentId}`)
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== 'object') return
      const message = event.data as { type?: unknown; content?: unknown }
      if (message.type === 'request') channel.postMessage({ type: 'content', content: value })
      if (
        message.type === 'update' &&
        typeof message.content === 'string' &&
        message.content !== value
      )
        onChange(message.content)
    }
    return () => channel.close()
  }, [documentId, onChange, standalone, value])

  if (!editor) return <div className="ad-module-editor-loading">Preparing the document editor…</div>

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const href = window
      .prompt('Paste a web address or email address', previous ?? 'https://')
      ?.trim()
    if (href === undefined) return
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }
  const insertImageFromUrl = () => {
    const raw = window.prompt('Paste the web address of an image')?.trim()
    if (!raw) return
    const src = /^[a-z][\d+.a-z-]*:/iu.test(raw) ? raw : `https://${raw}`
    if (!/^https?:\/\//iu.test(src)) {
      setImportStatus({ message: 'That does not look like a valid image address.', tone: 'error' })
      return
    }
    collapseImageNodeSelection().setImage({ src }).run()
  }
  // A freshly inserted image stays node-selected; inserting another image would
  // replace it, so move the caret after the selected image first.
  const collapseImageNodeSelection = () =>
    editor.chain().focus().command(({ tr, dispatch }) => {
      const { selection } = tr
      if (selection instanceof NodeSelection && selection.node.type.name === 'image')
        if (dispatch) tr.setSelection(TextSelection.near(tr.doc.resolve(selection.to)))
      return true
    })
  const insertImageFile = async (file: File | undefined) => {
    if (!file) return
    setImportStatus({ message: '', tone: 'neutral' })
    if (!IMAGE_CONTENT_TYPES.has(file.type)) {
      setImportStatus({
        message: 'Choose a JPG, PNG, SVG, GIF or WebP image.',
        tone: 'error',
      })
      return
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setImportStatus({ message: 'That image is over the 10 MiB upload limit.', tone: 'error' })
      return
    }
    setUploadingImage(true)
    setImportStatus({ message: `Uploading ${file.name}…`, tone: 'neutral' })
    try {
      const image = await uploadImage(file)
      collapseImageNodeSelection()
        .setImage({ src: image.viewUrl })
        .updateAttributes('image', { attachmentPath: image.attachmentPath })
        .run()
      setImportStatus({ message: `${file.name} added.`, tone: 'success' })
    } catch (cause) {
      setImportStatus({
        message: cause instanceof Error ? cause.message : 'The image could not be uploaded.',
        tone: 'error',
      })
    } finally {
      setUploadingImage(false)
    }
  }
  const importDocument = async (file: File | undefined) => {
    if (!file) return
    setImportStatus({ message: '', tone: 'neutral' })
    if (!/\.docx$/iu.test(file.name)) {
      setImportStatus({ message: 'Choose a Microsoft Word .docx file.', tone: 'error' })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setImportStatus({
        message: 'That Word document is over the 20 MiB import limit.',
        tone: 'error',
      })
      return
    }
    setImporting(true)
    setImportStatus({ message: `Importing ${file.name}…`, tone: 'neutral' })
    try {
      const result = await convertDocx(await file.arrayBuffer())
      const embeddedImageCount = new DOMParser()
        .parseFromString(result.html, 'text/html')
        .body.querySelectorAll('img').length
      const safeHtml = sanitizeImportedHtml(result.html)
      const text = new DOMParser().parseFromString(safeHtml, 'text/html').body.textContent?.trim()
      if (!text && !embeddedImageCount)
        throw new Error('This Word document does not contain importable text or images.')
      if (embeddedImageCount)
        setImportStatus({
          message: `Uploading ${embeddedImageCount} embedded image${embeddedImageCount === 1 ? '' : 's'}…`,
          tone: 'neutral',
        })
      const { html: finalHtml, uploaded, failed } = await uploadImportedImages(safeHtml)
      editor.commands.setContent(finalHtml, { emitUpdate: true })
      editor.commands.focus('start')
      const notes = [
        uploaded
          ? `${uploaded} embedded image${uploaded === 1 ? ' was' : 's were'} added to the module.`
          : '',
        failed
          ? `${failed} image${failed === 1 ? ' was' : 's were'} skipped; add ${failed === 1 ? 'it' : 'them'} separately.`
          : '',
        result.warningCount ? 'Review the imported formatting before saving.' : '',
      ].filter(Boolean)
      setImportStatus({
        message: `${file.name} imported${notes.length ? `. ${notes.join(' ')}` : '.'}`,
        tone: failed && !uploaded ? 'error' : 'success',
      })
    } catch (cause) {
      setImportStatus({
        message:
          cause instanceof Error ? cause.message : 'The Word document could not be imported.',
        tone: 'error',
      })
    } finally {
      setImporting(false)
    }
  }
  const requestWordImport = () => {
    if (moduleContentIsEmpty(value)) importInputRef.current?.click()
    else importWarningRef.current?.showModal()
  }
  const continueWordImport = () => {
    importWarningRef.current?.close()
    importInputRef.current?.click()
  }
  const words = moduleContentText(editor.getJSON() as ModuleContentDocument)
    .split(/\s+/u)
    .filter(Boolean).length
  const openDocumentTab = () => {
    if (!documentId) return
    localStorage.setItem(`danvic-module-document:${documentId}`, value)
    window.open(`/modules/write?draft=${encodeURIComponent(documentId)}`, '_blank', 'noopener')
  }
  const blockStyle = editor.isActive('heading', { level: 1 })
    ? 'heading-1'
    : editor.isActive('heading', { level: 2 })
      ? 'heading-2'
      : editor.isActive('heading', { level: 3 })
        ? 'heading-3'
        : 'paragraph'
  const textStyle = editor.getAttributes('textStyle') as {
    color?: string
    fontFamily?: string
    fontSize?: string
    lineHeight?: string
  }
  const highlightColor =
    (editor.getAttributes('highlight').color as string | undefined) ?? '#fff59d'
  const listItemType = editor.isActive('taskItem') ? 'taskItem' : 'listItem'

  return (
    <div
      className={`ad-module-editor${focusMode ? ' ad-module-editor--focus' : ''}${standalone ? ' ad-module-editor--standalone' : ''}${invalid ? ' is-invalid' : ''}`}
    >
      <div className="ad-module-editor-head">
        <div>
          <strong>{label}</strong>
          <small>Rich document · automatically kept with this module</small>
        </div>
        <div className="ad-module-editor-head-actions">
          <button
            type="button"
            className="ad-module-editor-focus"
            disabled={importing}
            onClick={requestWordImport}
          >
            {importing ? 'Importing…' : 'Import Word document'}
            <FileUp aria-hidden="true" />
          </button>
          {documentId && !standalone ? (
            <button type="button" className="ad-module-editor-focus" onClick={openDocumentTab}>
              Open in new tab
            </button>
          ) : null}
          {standalone ? (
            <button type="button" className="ad-module-editor-focus" onClick={() => window.close()}>
              Done
            </button>
          ) : (
            <button
              type="button"
              className="ad-module-editor-focus"
              onClick={() => setFocusMode((current) => !current)}
            >
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </button>
          )}
        </div>
      </div>
      <input
        ref={importInputRef}
        hidden
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        tabIndex={-1}
        onChange={(event) => {
          void importDocument(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={imageInputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/svg+xml,image/gif,image/webp"
        tabIndex={-1}
        onChange={(event) => {
          void insertImageFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <dialog
        ref={importWarningRef}
        className="ad-module-import-dialog"
        aria-labelledby={`module-import-warning-${documentId ?? 'editor'}`}
      >
        <div className="ad-module-import-warning-icon">
          <TriangleAlert aria-hidden="true" />
        </div>
        <div className="ad-module-import-warning-copy">
          <h2 id={`module-import-warning-${documentId ?? 'editor'}`}>Replace existing content?</h2>
          <p>Importing a Word document will replace everything currently written in this module.</p>
        </div>
        <div className="ad-module-import-warning-actions">
          <button type="button" onClick={() => importWarningRef.current?.close()}>
            Keep current writing
          </button>
          <button type="button" data-primary onClick={continueWordImport}>
            Continue to import
          </button>
        </div>
      </dialog>
      <div className="ad-module-editor-toolbar" role="toolbar" aria-label="Document formatting">
        <div className="ad-module-editor-tool-group">
          <ToolbarButton
            label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 />
          </ToolbarButton>
        </div>
        <div className="ad-module-editor-tool-group">
          <select
            className="ad-module-editor-select ad-module-editor-select--style"
            aria-label="Paragraph style"
            title="Paragraph style"
            value={blockStyle}
            onChange={(event) => {
              const style = event.target.value
              if (style === 'paragraph') editor.chain().focus().setParagraph().run()
              else
                editor
                  .chain()
                  .focus()
                  .setHeading({ level: Number(style.at(-1)) as 1 | 2 | 3 })
                  .run()
            }}
          >
            <option value="paragraph">Paragraph</option>
            <option value="heading-1">Heading 1</option>
            <option value="heading-2">Heading 2</option>
            <option value="heading-3">Heading 3</option>
          </select>
          <select
            className="ad-module-editor-select ad-module-editor-select--font"
            aria-label="Font family"
            title="Font family"
            value={textStyle.fontFamily ?? ''}
            onChange={(event) => {
              const font = event.target.value
              if (font) editor.chain().focus().setFontFamily(font).run()
              else editor.chain().focus().unsetFontFamily().run()
            }}
          >
            {FONT_FAMILIES.map(([font, name]) => (
              <option key={name} value={font}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="ad-module-editor-select ad-module-editor-select--size"
            aria-label="Font size"
            title="Font size"
            value={textStyle.fontSize ?? ''}
            onChange={(event) => {
              const size = event.target.value
              if (size) editor.chain().focus().setFontSize(size).run()
              else editor.chain().focus().unsetFontSize().run()
            }}
          >
            {FONT_SIZES.map(([size, name]) => (
              <option key={name} value={size}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="ad-module-editor-tool-group">
          <ToolbarButton
            label="Bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <Underline />
          </ToolbarButton>
          <ToolbarButton
            label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough />
          </ToolbarButton>
          <ToolbarButton
            label="Subscript"
            active={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <Subscript />
          </ToolbarButton>
          <ToolbarButton
            label="Superscript"
            active={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <Superscript />
          </ToolbarButton>
          <label className="ad-module-editor-color" title="Text color" aria-label="Text color">
            <PaintBucket aria-hidden="true" />
            <input
              type="color"
              aria-label="Text color"
              value={colorInputValue(textStyle.color, '#172033')}
              onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
            />
          </label>
          <label
            className="ad-module-editor-color"
            title="Highlight color"
            aria-label="Highlight color"
          >
            <Highlighter aria-hidden="true" />
            <input
              type="color"
              aria-label="Highlight color"
              value={colorInputValue(highlightColor, '#fff59d')}
              onChange={(event) =>
                editor.chain().focus().setHighlight({ color: event.target.value }).run()
              }
            />
          </label>
          <ToolbarButton
            label="Clear formatting"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <RemoveFormatting />
          </ToolbarButton>
        </div>
        <div className="ad-module-editor-tool-group">
          <ToolbarButton
            label="Bulleted list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered />
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <ListChecks />
          </ToolbarButton>
          <ToolbarButton
            label="Decrease list indent"
            disabled={!editor.isActive('listItem') && !editor.isActive('taskItem')}
            onClick={() => editor.chain().focus().liftListItem(listItemType).run()}
          >
            <IndentDecrease />
          </ToolbarButton>
          <ToolbarButton
            label="Increase list indent"
            disabled={!editor.isActive('listItem') && !editor.isActive('taskItem')}
            onClick={() => editor.chain().focus().sinkListItem(listItemType).run()}
          >
            <IndentIncrease />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote />
          </ToolbarButton>
          <ToolbarButton
            label="Code block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code2 />
          </ToolbarButton>
        </div>
        <div className="ad-module-editor-tool-group">
          <select
            className="ad-module-editor-select ad-module-editor-select--spacing"
            aria-label="Line spacing"
            title="Line spacing"
            value={textStyle.lineHeight ?? ''}
            onChange={(event) => {
              const height = event.target.value
              if (height) editor.chain().focus().setLineHeight(height).run()
              else editor.chain().focus().unsetLineHeight().run()
            }}
          >
            {LINE_HEIGHTS.map(([height, name]) => (
              <option key={name} value={height}>
                {name}
              </option>
            ))}
          </select>
          {alignmentTools.map(([alignment, alignmentLabel, Icon]) => (
            <ToolbarButton
              key={String(alignment)}
              label={String(alignmentLabel)}
              active={editor.isActive({ textAlign: alignment })}
              onClick={() => editor.chain().focus().setTextAlign(alignment).run()}
            >
              <Icon />
            </ToolbarButton>
          ))}
        </div>
        <div className="ad-module-editor-tool-group">
          <ToolbarButton
            label="Add or edit link"
            active={editor.isActive('link')}
            onClick={setLink}
          >
            <Link2 />
          </ToolbarButton>
          <ToolbarButton
            label="Remove link"
            disabled={!editor.isActive('link')}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Unlink />
          </ToolbarButton>
          <ToolbarButton
            label="Upload image from device"
            disabled={uploadingImage || importing}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageUp />
          </ToolbarButton>
          <ToolbarButton label="Insert image from URL" onClick={insertImageFromUrl}>
            <Globe />
          </ToolbarButton>
          <ToolbarButton
            label="Horizontal line"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus />
          </ToolbarButton>
          <ToolbarButton
            label="Insert 3 by 3 table"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <Table2 />
          </ToolbarButton>
        </div>
        {editor.isActive('table') ? (
          <div className="ad-module-editor-tool-group" aria-label="Table controls">
            <ToolbarButton
              label="Add table row"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <Rows3 />
            </ToolbarButton>
            <ToolbarButton
              label="Add table column"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <Columns3 />
            </ToolbarButton>
            <ToolbarButton
              label="Delete table row"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <Rows3 />
            </ToolbarButton>
            <ToolbarButton
              label="Delete table column"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <Columns3 />
            </ToolbarButton>
            <ToolbarButton
              label="Delete table"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 />
            </ToolbarButton>
          </div>
        ) : null}
      </div>
      <div className="ad-module-editor-canvas">
        <EditorContent editor={editor} />
      </div>
      <div className="ad-module-editor-status">
        <span data-tone={importStatus.message ? importStatus.tone : undefined}>
          {importStatus.message || `${words.toLocaleString()} words`}
        </span>
        <span>Changes are saved with the course</span>
      </div>
    </div>
  )
}
