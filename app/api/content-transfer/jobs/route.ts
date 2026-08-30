import { NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { listContentImportJobs } from '@/lib/content-transfer/import-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const viewer = await getRequestViewer()
  if (viewer?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  return NextResponse.json({ jobs: await listContentImportJobs(viewer.id) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
