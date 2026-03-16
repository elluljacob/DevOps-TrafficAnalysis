'use client'
import { useEffect, useState } from 'react'
import { HistoryDataPoint, TimeRange, PieChartResult, StreamID } from '@/types/stats'
import TrafficChartTimeline from '@/components/statistics_page/timeline'
import { SimplePieCharts } from '@/components/statistics_page/simple_piecharts'
import { useStreams } from '@/components/global/stream_list'

/* ============================================================================
 * usePieData Hook
 * ============================================================================
 */
function usePieData(selectedIds: string[], range: TimeRange) {
    const [pieData, setPieData] = useState<PieChartResult[]>([])

    useEffect(() => {
        if (selectedIds.length === 0) {
            return;
        }

        const fetchData = async () => {
            try {
                const idsParam = selectedIds.join(',');
                // Added range parameter to the API call
                const res = await fetch(`/api/stats?ids=${idsParam}&range=${range}`)
                const result: PieChartResult[] = await res.json()
                setPieData(result ?? [])
            } catch (err) {
                console.error('Fetch error:', err)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
        
        // Added range to dependency array so it refetches when the dropdown changes
    }, [selectedIds.join(','), range]) 

    return selectedIds.length === 0 ? [] : pieData;
}
/* ============================================================================
 * useCameraHistory Hook
 * ============================================================================
 */
function useCameraHistory(range: TimeRange, stream: StreamID) {
    const [history, setHistory] = useState<HistoryDataPoint[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/stream_history?range=${range}&stream=${stream}`)
                const result = await res.json()
                
                if (result && Array.isArray(result.history)) {
                    setHistory(result.history)
                } else {
                    setHistory([]) 
                }
            } catch (err) {
                console.error('History fetch error:', err)
                setHistory([]) 
            }
        }

        fetchData() // Initial call
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [range, stream])

    return history
}
/* ============================================================================
 * StatisticsPage Component
 * ============================================================================
 */

export default function StatisticsPage() {
    const [range, setRange] = useState<TimeRange>('live')
    // Added a separate range state for the pie charts 
    // (or you can use the same 'range' state if you want them globally synced)
    const [pieRange, setPieRange] = useState<TimeRange>('live')
    const [stream, setStream] = useState<StreamID>('cam1')

    const { streams } = useStreams()
    const selectedIds = Object.keys(streams).filter(id => streams[id].selected)
    
    // Now passing pieRange to the hook
    const pieData = usePieData(selectedIds, pieRange)
    const history = useCameraHistory(range, stream)

    return (
        <>
            <TrafficChartTimeline
                history={history}
                range={range}
                stream={stream}
                setRange={setRange}
                setStream={setStream}
            />
            
            <SimplePieCharts 
                pieData={pieData} 
                range={pieRange} 
                setRange={setPieRange} 
            />
        </>
    )
}