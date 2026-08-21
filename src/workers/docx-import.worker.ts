import mammoth from 'mammoth'

type DocxWorkerResponse = {
  html: string
  imageCount: number
  warningCount: number
  error?: string
}

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null
  postMessage: (message: DocxWorkerResponse) => void
}

scope.onmessage = async (event) => {
  let imageCount = 0
  try {
    const result = await mammoth.convertToHtml(
      { arrayBuffer: event.data },
      {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        styleMap: ['u => u'],
        convertImage: mammoth.images.imgElement(async () => {
          imageCount += 1
          return {
            src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
          }
        }),
      },
    )
    scope.postMessage({
      html: result.value,
      imageCount,
      warningCount: result.messages.length,
    })
  } catch (error) {
    scope.postMessage({
      html: '',
      imageCount,
      warningCount: 0,
      error: error instanceof Error ? error.message : 'The Word document could not be converted.',
    })
  }
}
