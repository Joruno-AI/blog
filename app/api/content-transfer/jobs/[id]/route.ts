import { NextRequest, NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { advanceContentImportJob, getContentImportJob } from '@/lib/content-transfer/import-jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function admin() {
  const viewer = await getRequestViewer()
  return viewer?.role === 'admin' ? viewer : null
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const viewer = await admin()
  if (!viewer) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const job = await getContentImportJob((await context.params).id, viewer.id)
  return job
    ? NextResponse.json(job, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ error: 'Content import job not found' }, { status: 404 })
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const viewer = await admin()
  if (!viewer) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  const job = await advanceContentImportJob((await context.params).id, viewer.id)
  return job
    ? NextResponse.json(job, { headers: { 'Cache-Control': 'private, no-store' } })
    : NextResponse.json({ error: 'Content import job not found' }, { status: 404 })
}
