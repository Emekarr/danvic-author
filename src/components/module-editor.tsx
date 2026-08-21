'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns3,
  Expand,
  ExternalLink,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Rows3,
  Shrink,
  Strikethrough,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react'
import {
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
  return (
    <button
      type="button"
      className="ad-module-editor-tool"
      data-active={active || undefined}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
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
      Placeholder.configure({ placeholder: 'Start writing this module…' }),
      Image.configure({ allowBase64: false, inline: false }),
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
  const insertImage = () => {
    const src = window.prompt('Paste the HTTPS address of an image')?.trim()
    if (src && /^https:\/\//iu.test(src)) editor.chain().focus().setImage({ src }).run()
  }
  const words = moduleContentText(editor.getJSON() as ModuleContentDocument)
    .split(/\s+/u)
    .filter(Boolean).length
  const openDocumentTab = () => {
    if (!documentId) return
    localStorage.setItem(`danvic-module-document:${documentId}`, value)
    window.open(`/modules/write?draft=${encodeURIComponent(documentId)}`, '_blank', 'noopener')
  }

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
          {documentId && !standalone ? (
            <button type="button" className="ad-module-editor-focus" onClick={openDocumentTab}>
              <ExternalLink aria-hidden="true" /> Open in new tab
            </button>
          ) : null}
          {standalone ? (
            <button type="button" className="ad-module-editor-focus" onClick={() => window.close()}>
              <Shrink aria-hidden="true" /> Done writing
            </button>
          ) : (
            <button
              type="button"
              className="ad-module-editor-focus"
              onClick={() => setFocusMode((current) => !current)}
            >
              {focusMode ? <Shrink aria-hidden="true" /> : <Expand aria-hidden="true" />}
              {focusMode ? 'Exit focus mode' : 'Focus mode'}
            </button>
          )}
        </div>
      </div>
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
          <ToolbarButton
            label="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 />
          </ToolbarButton>
          <ToolbarButton
            label="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 />
          </ToolbarButton>
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
          <ToolbarButton label="Insert image from URL" onClick={insertImage}>
            <ImagePlus />
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
        <span>{words.toLocaleString()} words</span>
        <span>Changes are saved with the course</span>
      </div>
    </div>
  )
}
