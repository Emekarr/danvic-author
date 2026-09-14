import { redirect } from 'next/navigation'

export const metadata = { title: 'Assignments' }

export default function Page() {
  redirect('/assessments')
}
