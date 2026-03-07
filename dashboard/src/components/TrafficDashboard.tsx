'use client'

import React, { useState, useEffect, useRef } from 'react'
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
    // 1. Define your real pages here
    const realPages = [
        { id: 'stats', component: <StatisticsPage /> },
        { id: 'admin', component: <AdminPage /> }
    ];

    // 2. Create the "Sandwich" for infinite looping
    // Layout: [Last Page Clone, Page 1, Page 2, Page 1 Clone]
    const displayPages = [
        realPages[realPages.length - 1], 
        ...realPages, 
        realPages[0]
    ];

    const [index, setIndex] = useState(1); // Start at 1 (the first real page)
    const [isTransitioning, setIsTransitioning] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const next = () => {
        if (timeoutRef.current) return; // Prevent double-clicking during jump
        setIsTransitioning(true);
        setIndex((prev) => prev + 1);
    };

    const prev = () => {
        if (timeoutRef.current) return; 
        setIsTransitioning(true);
        setIndex((prev) => prev - 1);
    };

    useEffect(() => {
        // If we land on the "Clone" at the end (Page 1 Clone)
        if (index === displayPages.length - 1) {
            timeoutRef.current = setTimeout(() => {
                setIsTransitioning(false);
                setIndex(1); // Snap back to real Page 1
                timeoutRef.current = null;
            }, 500); // Must match CSS transition time
        }

        // If we land on the "Clone" at the start (Last Page Clone)
        if (index === 0) {
            timeoutRef.current = setTimeout(() => {
                setIsTransitioning(false);
                setIndex(displayPages.length - 2); // Snap to the real Last Page
                timeoutRef.current = null;
            }, 500);
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [index, displayPages.length]);

    return (
        <div className={styles.layoutWrapper}>
            <aside className={styles.sidebar}>
                <TrafficControls />
            </aside>

            {/* Main acts as the 'Window' */}
            <main className="relative flex-1 h-full overflow-hidden ">
                
                {/* Navigation - Absolute so they stay pinned while pages slide */}
                <button 
                    className="absolute left-4 top-1/2 z-30 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                    onClick={prev}
                >
                    <ChevronLeft />
                </button>
                
                <button 
                    className="absolute right-4 top-1/2 z-30 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                    onClick={next}
                >
                    <ChevronRight />
                </button>

                {/* The Sliding Track */}
                <div 
                    className="flex h-full w-full"
                    style={{ 
                        transform: `translateX(-${index * 100}%)`,
                        transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none'
                    }}
                >
                    {displayPages.map((page, i) => (
                        <div 
                            key={`${page.id}-${i}`} 
                            className="w-full h-full flex-shrink-0 overflow-auto"
                        >
                            {page.component}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}