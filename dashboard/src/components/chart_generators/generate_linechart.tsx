'use client'

import ReactECharts from 'echarts-for-react'

/* ============================================================================
 * Line Chart Configuration Interface
 * ----------------------------------------------------------------------------
 * xKey           → Property for the X-axis (timestamp or category)
 * series         → Array of properties to plot as individual lines
 * legendPosition → Position of the legend (default: 'top')
 * renderer       → Choose between 'svg' or 'canvas'
 * ============================================================================
 */
export interface LineChartConfig<T = any> {
    xKey            : keyof T
    series          : (keyof T)[]
    colors          ?: string[]
    smooth          ?: boolean
    showArea        ?: boolean
    renderer        ?: 'svg' | 'canvas'
    legendPosition  ?: 'top' | 'bottom' | 'left' | 'right'
    height          ?: number | string
    width           ?: number | string
    xAxisFormatter  ?: (value: any) => string
}

interface LineChartProps<T> {
    data: T[]
    config: LineChartConfig<T>
}

/* ============================================================================
 * Internal Logic: Series Builder
 * ----------------------------------------------------------------------------
 * Maps the raw data array into multiple ECharts line series objects.
 * ============================================================================
 */
function buildSeries<T>(data: T[], config: LineChartConfig<T>) {
    const { series, smooth = true, showArea = true } = config;

    return series.map(key => ({
        name: String(key),
        type: 'line',
        smooth,
        showSymbol: false,
        areaStyle: showArea ? { opacity: 0.1 } : undefined,
        data: data.map(item => Number(item[key]))
    }));
}

/* ============================================================================
 * Internal Logic: ECharts Option Builder
 * ----------------------------------------------------------------------------
 * Configures the axes, grid, and tooltip styling for the line chart.
 * ============================================================================
 */
function buildChartOption<T>(data: T[], config: LineChartConfig<T>) {
    const {
        xKey,
        series,
        colors,
        legendPosition = 'top',
        xAxisFormatter
    } = config;

    const option: any = {
        tooltip: { 
            trigger: 'axis',
            backgroundColor: '#18181b',
            borderColor: '#3f3f46',
            textStyle: { color: '#ffffff', fontFamily: 'Cascadia Mono' }
        },
        legend: {
            show: true,
            [legendPosition]: 0,
            data: series.map(s => String(s)),
            textStyle: { fontFamily: 'Cascadia Mono', color: '#ffffff' }
        },
        grid: { 
            left: '3%', 
            right: '4%', 
            bottom: '3%', 
            // Adjust top margin if legend is at the top to prevent overlap
            top: legendPosition === 'top' ? 40 : 10,
            containLabel: true 
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(item => {
                const val = item[xKey];
                return xAxisFormatter ? xAxisFormatter(val) : String(val);
            }),
            axisLabel: { color: '#a1a1aa', fontFamily: 'Cascadia Mono' }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#a1a1aa', fontFamily: 'Cascadia Mono' },
            splitLine: { lineStyle: { color: '#27272a' } }
        },
        series: buildSeries(data, config)
    };

    if (colors?.length) option.color = colors;

    return option;
}

/* ============================================================================
 * Reusable Line Chart Component
 * ----------------------------------------------------------------------------
 * A robust wrapper for multi-series time-series or categorical data.
 * ============================================================================
 */
export default function LineChart<T>({ data, config }: LineChartProps<T>) {
    const { 
        height = 400, 
        width = '100%', 
        renderer = 'canvas' 
    } = config;

    const option = buildChartOption(data, config);

    return (
        <ReactECharts
            option={option}
            style={{ height, width }}
            notMerge={true}
            opts={{ 
                renderer, 
                devicePixelRatio: typeof window !== 'undefined' 
                    ? window.devicePixelRatio 
                    : 1 
            }}
        />
    );
}