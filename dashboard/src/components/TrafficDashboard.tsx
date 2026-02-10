'use client'

import React, { useEffect, useState, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import { PieChartStat, HistoryDataPoint, TimeRange } from '@/types/stats'

type ChartType = 'pie' | 'line';

export default function TrafficDashboard() {
  // State
  const [data, setData] = useState<{ pie: PieChartStat[], history: HistoryDataPoint[] }>({ pie: [], history: [] })
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>('live')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [chartTitle, setChartTitle] = useState('Traffic Overview')

  // Refs for performance (avoid stale closures in intervals)
  const rangeRef = useRef(range);
  rangeRef.current = range;

  // Fetch Logic
  const fetchData = async () => {
    try {
      // Don't show loading spinner on background refreshes
      const res = await fetch(`/api/stats?range=${rangeRef.current}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      const result = await res.json()
      
      setData(result)
      setChartTitle(rangeRef.current === 'live' ? 'Live Traffic Feed' : `Historical Traffic (${rangeRef.current})`)
      setLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Effect: Initial Load & Interval
  useEffect(() => {
    setLoading(true);
    fetchData();

    // Only auto-refresh if we are in 'live' or '1h' mode
    // We don't want to poll heavy database queries for "Last Year" every 5 seconds
    let interval: NodeJS.Timeout | null = null;
    
    if (['live', '1h'].includes(range)) {
       interval = setInterval(fetchData, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    }
  }, [range])

  // --- CHART CONFIGURATIONS ---

  const getPieOption = () => ({
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%' },
    series: [{
      name: 'Traffic Source',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      data: data.pie.map(s => ({ value: s.value, name: s.label }))
    }]
  });

  const getLineOption = () => {
    const seriesList = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'].map(name => ({
      name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      areaStyle: { opacity: 0.1 },
      data: data.history.map(d => d[name] as number)
    }));

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.history.map(d => new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      },
      yAxis: { type: 'value' },
      series: seriesList
    };
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
      
      {/* --- Controls Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">{chartTitle}</h2>
        
        <div className="flex gap-2 flex-wrap justify-center">
          {/* Chart Type Toggle */}
          <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg flex">
            <button 
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${chartType === 'line' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-zinc-500'}`}
            >
              Timeline
            </button>
            <button 
              onClick={() => setChartType('pie')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${chartType === 'pie' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-zinc-500'}`}
            >
              Distribution
            </button>
          </div>

          {/* Time Range Select */}
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value as TimeRange)}
            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-3 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value="live">Live (5m)</option>
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last Month</option>
            <option value="1y">Last Year</option>
          </select>
          
          {/* Date Picker Placeholder (HTML native) */}
          <input 
            type="date" 
            className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-3 py-1 text-sm font-medium"
            onChange={(e) => console.log("Date selected:", e.target.value)}
          />
        </div>
      </div>

      {/* --- Chart Area --- */}
      <div className="h-[400px] w-full flex items-center justify-center">
        {loading && data.history.length === 0 ? (
           <div className="animate-pulse flex flex-col items-center">
             <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded mb-4"></div>
             <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-800 rounded"></div>
           </div>
        ) : (
          <ReactECharts 
            option={chartType === 'pie' ? getPieOption() : getLineOption()} 
            style={{ height: '100%', width: '100%' }}
            notMerge={true} // Important for clean updates
          />
        )}
      </div>
      
      <div className="mt-4 text-xs text-center text-zinc-400">
        Data updates automatically for Live/1h views.
      </div>
    </div>
  )
}