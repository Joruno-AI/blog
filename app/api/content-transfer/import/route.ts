import { NextRequest, NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createUploadedContentImportJob } from '@/lib/content-transfer/import-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const viewer = await getRequestViewer()
  if (viewer?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    return NextResponse.json({ error: 'Content-Length is required for streamed content import' }, { status: 411 })
  }
  if (contentLength > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Content bundle exceeds the 50 MB request limit' }, { status: 413 })
  }
  if (!request.body) return NextResponse.json({ error: 'Content bundle body is required' }, { status: 400 })

  const dryRun = request.nextUrl.searchParams.get('dryRun') !== 'false'
  const confirm = request.headers.get('x-content-import-confirm')
  if (!dryRun && confirm !== 'APPLY_CONTENT_IMPORT') {
    return NextResponse.json({ error: 'Set X-Content-Import-Confirm to APPLY_CONTENT_IMPORT before applying changes' }, { status: 400 })
  }

  try {
    return NextResponse.json(await createUploadedContentImportJob({
      body: request.body,
      contentLength,
      dryRun,
      ownerId: viewer.id,
    }), { status: 202 })
  } catch (error) {
    console.error('Failed to persist content bundle import', error)
    const message = error instanceof Error ? error.message : 'Failed to import content bundle'
    const status = /50 MB request limit|Content-Length/i.test(message) ? 413 : /Invalid content/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
