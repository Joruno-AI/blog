import { NextRequest, NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createContentExportJob, getCompletedContentExport } from '@/lib/content-transfer/export-jobs'
import { storedContentBundleStream } from '@/lib/content-transfer/export-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function editor() {
  const viewer = await getRequestViewer()
  return viewer && (viewer.role === 'admin' || viewer.role === 'editor') ? viewer : null
}

export async function POST() {
  const viewer = await editor()
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await createContentExportJob({ ownerId: viewer.id, mode: 'download' }), { status: 202 })
  } catch (error) {
    console.error('Failed to start content export', error)
    return NextResponse.json({ error: 'Failed to start content export' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const viewer = await editor()
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'A completed export jobId is required' }, { status: 400 })
  try {
    const completed = await getCompletedContentExport(jobId, viewer.id)
    if (!completed) return NextResponse.json({ error: 'Completed content export not found' }, { status: 404 })
    const timestamp = completed.input.generatedAt.replace(/[:.]/g, '-').slice(0, 19)
    return new Response(storedContentBundleStream(completed.bucket, completed.manifest), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="joruno-content-${timestamp}.json"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Failed to stream content export', error)
    return NextResponse.json({ error: 'Failed to stream content export' }, { status: 500 })
  }
}
