import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createGitHubContentImportJob } from '@/lib/content-transfer/import-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  repository: z.string().optional(),
  ref: z.string().optional(),
  dryRun: z.boolean().default(true),
  confirm: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const viewer = await getRequestViewer()
  if (viewer?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const input = requestSchema.parse(await request.json())
    const repository = input.repository || process.env.GITHUB_CONTENT_REPOSITORY
    const ref = input.ref || process.env.GITHUB_CONTENT_BRANCH || 'content-sync'
    if (!repository) return NextResponse.json({ error: 'GitHub content repository is not configured' }, { status: 400 })
    if (!input.dryRun && input.confirm !== 'APPLY_GITHUB_CONTENT') {
      return NextResponse.json({ error: 'Set confirm to APPLY_GITHUB_CONTENT before applying GitHub content' }, { status: 400 })
    }
    return NextResponse.json(await createGitHubContentImportJob({
      repository,
      ref,
      token: process.env.GITHUB_TOKEN,
      ownerId: viewer.id,
      dryRun: input.dryRun,
    }), { status: 202 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request or content bundle', issues: error.issues }, { status: 400 })
    console.error('Failed to import content from GitHub', error)
    return NextResponse.json({ error: 'Failed to import content from GitHub' }, { status: 502 })
  }
}
