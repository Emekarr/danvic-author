import { redirect } from 'next/navigation'

export const metadata = { title: 'approved' }

export default function Page() {
  redirect('/courses')
}
