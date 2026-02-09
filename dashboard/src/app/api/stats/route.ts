import { NextResponse } from 'next/server'
import { getStats } from '@/components/data_fetch_requests'

export async function GET() {
  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}