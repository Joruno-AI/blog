import { NextRequest, NextResponse } from 'next/server'

import { getRequestViewer } from '@/lib/auth/request-viewer'
import { createContentBundle } from '@/lib/content-transfer/export-service'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const viewer = await getRequestViewer()
  if (!viewer || (viewer.role !== 'admin' && viewer.role !== 'editor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const bundle = await createContentBundle({
      repository: request.nextUrl.searchParams.get('repository'),
      ref: request.nextUrl.searchParams.get('ref'),
      commit: request.nextUrl.searchParams.get('commit'),
    })
    const timestamp = bundle.generatedAt.replace(/[:.]/g, '-').slice(0, 19)
    return NextResponse.json(bundle, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="joruno-content-${timestamp}.json"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Failed to export content bundle', error)
    return NextResponse.json({ error: 'Failed to export content bundle' }, { status: 500 })
  }
}
