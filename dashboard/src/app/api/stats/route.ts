import { NextResponse, NextRequest } from 'next/server'
import { getStats } from '@/app/api/stats/data_fetch_requests'
import { TimeRange } from '@/types/stats'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const range = (searchParams.get('range') as TimeRange) || 'live'
    
    const stats = await getStats(range)
    return NextResponse.json(stats)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}