import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createContentBundle } from '@/lib/content-transfer/export-service'
import { writeContentBundleToGitHub } from '@/lib/content-transfer/github-service'

export const runtime = 'edge'
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
    const bundle = await createContentBundle({ repository, ref: branch })
    const embeddedFiles = bundle.files.filter((file) => file.encoding !== 'external').length
    const externalAssets = bundle.files.length - embeddedFiles
    if (input.dryRun) {
      return NextResponse.json({ dryRun: true, repository, branch, embeddedFiles, externalAssets })
    }
    if (input.confirm !== 'PUSH_CONTENT_TO_GITHUB') {
      return NextResponse.json({ error: 'Set confirm to PUSH_CONTENT_TO_GITHUB before creating a Git commit' }, { status: 400 })
    }
    const token = process.env.GITHUB_TOKEN
    if (!token) return NextResponse.json({ error: 'GitHub token is not configured' }, { status: 400 })
    return NextResponse.json(await writeContentBundleToGitHub({
      bundle,
      repository,
      branch,
      baseBranch: input.baseBranch,
      message: input.message,
      token,
    }))
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request', issues: error.issues }, { status: 400 })
    console.error('Failed to export content to GitHub', error)
    return NextResponse.json({ error: 'Failed to export content to GitHub' }, { status: 502 })
  }
}
