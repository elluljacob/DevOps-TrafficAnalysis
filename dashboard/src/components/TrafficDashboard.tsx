'use client'

import React, { useEffect, useState, useRef } from 'react'
import PieChart from '@/components/chart_generators/generate_piechart'
import LineChart from '@/components/chart_generators/generate_linechart'
import TrafficControls from '@/components/traffic_controller'
import styles from '@/styles/common_dashboard.module.css'
import { PieChartStat, HistoryDataPoint, TimeRange } from '@/types/stats'
import StatisticsPage from '@/components/statistics_page'


export default function TrafficDashboard() {
    const [data, setData] = useState<{ pie: PieChartStat[], history: HistoryDataPoint[] }>({ pie: [], history: [] })
    const [range, setRange] = useState<TimeRange>('live')
    const rangeRef = useRef(range)
    rangeRef.current = range

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/stats?range=${rangeRef.current}`)
            const result = await res.json()
            setData(result)
        } catch (err) { console.error(err) }
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [range])

    return (
        <div className={styles.layoutWrapper}>
            {/* --- Left Column (30%) --- */}
            <aside className={styles.sidebar}>
                <TrafficControls 
                    range={range} 
                    setRange={setRange} 
                />
            </aside>

            {/* --- Right Column (70%) --- */}
            <main className={styles.mainContent}>
                <StatisticsPage
                    pie={data.pie}
                    history={data.history}
                />
            </main>
        </div>
    )
}