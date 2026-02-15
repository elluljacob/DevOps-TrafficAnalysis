'use client'

import React, { useEffect, useState } from 'react'
import PieChart from '@/components/chart_generators/generate_piechart'
import { PieChartStat } from '@/types/stats'

export default function DashboardPieChart() {
    const [stats, setStats] = useState<PieChartStat[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/stats')
                if (!res.ok) throw new Error('Failed to fetch stats')
                const data: PieChartStat[] = await res.json()
                setStats(data)
            } catch (err) {
                console.error(err)
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <PieChart
            data={stats}
            config={{
                labelKey: 'label',
                valueKey: 'value',
                colors: ['#3b82f6', '#b9a010', '#f50b0b', '#f50b0b', '#f50b0b' ], // optional
                legendPosition: 'bottom',
                height: 300,
                width: 300
            }}
        />
    )
}
