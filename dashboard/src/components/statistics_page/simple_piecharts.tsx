// SimplePieCharts.tsx
'use client'
import PieChart          from '@/components/chart_generators/generate_piechart'
import SelectDropdown    from '@/components/filters/simple_drop_down'
import st_styles         from '@/styles/statistics.module.css'
import cd_styles         from '@/styles/common_dashboard.module.css'
import ft_styles         from '@/styles/filter.module.css'
import { PieChartResult, TimeRange } from '@/types/stats'
import { VEHICLE_CONFIG, TIME_RANGE_PIECHARTS } from './constants'

/* ============================================================================
 * SimplePieCharts Component
 * ============================================================================
 */
interface SimplePieChartsProps {
    pieData?: PieChartResult[];
    range: TimeRange;
    setRange: (val: TimeRange) => void;
}

export function SimplePieCharts({
    pieData = [],
    range,
    setRange
}: SimplePieChartsProps) {
    return (
        <div className={`${cd_styles.bubble} ${cd_styles.fullWidth} ${st_styles.timeBubble}`}>
            {/* Header section with Title and Range Dropdown */}
            <div className={st_styles.timeStatusBar}>
                <h3 className={cd_styles.thirdHeaderFormat}>Piecharts</h3>
                <div className={ft_styles.filterGroup}>
                    <SelectDropdown 
                        value={range} 
                        setValue={setRange} 
                        options={TIME_RANGE_PIECHARTS} 
                        placeholder="Time Range ..." 
                    />
                </div>
            </div>

            {/* Grid/Row of individual pie charts */}
            <div className={st_styles.pieRow}>
                {pieData.map((entry) => {
                    const total = entry.data.reduce((sum, item) => sum + item.value, 0);
                    const isEntirelyEmpty = total === 0;

                    const dynamicColors = entry.data.map((item) => {
                        if (isEntirelyEmpty || item.value === 0) {
                            return '#b8b8b896'; 
                        }
                        const category = item.label as keyof typeof VEHICLE_CONFIG;
                        return VEHICLE_CONFIG[category]?.color || '#ccc';
                    });

                    return (
                        <div key={entry.stream} className={cd_styles.indentedBubble}>
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
                    );
                })}
            </div>
        </div>
    )
}