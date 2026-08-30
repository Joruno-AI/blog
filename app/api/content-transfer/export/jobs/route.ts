import { NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { listContentExportJobs } from '@/lib/content-transfer/export-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const viewer = await getRequestViewer()
  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'editor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ jobs: await listContentExportJobs(viewer.id) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
