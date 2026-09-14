import { redirect } from 'next/navigation'

export const metadata = { title: 'Tutors' }

export default function Page() {
  redirect('/courses')
}
