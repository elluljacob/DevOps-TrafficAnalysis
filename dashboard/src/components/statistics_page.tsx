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
function usePieData(selectedIds: string[]) {
    const [pieData, setPieData] = useState<PieChartResult[]>([])

    useEffect(() => {
        // If no IDs are selected, we just don't start the fetch/interval logic.
        // We don't call setState here to avoid the "cascading render" error.
        if (selectedIds.length === 0) {
            return;
        }

        const fetchData = async () => {
            try {
                const idsParam = selectedIds.join(',');
                const res = await fetch(`/api/stats?ids=${idsParam}`)
                const result: PieChartResult[] = await res.json()
                setPieData(result ?? [])
            } catch (err) {
                console.error('Fetch error:', err)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
        
    }, [selectedIds.join(',')]) 

    // This handles the "UI reset" when cameras are deselected 
    // without needing a synchronous setState in the effect.
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
    const [stream, setStream] = useState<StreamID>('cam1')

    const { streams } = useStreams()
    
    // Get array of IDs that are currently selected
    const selectedIds = Object.keys(streams).filter(id => streams[id].selected)
    
    // Pass those IDs to the hook
    const pieData = usePieData(selectedIds)
    const history = useCameraHistory(range, stream)

    return (
        <>
            {pieData.length > 0 && (
                <TrafficChartTimeline
                    history={history}
                    range={range}
                    stream={stream}
                    setRange={setRange}
                    setStream={setStream}
                />
            )}
            <SimplePieCharts pieData={pieData} />
        </>
    )
}