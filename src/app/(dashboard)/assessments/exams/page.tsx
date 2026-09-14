import { redirect } from 'next/navigation'

export const metadata = { title: 'Exams' }

export default function Page() {
  redirect('/assessments')
}
