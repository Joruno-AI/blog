import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { CONTENT_SNAPSHOT_PATH, contentBundleSchema } from '@/lib/content-transfer/contract'
import { applyContentImport, planContentImport } from '@/lib/content-transfer/import-service'
import { applyLegacyAstroImport, planLegacyAstroImport } from '@/lib/content-transfer/legacy-astro-import'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const importRequestSchema = z.object({
  bundle: z.unknown(),
  dryRun: z.boolean().default(true),
  confirm: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const viewer = await getRequestViewer()
  if (viewer?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Content bundle exceeds the 50 MB request limit' }, { status: 413 })
  }

  try {
    const input = importRequestSchema.parse(await request.json())
    const parsedBundle = contentBundleSchema.parse(input.bundle)
    const isSnapshot = parsedBundle.files.some((file) => file.path === CONTENT_SNAPSHOT_PATH)
    if (input.dryRun) {
      const { bundle, plan } = isSnapshot
        ? await planContentImport(parsedBundle)
        : await planLegacyAstroImport(parsedBundle)
      return NextResponse.json({
        dryRun: true,
        schemaVersion: bundle.schemaVersion,
        generatedAt: bundle.generatedAt,
        plan,
      }, { status: plan.conflicts.length ? 409 : 200 })
    }
    if (input.confirm !== 'APPLY_CONTENT_IMPORT') {
      return NextResponse.json({ error: 'Set confirm to APPLY_CONTENT_IMPORT before applying changes' }, { status: 400 })
    }
    return NextResponse.json(isSnapshot
      ? await applyContentImport(parsedBundle)
      : await applyLegacyAstroImport(parsedBundle, viewer.id))
  } catch (error) {
    const conflicts = error && typeof error === 'object' && 'conflicts' in error
      ? (error as { conflicts?: unknown }).conflicts
      : undefined
    if (conflicts) return NextResponse.json({ error: 'Content import conflict', conflicts }, { status: 409 })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid content bundle', issues: error.issues }, { status: 400 })
    }
    console.error('Failed to import content bundle', error)
    return NextResponse.json({ error: 'Failed to import content bundle' }, { status: 500 })
  }
}
