import { NextResponse } from 'next/server'
import { archiveArticles } from '@/modules/articles/application/article-service'
import { mutationErrorResponse } from '@/lib/http/api-error'


export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid request: ids array is required' }, { status: 400 })
    }

    const deletedCount = await archiveArticles(ids)

    return NextResponse.json({ success: true, deletedCount })
  } catch (error) {
    console.error('Error batch deleting posts:', error)
    return mutationErrorResponse(error, 'Failed to delete posts')
  }
}
