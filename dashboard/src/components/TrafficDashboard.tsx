'use client'

import React, { useEffect, useState, useRef } from 'react'
import PieChart from '@/components/chart_generators/generate_piechart'
import LineChart from '@/components/chart_generators/generate_linechart'
import TrafficControls from '@/components/traffic_controller'
import styles from '@/styles/dashboard.module.css'
import { PieChartStat, HistoryDataPoint, TimeRange } from '@/types/stats'

const VEHICLE_CATEGORIES = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
                <div className={styles.bubble}>
                    <h2 className="text-2xl font-bold mb-6 dark:text-white">Control Center</h2>
                    <TrafficControls 
                        range={range} 
                        setRange={setRange} 
                    />
                </div>
                
                {/* Secondary Bubble for stats or system info */}
                <div className={`${styles.bubble} mt-8 flex-grow`}>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-tighter mb-4">Node Status</h3>
                    <div className="space-y-4">
                        <StatusItem label="API Latency" value="24ms" color="text-green-500" />
                        <StatusItem label="Active Sensors" value="142" color="text-blue-500" />
                        <StatusItem label="Uptime" value="99.9%" color="text-green-500" />
                    </div>
                </div>
            </aside>

            {/* --- Right Column (70%) --- */}
            <main className={styles.mainContent}>
                <div className={styles.dashboardGrid}>
                    
                    {/* Top Row: 4 Pie Charts (2x2 Grid) */}
                    {[1, 2].map((id) => (
                        <div key={id} className={styles.bubble}>
                            <h3 className="text-sm font-bold text-zinc-500 mb-4">Zone Data Alpha-{id}</h3>
                            <div className="h-[365px]">
                                <PieChart
                                    data={data.pie}
                                    config={{
                                        labelKey    : 'label',
                                        valueKey    : 'value',
                                        renderer    : 'canvas',
                                        height      : '100%',
                                        width       : '100%',
                                        radius      : ['35%', '65%'], // Reduced slightly for top legend
                                        innerLabel  : true,
                                        legendPosition: 'bottom' ,
                                        colors      : CHART_COLORS,
                                        itemStyle: { 
                                            borderRadius: 8, 
                                            borderColor: 'transparent', 
                                            borderWidth: 2 
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Bottom Row: Wide Timeline */}
                    <div className={`${styles.bubble} ${styles.fullWidth}`}>
                        <h3 className="text-lg font-bold mb-6 dark:text-white">Real-time Telemetry</h3>
                        <div className="h-[450px]">
                            <LineChart
                                data={data.history}
                                config={{
                                    xKey: 'timestamp',
                                    series: VEHICLE_CATEGORIES as any,
                                    colors: CHART_COLORS,
                                    height: '100%',
                                    width: '100%',
                                    legendPosition: 'top',
                                    renderer: 'canvas',
                                    xAxisFormatter: (val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatusItem({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <span className="text-sm text-zinc-500">{label}</span>
            <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
        </div>
    )
}