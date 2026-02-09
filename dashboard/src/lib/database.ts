import { PieChartStat } from "@/types/stats"
import { log, LogLevel} from "./logger"




/* ============================================================================
 *  Get Stats
 * ----------------------------------------------------------------------------
 * Stupid function to generate random values from 1 - 100 for the given label
 * ============================================================================
 */

const labels = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians']

export function getStats(): PieChartStat[] {
    log("Generating pie chart Statistics", LogLevel.INFO)
    return labels.map(label => ({
        label,
        value: Math.floor(Math.random() * 100) + 1, // random 1–100
    }))
}