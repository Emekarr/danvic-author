import { redirect } from 'next/navigation'

export const metadata = { title: 'Version control' }

export default function Page() {
  redirect('/content-review')
}
