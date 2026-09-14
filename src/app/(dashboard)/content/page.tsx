import { redirect } from 'next/navigation'

export const metadata = { title: 'Content' }

export default function Page() {
  redirect('/content-review')
}
