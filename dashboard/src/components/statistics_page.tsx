'use client'
import { useEffect, useState } from 'react'
import PieChart  from '@/components/chart_generators/generate_piechart'
import LineChart from '@/components/chart_generators/generate_linechart'
import st_styles from '@/styles/statistics.module.css'
import cd_styles from '@/styles/common_dashboard.module.css'
import { HistoryDataPoint, TimeRange, CameraObject, PieChartResult } from '@/types/stats'
import SelectDropdown from './filters'
import ft_styles from '@/styles/filter.module.css'

/* ============================================================================
 * Constants
 * ============================================================================
 */
const VEHICLE_CATEGORIES = [
    'Cars',
    'Bikes',
    'Buses',
    'Trucks',
    'Pedestrians'
]

const CHART_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'
]

export const TIME_RANGE_OPTIONS = [
    { label: 'Live (Last 5m)', value: 'live' },
    { label: 'Last Hour', value: '1h' },
    { label: 'Last 24h', value: '24h' },
    { label: 'Last 7 Days', value: '7d' }
] as const

export const CAMERA_OPTIONS = [
    { label: 'Camera 1', value: 'cam1' },
    { label: 'Camera 2', value: 'cam2' },
    { label: 'Camera 3', value: 'cam3' }
] as const

/* ============================================================================
 * TrafficChartTimeline Component
 * ============================================================================
 */
function TrafficChartTimeline({
    history,
    range,
    camera,
    setRange,
    setCamera
}: {
    history: HistoryDataPoint[]
    range: TimeRange
    camera: CameraObject
    setRange: (val: TimeRange) => void
    setCamera: (val: CameraObject) => void
}) {
    return (
        <div className={`${cd_styles.bubble} ${cd_styles.fullWidth}`}>
            <div className={st_styles.timeStatusBar}>
                <h3 className={cd_styles.thirdHeaderFormat}>
                    Real-time Telemetry
                </h3>
                <div className={ft_styles.filterGroup}>
                    <SelectDropdown value={camera} setValue={setCamera} options={CAMERA_OPTIONS} />
                    <SelectDropdown value={range} setValue={setRange} options={TIME_RANGE_OPTIONS} />
                </div>
            </div>
            <div className="h-[450px]">
                <LineChart
                    data={history}
                    config={{
                        xKey: 'timestamp',
                        series: VEHICLE_CATEGORIES as any,
                        colors: CHART_COLORS,
                        height: '100%',
                        width: '100%',
                        legendPosition: 'top',
                        renderer: 'canvas',
                        xAxisFormatter: (val) =>
                            new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }}
                />
            </div>
        </div>
    )
}

/* ============================================================================
 * SimplePieCharts Component
 * ============================================================================
 */
function SimplePieCharts({
    pieData = []
}: {
    pieData?: PieChartResult[]
}) {
    if (!pieData || pieData.length === 0) {
        return <div>No pie chart data available.</div>
    }

    return (
        <div className={st_styles.pieRow}>
            {pieData.map((entry, index) => {
                const total = entry.data.reduce((sum, item) => sum + item.value, 0)
                const isEmpty = total === 0
                const chartColors = isEmpty ? entry.data.map(() => '#b8b8b896') : CHART_COLORS

                return (
                    <div key={index} className={`${cd_styles.bubble} ${st_styles.pieBubble}`}>
                        <h3 className={cd_styles.thirdHeaderFormat}>{entry.camera}</h3>
                        <div className={st_styles.pieChartWrapper}>
                            <PieChart
                                data={entry.data}
                                config={{
                                    labelKey: 'label',
                                    valueKey: 'value',
                                    renderer: 'canvas',
                                    height: '100%',
                                    width: '100%',
                                    radius: ['35%', '65%'],
                                    innerLabel: true,
                                    legendPosition: 'bottom',
                                    colors: chartColors,
                                    itemStyle: {
                                        borderRadius: '10%',
                                        borderColor: 'transparent',
                                        borderWidth: '0.5'
                                    }
                                }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ============================================================================
 * usePieData Hook
 * ============================================================================
 */
function usePieData(range: TimeRange) {
    const [pieData, setPieData] = useState<PieChartResult[]>([])

    // Removed rangeRef.current = range from here

    const fetchPieData = async () => {
        try {
            const res = await fetch('/api/stats')
            const result: PieChartResult[] = await res.json()
            setPieData(result ?? [])
        } catch (err) {
            console.error('Fetch error:', err)
        }
    }

    useEffect(() => {
        fetchPieData()
        const interval = setInterval(fetchPieData, 5000)
        return () => clearInterval(interval)
        // range is a dependency; if it changes, we restart the interval
    }, [range]) 

    return pieData
}

/* ============================================================================
 * useCameraHistory Hook
 * ============================================================================
 */
function useCameraHistory(range: TimeRange, camera: CameraObject) {
    const [history, setHistory] = useState<HistoryDataPoint[]>([])

    // Removed ref assignments from the render path

    const fetchHistory = async () => {
        try {
            // Use range and camera directly from arguments instead of refs
            const res = await fetch(`/api/camera_history?range=${range}&camera=${camera}`)
            const result = await res.json()
            
            if (result && Array.isArray(result.history)) {
                setHistory(result.history)
            } else {
                console.warn('API returned no history:', result.error || 'Unknown error')
                setHistory([]) 
            }
        } catch (err) {
            console.error('History fetch error:', err)
            setHistory([]) 
        }
    }

    useEffect(() => {
        fetchHistory()
        const interval = setInterval(fetchHistory, 30000)
        return () => clearInterval(interval)
    }, [range, camera]) // Effect triggers whenever these change

    return history
}
/* ============================================================================
 * StatisticsPage Component
 * ============================================================================
 */
export default function StatisticsPage() {
    const [range, setRange] = useState<TimeRange>('live')
    const [camera, setCamera] = useState<CameraObject>('cam1')

    const pieData = usePieData(range)
    const history = useCameraHistory(range, camera)

    return (
        <>
            <SimplePieCharts pieData={pieData} />
            <TrafficChartTimeline
                history={history}
                range={range}
                camera={camera}
                setRange={setRange}
                setCamera={setCamera}
            />
        </>
    )
}