import { and, desc, eq, ne, sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  assets,
  categories,
  resourceCategories,
  resourceRevisions,
  resources,
  resourceTags,
  tags,
} from '@/lib/db/schema'

import { DashboardContent } from './studio-content'

export const dynamic = 'force-dynamic'

async function getDashboardStats() {
  const [total, published, categoriesData, tagsData, assetsData] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(resources).where(and(eq(resources.type, 'article'), ne(resources.status, 'archived'))),
    db.select({ count: sql<number>`count(*)` }).from(resources).where(and(eq(resources.type, 'article'), eq(resources.status, 'published'))),
    db.select({ count: sql<number>`count(*)` }).from(categories),
    db.select({ count: sql<number>`count(*)` }).from(tags),
    db.select({ count: sql<number>`count(*)` }).from(assets),
  ])
  return {
    totalPosts: total[0]?.count ?? 0,
    publishedPosts: published[0]?.count ?? 0,
    categoriesCount: categoriesData[0]?.count ?? 0,
    tagsCount: tagsData[0]?.count ?? 0,
    mediaCount: assetsData[0]?.count ?? 0,
  }
}

async function getCategoryStats() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      postCount: sql<number>`count(distinct ${resources.id})`,
    })
    .from(categories)
    .leftJoin(resourceCategories, eq(resourceCategories.categoryId, categories.id))
    .leftJoin(resources, and(
      eq(resources.id, resourceCategories.resourceId),
      eq(resources.type, 'article'),
      ne(resources.status, 'archived'),
    ))
    .groupBy(categories.id)
    .orderBy(desc(sql`count(distinct ${resources.id})`))
    .limit(8)
}

async function getRecentPosts() {
  return db
    .select({
      id: resources.id,
      title: resourceRevisions.title,
      pubDate: resources.publishedAt,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      categoryName: categories.name,
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.currentRevisionId))
    .leftJoin(resourceCategories, eq(resourceCategories.resourceId, resources.id))
    .leftJoin(categories, eq(categories.id, resourceCategories.categoryId))
    .where(and(eq(resources.type, 'article'), ne(resources.status, 'archived')))
    .orderBy(desc(resources.updatedAt), desc(resources.id))
    .limit(8)
}

async function getPostsByMonth() {
  const rows = await db
    .select({ pubDate: resources.publishedAt })
    .from(resources)
    .where(and(eq(resources.type, 'article'), eq(resources.status, 'published')))
  const current = new Date()
  const firstOfCurrentMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1))
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(firstOfCurrentMonth.getUTCFullYear(), firstOfCurrentMonth.getUTCMonth() - (11 - index), 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  })
  const counts = new Map(months.map((month) => [month, 0]))
  for (const row of rows) {
    if (!row.pubDate) continue
    const value = new Date(row.pubDate)
    const month = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`
    if (counts.has(month)) counts.set(month, (counts.get(month) ?? 0) + 1)
  }
  return months.map((month) => ({ month, count: counts.get(month) ?? 0 }))
}

async function getTopTags() {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      postCount: sql<number>`count(distinct ${resources.id})`,
    })
    .from(tags)
    .leftJoin(resourceTags, eq(resourceTags.tagId, tags.id))
    .leftJoin(resources, and(
      eq(resources.id, resourceTags.resourceId),
      eq(resources.type, 'article'),
      ne(resources.status, 'archived'),
    ))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(distinct ${resources.id})`))
    .limit(12)
}

export default async function DashboardPage() {
  const [stats, categoryStats, recentPosts, monthlyPosts, topTags] = await Promise.all([
    getDashboardStats(),
    getCategoryStats(),
    getRecentPosts(),
    getPostsByMonth(),
    getTopTags(),
  ])
  return <DashboardContent stats={stats} categoryStats={categoryStats} recentPosts={recentPosts} monthlyPosts={monthlyPosts} topTags={topTags} />
}
