import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { CONTENT_SNAPSHOT_PATH } from '@/lib/content-transfer/contract'
import { readContentBundleFromGitHub } from '@/lib/content-transfer/github-service'
import { applyContentImport, planContentImport } from '@/lib/content-transfer/import-service'
import { applyLegacyAstroImport, planLegacyAstroImport } from '@/lib/content-transfer/legacy-astro-import'

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
    const bundle = await readContentBundleFromGitHub({ repository, ref, token: process.env.GITHUB_TOKEN })
    const isSnapshot = bundle.files.some((file) => file.path === CONTENT_SNAPSHOT_PATH)
    if (input.dryRun) {
      const { plan } = isSnapshot ? await planContentImport(bundle) : await planLegacyAstroImport(bundle)
      return NextResponse.json({ dryRun: true, repository, ref, plan }, { status: plan.conflicts.length ? 409 : 200 })
    }
    if (input.confirm !== 'APPLY_GITHUB_CONTENT') {
      return NextResponse.json({ error: 'Set confirm to APPLY_GITHUB_CONTENT before applying GitHub content' }, { status: 400 })
    }
    const result = isSnapshot
      ? await applyContentImport(bundle)
      : await applyLegacyAstroImport(bundle, viewer.id)
    return NextResponse.json({ repository, ref, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid request or content bundle', issues: error.issues }, { status: 400 })
    console.error('Failed to import content from GitHub', error)
    return NextResponse.json({ error: 'Failed to import content from GitHub' }, { status: 502 })
  }
}
