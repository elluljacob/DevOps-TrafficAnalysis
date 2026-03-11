// SimplePieCharts.tsx
'use client'
import PieChart from '@/components/chart_generators/generate_piechart'
import st_styles from '@/styles/statistics.module.css'
import cd_styles from '@/styles/common_dashboard.module.css'
import { PieChartResult } from '@/types/stats'
import { VEHICLE_CONFIG } from './constants'
/* ============================================================================
 * SimplePieCharts Component (Fixed for Apache ECharts)
 * ============================================================================
 */
export function SimplePieCharts({
    pieData = []
}: {
    pieData?: PieChartResult[]
}) {
    return (
        <div className={st_styles.pieRow}>
            {pieData.map((entry) => {
                // 1. Check if the ENTIRE chart is empty
                const total = entry.data.reduce((sum, item) => sum + item.value, 0);
                const isEntirelyEmpty = total === 0;

                // 2. Generate colors slice-by-slice
                const dynamicColors = entry.data.map((item) => {
                    // If the whole chart is 0, or just THIS specific item is 0, make it gray
                    if (isEntirelyEmpty || item.value === 0) {
                        return '#b8b8b896'; // Semi-transparent gray
                    }
                    
                    // Otherwise, use the vehicle category color
                    const category = item.label as keyof typeof VEHICLE_CONFIG;
                    return VEHICLE_CONFIG[category]?.color || '#ccc';
                });

                return (
                    <div key={entry.stream} className={`${cd_styles.bubble} ${st_styles.pieBubble}`}>
                        <h3 className={cd_styles.thirdHeaderFormat}>
                            {entry.stream.toUpperCase()}
                        </h3>
                        
                        <div className={st_styles.pieChartWrapper}>
                            <PieChart
                                data={entry.data}
                                config={{
                                    labelKey: 'label',
                                    valueKey: 'value',
                                    renderer: 'canvas',
                                    height: '100%',
                                    width: '100%',
                                    radius: ['35%', '65%'],
                                    innerLabel: true,
                                    legendPosition: 'bottom',
                                    colors: dynamicColors, 
                                    itemStyle: {
                                        borderRadius: '10%',
                                        borderColor: 'transparent',
                                        borderWidth: '0.5'
                                    }
                                }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}