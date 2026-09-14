import { redirect } from 'next/navigation'

export const metadata = { title: 'rejected' }

export default function Page() {
  redirect('/courses')
}
