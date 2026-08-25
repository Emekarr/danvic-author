export type ModuleContentNode = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  content?: ModuleContentNode[]
}

export type ModuleContentDocument = ModuleContentNode & {
  type: 'doc'
  content: ModuleContentNode[]
}

export const emptyModuleDocument = (): ModuleContentDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
})

const legacyDocument = (value: string): ModuleContentDocument => ({
  type: 'doc',
  content: value
    .split(/\n{2,}/u)
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => ({
      type: 'paragraph',
      content: paragraph
        .split('\n')
        .flatMap((line, index) => [
          ...(index ? [{ type: 'hardBreak' }] : []),
          ...(line ? [{ type: 'text', text: line }] : []),
        ]),
    })),
})

export function parseModuleContent(value: string): ModuleContentDocument {
  if (value.startsWith('{"type":"doc"')) {
    try {
      const parsed = JSON.parse(value) as ModuleContentDocument
      if (parsed.type === 'doc' && Array.isArray(parsed.content)) return parsed
    } catch {
      // A malformed legacy value is displayed as text instead of being discarded.
    }
  }
  return value ? legacyDocument(value) : emptyModuleDocument()
}

export const serializeModuleContent = (document: ModuleContentDocument) => JSON.stringify(document)

export function moduleContentText(value: string | ModuleContentNode): string {
  const node = typeof value === 'string' ? parseModuleContent(value) : value
  const ownText = typeof node.text === 'string' ? node.text : ''
  return `${ownText}${(node.content ?? []).map(moduleContentText).join(' ')}`.trim()
}

export function moduleContentIsEmpty(value: string): boolean {
  const document = parseModuleContent(value)
  const hasImage = (node: ModuleContentNode): boolean =>
    node.type === 'image' || (node.content ?? []).some(hasImage)
  return !moduleContentText(document) && !hasImage(document)
}

/** Returns private course-storage objects embedded in a rich-text module. */
export function moduleImageAttachmentPaths(value: string): string[] {
  const paths = new Set<string>()
  const visit = (node: ModuleContentNode): void => {
    if (
      node.type === 'image' &&
      typeof node.attrs?.attachmentPath === 'string' &&
      /^courses\/[0-9A-HJKMNP-TV-Z]{26}\/[0-9A-HJKMNP-TV-Z]{26}\.(jpg|png|svg|gif|webp)$/u.test(
        node.attrs.attachmentPath,
      )
    )
      paths.add(node.attrs.attachmentPath)
    for (const child of node.content ?? []) visit(child)
  }
  visit(parseModuleContent(value))
  return [...paths]
}
