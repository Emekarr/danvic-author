import type { Metadata } from 'next'
import '@danvic/ui/styles.css'
import './author.css'
import './author-polish.css'
import ReactDomLegacy from '../lib/react-dom-legacy'

export const metadata: Metadata = { title: { default: 'DANVIC Author', template: '%s · DANVIC' }, description: 'Create live and premade courses for DANVIC Energy Learning.', robots: { index: false, follow: false } }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ReactDomLegacy />{children}</body></html>
}
