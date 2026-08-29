import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting, getSettings } from '@/lib/db/queries/settings'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const keys = searchParams.get('keys')

    if (key) {
      const value = await getSetting(key)
      return NextResponse.json({ key, value })
    }

    if (keys) {
      const keyList = keys.split(',')
      const values = await getSettings(keyList)
      return NextResponse.json(values)
    }

    return NextResponse.json({ error: 'Missing key or keys parameter' }, { status: 400 })
  } catch (error) {
    console.error('Error getting settings:', error)
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }

    await setSetting(key, value)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting value:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
