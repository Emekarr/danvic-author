'use client'

import { createRoot, type Root } from 'react-dom/client'
import type { ReactElement } from 'react'
import ReactDOM from 'react-dom'

const roots = new WeakMap<Element, Root>()

function render(element: ReactElement, container: Element, callback?: () => void): void {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  root.render(element)
  if (callback) queueMicrotask(callback)
}

function unmountComponentAtNode(container: Element): boolean {
  const root = roots.get(container)
  if (!root) return false
  root.unmount()
  roots.delete(container)
  return true
}

const dom = ReactDOM as unknown as Record<string, unknown>
if (typeof dom.render !== 'function') dom.render = render
if (typeof dom.unmountComponentAtNode !== 'function') dom.unmountComponentAtNode = unmountComponentAtNode
if (typeof dom.hydrate !== 'function') dom.hydrate = render

export default function ReactDomLegacy() {
  return null
}
