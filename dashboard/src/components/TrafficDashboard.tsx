'use client'

import React, { useState } from 'react'
import TrafficControls  from '@/components/traffic_controller'
import styles           from '@/styles/common_dashboard.module.css'
import StatisticsPage   from '@/components/statistics_page'
import {TimeRange } from '@/types/stats'


export default function TrafficDashboard() {
    const [range, setRange] = useState<TimeRange>('live');

    return (
        <div className={styles.layoutWrapper}>
            <aside className={styles.sidebar}>
                {/* Map is now "Stable" because this parent doesn't re-render on data fetch */}
                <TrafficControls 
                    range={range} 
                    setRange={setRange} 
                />
            </aside>

            <main className={styles.mainContent}>
                {/* Pass the range down; let this component handle its own data */}
                <StatisticsPage range={range} />
            </main>
        </div>
    )
}