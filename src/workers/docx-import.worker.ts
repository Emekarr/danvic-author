import mammoth from 'mammoth'

type DocxWorkerResponse = {
  html: string
  warningCount: number
  error?: string
}

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null
  postMessage: (message: DocxWorkerResponse) => void
}

scope.onmessage = async (event) => {
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: event.data },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        styleMap: ['u => u'],
      },
    )
    scope.postMessage({
      html: result.value,
      warningCount: result.messages.length,
    })
  } catch (error) {
    scope.postMessage({
      html: '',
      warningCount: 0,
      error: error instanceof Error ? error.message : 'The Word document could not be converted.',
    })
  }
}
