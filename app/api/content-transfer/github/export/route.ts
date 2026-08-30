import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createContentExportJob, inspectContentExportForGitHub } from '@/lib/content-transfer/export-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  repository: z.string().optional(),
  branch: z.string().optional(),
  baseBranch: z.string().optional(),
  message: z.string().max(500).optional(),
  dryRun: z.boolean().default(true),
  confirm: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const viewer = await getRequestViewer()
  if (viewer?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  try {
    const input = requestSchema.parse(await request.json())
    const repository = input.repository || process.env.GITHUB_CONTENT_REPOSITORY
    const branch = input.branch || process.env.GITHUB_CONTENT_BRANCH || 'content-sync'
    if (!repository) return NextResponse.json({ error: 'GitHub content repository is not configured' }, { status: 400 })
    if (input.dryRun) {
      const inspection = await inspectContentExportForGitHub()
      return NextResponse.json({ dryRun: true, repository, branch, ...inspection })
    }
    if (input.confirm !== 'PUSH_CONTENT_TO_GITHUB') {
      return NextResponse.json({ error: 'Set confirm to PUSH_CONTENT_TO_GITHUB before creating a Git commit' }, { status: 400 })
    }
    if (!process.env.GITHUB_TOKEN) return NextResponse.json({ error: 'GitHub token is not configured' }, { status: 400 })
    return NextResponse.json(await createContentExportJob({
      ownerId: viewer.id,
      mode: 'github',
      repository,
      branch,
      baseBranch: input.baseBranch,
      message: input.message,
    }), { status: 202 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request', issues: error.issues }, { status: 400 })
    console.error('Failed to start GitHub content export', error)
    return NextResponse.json({ error: 'Failed to start GitHub content export' }, { status: 502 })
  }
}
