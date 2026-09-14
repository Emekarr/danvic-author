import { ContentReviewRoute } from '@/components/content-governance'

export const metadata = { title: 'Content review' }

export function generateStaticParams() {
  return [{ slug: [] }, { slug: ['question-bank'] }]
}

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params
  return <ContentReviewRoute slug={slug} />
}
