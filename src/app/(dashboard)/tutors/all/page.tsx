import { redirect } from 'next/navigation'

export const metadata = { title: 'all' }

export default function Page() {
  redirect('/courses')
}
