'use client'

import React, { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { PieChartStat } from '@/types/stats'

export default function EChartsPieChart() {
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
    const interval = setInterval(fetchData, 5000) // refresh every 5s
    return () => clearInterval(interval)
  }, [])

  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: 0,
    },
    series: [
      {
        name: 'Statistics',
        type: 'pie',
        radius: '50%',
        data: stats.map(s => ({ value: s.value, name: s.label })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0,0,0,0.5)',
          },
        },
      },
    ],
  }

  return <ReactECharts option={option} style={{ height: 300, width: 300 }} />
}
