import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { getPostsWithContent } from '@/lib/db/queries/posts'


interface CategoryWithPosts {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  order: number
  level: number
  path: string
  postCount: number
  totalPostCount: number
  children: CategoryWithPosts[]
  posts: {
    id: string
    title: string
    slug: string
    draft: boolean
    pubDate: Date | null
  }[]
}

async function getAllResourcePosts() {
  const pageSize = 1_000
  const posts = [] as Awaited<ReturnType<typeof getPostsWithContent>>

  for (let offset = 0; ; offset += pageSize) {
    const page = await getPostsWithContent({ limit: pageSize, offset })
    posts.push(...page)
    if (page.length < pageSize) return posts
  }
}

export async function GET() {
  try {
    const [categoryRows, resourcePosts] = await Promise.all([
      db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        parentId: categories.parentId,
        order: categories.order,
      })
      .from(categories)
      .orderBy(asc(categories.order), asc(categories.name)),
      getAllResourcePosts(),
    ])
    const allPosts = [...resourcePosts].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    const allCategories = categoryRows.map((category) => ({
      ...category,
      postCount: allPosts.filter((post) => post.categoryId === category.id).length,
    }))

    // Get uncategorized posts (categoryId is null)
    const uncategorizedPosts = allPosts
      .filter((p) => p.categoryId === null)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        draft: p.draft,
        pubDate: p.pubDate,
      }))

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithPosts>()

    // First pass: create all category nodes
    for (const cat of allCategories) {
      categoryMap.set(cat.id, {
        ...cat,
        level: 0,
        path: cat.slug,
        totalPostCount: cat.postCount,
        children: [],
        posts: allPosts
          .filter((p) => p.categoryId === cat.id)
          .map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            draft: p.draft,
            pubDate: p.pubDate,
          })),
      })
    }

    // Second pass: build parent-child relationships
    const rootCategories: CategoryWithPosts[] = []

    for (const cat of allCategories) {
      const categoryNode = categoryMap.get(cat.id)!
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId)
        if (parent) {
          parent.children.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    }

    // Third pass: calculate level, path, and totalPostCount recursively
    const processNode = (node: CategoryWithPosts, level: number, parentPath: string): number => {
      node.level = level
      node.path = parentPath ? `${parentPath}/${node.slug}` : node.slug

      let totalPosts = node.postCount
      for (const child of node.children) {
        totalPosts += processNode(child, level + 1, node.path)
      }
      node.totalPostCount = totalPosts
      return totalPosts
    }

    for (const root of rootCategories) {
      processNode(root, 0, '')
    }

    return NextResponse.json({
      categories: rootCategories,
      uncategorizedPosts,
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}
