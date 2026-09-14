import { redirect } from 'next/navigation'

export const metadata = { title: 'pending' }

export default function Page() {
  redirect('/courses')
}
