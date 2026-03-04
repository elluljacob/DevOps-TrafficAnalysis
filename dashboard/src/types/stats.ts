
/* ============================================================================
 *  Pie chart object for statistics
 * ----------------------------------------------------------------------------
 * Some format for a pie chart statistic
 * ============================================================================
 */
export type PieChartStat = {
  label: string
  value: number
}
export type TrafficEntry = {
  camera: string
  data : PieChartStat[]
}


export interface HistoryDataPoint {
  timestamp: string; // ISO string
  [key: string]: number | string; // Dynamic keys like 'Cars': 10, 'Bikes': 5
}

export interface DashboardResponse {
  traffic_entry: TrafficEntry[];
  history: HistoryDataPoint[];
}

export type TimeRange = 'live' | '1h' | '24h' | '7d' | '30d' | '1y';