import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assets, categories, platformJobs, resources, tags } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { getCloudflareContext } from '@opennextjs/cloudflare'


export async function GET() {
  let dbConnected = false
  let stats = { resources: 0, published: 0, categories: 0, tags: 0, assets: 0, jobs: 0 }

  try {
    await db.query.resources.findFirst()
    dbConnected = true

    const [resourcesCount, publishedCount, categoriesCount, tagsCount, assetsCount, jobsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(resources),
      db.select({ count: sql<number>`count(*)` }).from(resources).where(sql`${resources.status} = 'published'`),
      db.select({ count: sql<number>`count(*)` }).from(categories),
      db.select({ count: sql<number>`count(*)` }).from(tags),
      db.select({ count: sql<number>`count(*)` }).from(assets),
      db.select({ count: sql<number>`count(*)` }).from(platformJobs),
    ])

    stats = {
      resources: resourcesCount[0]?.count || 0,
      published: publishedCount[0]?.count || 0,
      categories: categoriesCount[0]?.count || 0,
      tags: tagsCount[0]?.count || 0,
      assets: assetsCount[0]?.count || 0,
      jobs: jobsCount[0]?.count || 0,
    }
  } catch {
    dbConnected = false
  }

  const hasR2Config = Boolean(getCloudflareContext().env.R2_BUCKET && process.env.R2_PUBLIC_URL)

  const hasSchedulerConfig = !!process.env.CRON_SECRET
  const hasGitHubConfig = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_CONTENT_REPOSITORY)

  return NextResponse.json({
    dbConnected,
    hasR2Config,
    hasSchedulerConfig,
    hasGitHubConfig,
    githubRepository: process.env.GITHUB_CONTENT_REPOSITORY || null,
    githubBranch: process.env.GITHUB_CONTENT_BRANCH || 'content-sync',
    stats,
  })
}
