import { AuthorAssessments } from '@/components/author-assessments'

export const metadata = { title: 'Assessments' }

export default function Page() {
  return <AuthorAssessments tab="overview" />
}
