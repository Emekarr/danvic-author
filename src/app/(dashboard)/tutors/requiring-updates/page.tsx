import { redirect } from 'next/navigation'

export const metadata = { title: 'requiring-updates' }

export default function Page() {
  redirect('/courses')
}
