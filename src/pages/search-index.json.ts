import type { APIRoute } from 'astro'

import { getFilteredPosts } from '~/utils/data'
import { withBasePath } from '~/utils/path'

export const GET: APIRoute = async () => {
  const collections = await Promise.all([
    getFilteredPosts('blog'),
    getFilteredPosts('changelog'),
  ])

  const items = collections.flatMap((posts, index) => {
    const collection = index === 0 ? 'blog' : 'changelog'

    return posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      tags: post.data.tags,
      collection,
      url:
        post.data.redirect?.trim() ||
        withBasePath(`/${collection}/${post.id}/`),
    }))
  })

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
