// TrafficChartTimeline.tsx
'use client'
import LineChart            from '@/components/chart_generators/generate_linechart'
import st_styles            from '@/styles/statistics.module.css'
import cd_styles            from '@/styles/common_dashboard.module.css'
import ft_styles            from '@/styles/filter.module.css'
import { useStreams }       from '@/components/global/stream_list'
import SearchableSelect     from '@/components/filters/searchable_dropdown'
import SelectDropdown       from '@/components/filters/simple_drop_down'
import { 
    HistoryDataPoint, 
    TimeRange }             from '@/types/stats'
import { 
    VEHICLE_CATEGORIES, 
    VEHICLE_CONFIG, 
    TIME_RANGE_OPTIONS }    from './constants'

interface TimelineProps {
    history: HistoryDataPoint[];
    range: TimeRange;
    stream: string;
    setRange: (val: TimeRange) => void;
    setStream: (val: string) => void;
}
export default function TrafficChartTimeline({ history, range, stream, setRange, setStream }: TimelineProps) {
    const { streams } = useStreams();

    const dynamicCameraOptions = Object.values(streams)
        .filter(s => s.selected)
        .map(s => ({ label: s.ID || `Camera ${s.ID}`, value: s.ID }));

    const timelineColors = VEHICLE_CATEGORIES.map(cat => VEHICLE_CONFIG[cat].color);

    // Context-aware date formatter
    const formatXAxis = (val: string | number) => {
        const date = new Date(val);
        
        // For 24h or 7d, we definitely need the date to avoid confusion
        if (range === '7d' || range === '24h') {
            return date.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric' 
            }) + ' ' + date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        // Live view includes seconds
        if (range === 'live') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        // Default (1h): Just the time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`${cd_styles.bubble} ${cd_styles.fullWidth} ${st_styles.timeBubble}`}>
            <div className={st_styles.timeStatusBar}>
                <h3 className={cd_styles.thirdHeaderFormat}>Real-time Telemetry</h3>
                <div className={ft_styles.filterGroup}>
                    <SearchableSelect value={stream} setValue={setStream} options={dynamicCameraOptions} placeholder="Select Camera..." />
                    <SelectDropdown value={range} setValue={setRange} options={TIME_RANGE_OPTIONS} placeholder="Time Range ..." />
                </div>
            </div>

            <div className={st_styles.timeline}>
                {dynamicCameraOptions.length > 0 ? (
                    <LineChart
                        data={history}
                        config={{
                            xKey: 'timestamp',
                            series: VEHICLE_CATEGORIES as any,
                            colors: timelineColors,
                            height: '100%',
                            width: '100%',
                            legendPosition: 'top',
                            xAxisFormatter: formatXAxis,
                            // Angled labels for 24h and 7d because they are longer strings
                            xAxisRotate: (range === '24h' || range === '7d') ? 35 : 0,
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 italic">
                        No active cameras selected.
                    </div>
                )}
            </div>
        </div>
    )
}