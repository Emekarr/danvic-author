'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ModuleEditor } from '@/components/module-editor'

function ModuleWritingSurface() {
  const searchParams = useSearchParams()
  const draft = searchParams.get('draft') ?? ''
  const documentId = /^[0-9a-f-]{36}$/iu.test(draft) ? draft : ''
  const [content, setContent] = useState(() =>
    typeof window === 'undefined' || !documentId
      ? ''
      : (localStorage.getItem(`danvic-module-document:${documentId}`) ?? ''),
  )
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!documentId) return
    const storageKey = `danvic-module-document:${documentId}`
    const channel = new BroadcastChannel(storageKey)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== 'object') return
      const message = event.data as { type?: unknown; content?: unknown }
      if (message.type === 'content' && typeof message.content === 'string')
        setContent(message.content)
    }
    channel.postMessage({ type: 'request' })
    localStorage.removeItem(storageKey)
    return () => {
      channelRef.current = null
      channel.close()
    }
  }, [documentId])

  if (!documentId)
    return (
      <p className="ad-empty-line" data-tone="error">
        This module-writing link is invalid.
      </p>
    )

  return (
    <div className="ad-module-writing-page">
      <ModuleEditor
        documentId={documentId}
        standalone
        value={content}
        onChange={(nextContent) => {
          setContent(nextContent)
          channelRef.current?.postMessage({ type: 'update', content: nextContent })
        }}
      />
    </div>
  )
}

export default function ModuleWritingPage() {
  return (
    <Suspense fallback={<p className="ad-empty-line">Preparing your module document…</p>}>
      <ModuleWritingSurface />
    </Suspense>
  )
}
