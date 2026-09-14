import { redirect } from 'next/navigation'

export const metadata = { title: 'Quizzes' }

export default function Page() {
  redirect('/assessments')
}
