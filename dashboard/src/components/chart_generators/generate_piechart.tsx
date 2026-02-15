'use client'

import ReactECharts from 'echarts-for-react'


/* ============================================================================
 * Pie Chart Configuration Interface
 * ----------------------------------------------------------------------------
 * labelKey      → Object property used as slice label
 * valueKey      → Object property used as slice numeric value
 * renderer      → Choose between 'svg' or 'canvas'
 * radius        → Inner/outer radius (e.g., '50%' or ['40%', '70%'])
 * ============================================================================
 */
export interface PieChartConfig<T = any> {
    labelKey        : keyof T
    valueKey        : keyof T
    renderer        ?: 'svg' | 'canvas'
    colors          ?: string[]
    legendPosition  ?: 'top' | 'bottom' | 'left' | 'right'
    height          ?: number | string
    width           ?: number | string
    radius          ?: string | string[]
    innerLabel      ?: boolean
    itemStyle       ?: any
}

interface PieChartProps<T> {
    data: T[]
    config: PieChartConfig<T>
}

/* ============================================================================
 * Internal Logic: Label & Emphasis Configurator
 * ----------------------------------------------------------------------------
 * Handles the logic for center-aligned "Donut" labels vs standard labels.
 * ============================================================================
 */
function getLabelConfig(innerLabel: boolean) {
    const baseStyle = { 
        fontFamily  : 'Cascadia Mono', 
        color       : '#ffffff' 
    };

    if (!innerLabel) {
        return {
            label       : baseStyle,
            emphasis    : { label: baseStyle }
        };
    }

    return {
        label: { ...baseStyle, show: false, position: 'center' },
        emphasis: {
            label: { 
                ...baseStyle, 
                show        : true, 
                fontSize    : 20, 
                fontWeight  : 'bold' 
            }
        }
    };
}

/* ============================================================================
 * Internal Logic: ECharts Option Builder
 * ----------------------------------------------------------------------------
 * Transforms raw data and config into a valid ECharts option object.
 * ============================================================================
 */
function buildChartOption<T>(data: T[], config: PieChartConfig<T>) {
    const {
        labelKey,
        valueKey,
        colors,
        legendPosition  = 'bottom',
        radius          = '50%',
        innerLabel      = false,
        itemStyle       = {}
    } = config;

    const { label, emphasis } = getLabelConfig(innerLabel);

    const option: any = {
        tooltip: { trigger: 'item' },
        legend: {
            [legendPosition]: 0,
            textStyle: { fontFamily: 'Cascadia Mono', color: '#ffffff' }
        },
        series: [{
            type    : 'pie',
            radius,
            itemStyle,
            label,
            emphasis,
            data: data.map(item => ({
                name    : String(item[labelKey]),
                value   : Number(item[valueKey])
            }))
        }]
    };

    if (colors?.length) {
        option.color = colors;
    }

    return option;
}

/* ============================================================================
 * Reusable Pie Chart Component
 * ----------------------------------------------------------------------------
 * A generic, type-safe wrapper for ECharts.
 * Supports SVG/Canvas switching and automated field mapping.
 * ============================================================================
 */
export default function PieChart<T>({ data, config }: PieChartProps<T>) {
    const { 
        height      = 300, 
        width       = 300, 
        renderer    = 'canvas' 
    } = config;

    const option = buildChartOption(data, config);

    return (
        <ReactECharts
            option  ={option}
            style   ={{ height, width }}
            opts    ={{ 
                renderer, 
                devicePixelRatio: typeof window !== 'undefined' 
                    ? window.devicePixelRatio 
                    : 1 
            }}
        />
    );
}