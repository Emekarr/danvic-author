import { AuthorAssessments } from '@/components/author-assessments'

export const metadata = { title: 'Pending Review' }

export default function Page() {
  return <AuthorAssessments tab="pending-review" />
}
