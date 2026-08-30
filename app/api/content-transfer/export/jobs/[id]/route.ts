import { NextRequest, NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { advanceContentExportJob, getContentExportJob } from '@/lib/content-transfer/export-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function editor() {
  const viewer = await getRequestViewer()
  return viewer && (viewer.role === 'admin' || viewer.role === 'editor') ? viewer : null
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const viewer = await editor()
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const job = await getContentExportJob((await context.params).id, viewer.id)
  return job
    ? NextResponse.json(job, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ error: 'Content export job not found' }, { status: 404 })
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const viewer = await editor()
  if (!viewer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const job = await advanceContentExportJob((await context.params).id, viewer.id)
  return job
    ? NextResponse.json(job, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ error: 'Content export job not found' }, { status: 404 })
}
