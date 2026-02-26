'use client'
import React, { useEffect, useState, useRef } from 'react'
import PieChart     from '@/components/chart_generators/generate_piechart'
import LineChart    from '@/components/chart_generators/generate_linechart'
import st_styles    from '@/styles/statistics.module.css'
import cd_styles    from '@/styles/common_dashboard.module.css'
import { PieChartStat, HistoryDataPoint, TimeRange } from '@/types/stats'

/* ============================================================================
 * TrafficChartTimeline Component
 * ----------------------------------------------------------------------------
 * Renders a full-width line chart showing historical telemetry data points
 * formatted for time-series visualization.
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
    '#3b82f6',    '#10b981',
    '#f59e0b',    '#ef4444',
    '#8b5cf6'
]

/* ============================================================================
 * TrafficChartTimeline Component
 * ----------------------------------------------------------------------------
 * Renders a full-width line chart showing historical telemetry data points
 * formatted for time-series visualization.
 * ============================================================================
 */
function TrafficChartTimeline({
    history
}: {
    history: HistoryDataPoint[]
}) {
    return (
        <div className={`${cd_styles.bubble} ${cd_styles.fullWidth}`}>
            <h3 className={cd_styles.thirdHeaderFormat}>
                Real-time Telemetry
            </h3>

            <div className="h-[450px]">
                <LineChart
                    data={history}
                    config={{
                        xKey            : 'timestamp',
                        series          : VEHICLE_CATEGORIES as any,
                        colors          : CHART_COLORS,
                        height          : '100%',
                        width           : '100%',
                        legendPosition  : 'top',
                        renderer        : 'canvas',
                        xAxisFormatter: (val) =>
                            new Date(val).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                            )
                    }}
                />
            </div>
        </div>
    )
}

/* ============================================================================
 * SimplePieCharts Component
 * ----------------------------------------------------------------------------
 * Maps and renders multiple pie charts in a row, used for showing 
 * distribution data across different zones.
 * ============================================================================
 */
function SimplePieCharts({ pieCharts }: { pieCharts: PieChartStat[][] }) {
    return (
        <div className={st_styles.pieRow}>
            {pieCharts.map((pie, index) => (
                <div
                    key={index}
                    className={`${cd_styles.bubble} ${st_styles.pieBubble}`}
                >
                    <h3 className={cd_styles.thirdHeaderFormat}>
                        Zone Data Alpha-{index + 1}
                    </h3>

                    <div className={st_styles.pieChartWrapper}>
                        <PieChart
                            data={pie}
                            config={{
                                labelKey       : 'label',
                                valueKey       : 'value',
                                renderer       : 'canvas',
                                height         : '100%',
                                width          : '100%',
                                radius         : ['35%', '65%'],
                                innerLabel     : true,
                                legendPosition : 'bottom',
                                colors         : CHART_COLORS,
                                itemStyle      : {
                                    borderRadius : '0.5rem',
                                    borderColor  : 'transparent',
                                    borderWidth  : '0.125rem'
                                }
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}
/* ============================================================================
 * useTrafficData Hook
 * ----------------------------------------------------------------------------
 * Manages the data-fetching lifecycle. Handles the 5-second polling interval
 * and re-syncs fetching logic when the time range prop changes.
 * ============================================================================
 */
function useTrafficData(range: TimeRange) {
    const [data, setData] = useState<{ pie: PieChartStat[], history: HistoryDataPoint[] }>({ 
        pie: [], 
        history: [] 
    });

    const rangeRef = useRef(range);
    rangeRef.current = range;

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/stats?range=${rangeRef.current}`);
            const result = await res.json();
            setData(result);
        } catch (err) { 
            console.error("Fetch error:", err); 
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [range]);

    return data;
}

/* ============================================================================
 * StatisticsPage Component
 * ----------------------------------------------------------------------------
 * The primary wrapper for the statistics dashboard content. Isolates state 
 * updates for telemetry data to prevent re-renders in parent layouts.
 * ============================================================================
 */
interface Props {
    range: TimeRange; // This is the only prop the parent passes now
}

export default function StatisticsPage({ range }: Props) {
    // One line handles all the logic!
    const { pie, history } = useTrafficData(range);

    return (
        <>
            <SimplePieCharts pieCharts={[pie, pie]} />
            <TrafficChartTimeline history={history} />
        </>
    );
}