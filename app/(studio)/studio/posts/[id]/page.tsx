import { notFound } from 'next/navigation'
import { getPostById } from '@/lib/db/queries/posts'
import { PostDetailContent } from './post-detail-content'


export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPostById(id)

  if (!post) {
    notFound()
  }

  return <PostDetailContent post={post} />
}
