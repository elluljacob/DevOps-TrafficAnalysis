'use client'

import PieChart     from '@/components/chart_generators/generate_piechart'
import LineChart    from '@/components/chart_generators/generate_linechart'
import st_styles    from '@/styles/statistics.module.css'
import cd_styles    from '@/styles/common_dashboard.module.css'
import { PieChartStat, HistoryDataPoint } from '@/types/stats'

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
    '#3b82f6',    '#10b981',
    '#f59e0b',    '#ef4444',
    '#8b5cf6'
]

/* ============================================================================
 * Timeline Chart
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
 * Pie Charts
 * ============================================================================
 */
function SimplePieCharts({ pie }: { pie: PieChartStat[] }) {
    return (
        <div className={st_styles.pieRow}>
            {[1, 2].map((id) => (
                <div key={id} className={`${cd_styles.bubble} ${st_styles.pieBubble}`}>
                    <h3 className={cd_styles.thirdHeaderFormat}>
                        Zone Data Alpha-{id}
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
 * Statistics Page Wrapper
 * ============================================================================
 */
interface Props {
    pie: PieChartStat[]
    history: HistoryDataPoint[]
}

export default function StatisticsPage({
    pie,
    history
}: Props) {
    return (
        <>
            <SimplePieCharts pie={pie} />
            <TrafficChartTimeline history={history} />
        </>
    )
}