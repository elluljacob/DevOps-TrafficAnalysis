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
    xAxisRotate     ?: number 
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
        xAxisFormatter,
        xAxisRotate = 0
    } = config;

    return {
        color: colors,
        tooltip: { 
            trigger: 'axis',
            backgroundColor: '#18181b',
            borderColor: '#3f3f46',
            textStyle: { color: '#ffffff', fontFamily: 'Cascadia Mono' }
        },
        legend: {
            show: true,
            [legendPosition]: 10,
            data: series.map(s => String(s)),
            textStyle: { fontFamily: 'Cascadia Mono', color: '#ffffff' }
        },
        grid: { 
            left: '2%', 
            right: '2%', 
            bottom: '2%', // Tightened: containLabel handles the rest
            top: legendPosition === 'top' ? 70 : 20,
            containLabel: true 
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(item => {
                const val = item[xKey];
                return xAxisFormatter ? xAxisFormatter(val) : String(val);
            }),
            axisLabel: { 
                color: '#a1a1aa', 
                fontFamily: 'Cascadia Mono',
                rotate: xAxisRotate,
                interval: 'auto',
                fontSize: 11,
                margin: 12
            },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: '#3f3f46' } }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#a1a1aa', fontFamily: 'Cascadia Mono', fontSize: 11 },
            splitLine: { lineStyle: { color: '#27272a' } }
        },
        series: buildSeries(data, config)
    };
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
                devicePixelRatio: 
                    typeof window !== 'undefined' ? 
                        window.devicePixelRatio : 1 
            }}
        />
    );
}