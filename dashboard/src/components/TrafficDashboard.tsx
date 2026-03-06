'use client'

import React, { useState } from 'react'
import styles from '@/styles/common_dashboard.module.css'
import TrafficControls from '@/components/traffic_controller'
import StatisticsPage from '@/components/statistics_page'
import AdminPage from '@/components/admin_page'

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <polyline points="15 6 9 12 15 18" stroke="white" strokeWidth="2" fill="none" />
  </svg>
)

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <polyline points="9 6 15 12 9 18" stroke="white" strokeWidth="2" fill="none" />
  </svg>
)

export default function SwappableDashboard() {
    const [activePage, setActivePage] = useState<'statistics' | 'admin'>('statistics')
    const [hovering, setHovering] = useState(false)

    const swapLeft = () => setActivePage('statistics')
    const swapRight = () => setActivePage('admin')

    return (
        <div className={styles.layoutWrapper}>
            
            {/* Sidebar / Controls always visible */}
            <aside className={styles.sidebar}>
                <TrafficControls />
            </aside>

            {/* Main content area with swappable pages */}
            <main
                className={styles.mainContent}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
            >
                {/* Floating arrows */}
                {hovering && activePage !== 'statistics' && (
                    <button className={styles.navArrowLeft} onClick={swapLeft}>
                        <ChevronLeft />
                    </button>
                )}
                {hovering && activePage !== 'admin' && (
                    <button className={styles.navArrowRight} onClick={swapRight}>
                        <ChevronRight />
                    </button>
                )}

                {/* Page container */}
                <div className={styles.pageContainer}>
                    {activePage === 'statistics' && <StatisticsPage />}
                    {activePage === 'admin' && <AdminPage />}
                </div>
            </main>
        </div>
    )
}