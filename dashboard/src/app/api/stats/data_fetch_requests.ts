import { PieChartStat, HistoryDataPoint, TimeRange, DashboardResponse } from "@/types/stats";
import { log, LogLevel } from "@/lib/logger"; 
import { connectToDatabase } from "@/lib/database"

/* ============================================================================
 * Traffic Categories
 * ----------------------------------------------------------------------------
 * Defined labels used for both Pie Chart segments and History Data keys
 * ============================================================================
 */
const labels = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'];

/* ============================================================================
 * Mock History Generator
 * ----------------------------------------------------------------------------
 * Creates synthetic traffic data using Sine waves and random noise.
 * Adjusts data density (points/frequency) based on the requested TimeRange.
 * ============================================================================
 */
function generateMockHistory(range: TimeRange, fromDate?: string): HistoryDataPoint[] {
    const now           = new Date();
    const data: HistoryDataPoint[] = [];
    let points          = 60; 
    let intervalMinutes = 1;

    switch (range) {
        case 'live' : points = 30; intervalMinutes = 0.1; break; 
        case '1h'   : points = 60; intervalMinutes = 1  ; break;
        case '24h'  : points = 48; intervalMinutes = 30 ; break;
        case '7d'   : points = 84; intervalMinutes = 120; break;
        default     : points = 50; intervalMinutes = 60 ;
    }

    let currentTime = fromDate ? new Date(fromDate).getTime() : now.getTime() - (points * intervalMinutes * 60 * 1000);

    for (let i = 0; i < points; i++) {
        const point: HistoryDataPoint = { 
            timestamp: new Date(currentTime).toISOString() 
        };
        
        labels.forEach((label, idx) => {
            const noise     = Math.random() * 20;
            const trend     = Math.sin  (i / 10 + idx) * 30 + 50; 
            point[label]    = Math.max  (0, Math.floor(trend + noise));
        });

        data.push(point);
        currentTime += intervalMinutes * 60 * 1000;
    }
    return data;
}

/* ============================================================================
 * Mock Data Assembler
 * ----------------------------------------------------------------------------
 * Combines history and pie chart data into a single DashboardResponse.
 * Ensures the Pie Chart reflects the most recent point in the history array.
 * ============================================================================
 */
function getMockData(range: TimeRange): DashboardResponse {
    const history = generateMockHistory(range);
    const lastPoint = history[history.length - 1];
    
    const pie: PieChartStat[] = labels.map(label => ({
        label,
        value: Number(lastPoint[label]) || 0
    }));

    return { pie, history };
}

/* ============================================================================
 * Production Database Fetcher
 * ----------------------------------------------------------------------------
 * Connects to MongoDB and aggregates real traffic data. Currently defaults
 * to mock data as a fallback until the aggregation pipeline is implemented.
 * ============================================================================
 */
async function getRealData(range: TimeRange): Promise<DashboardResponse> {
    await connectToDatabase();
    // TODO: Implement Aggregation Pipeline based on 'range'
    return getMockData(range); 
}

/* ============================================================================
 * Main Stats API Entry Point
 * ----------------------------------------------------------------------------
 * Determines whether to serve Mock or Real data based on the 
 * USE_MOCK_DATA environment variable.
 * ============================================================================
 */
export async function getStats(range: TimeRange = '1h'): Promise<DashboardResponse> {
    const useMock = process.env.USE_MOCK_DATA === "true";
    log(`Fetching stats for range: ${range} (Mock: ${useMock})`, LogLevel.INFO);

    if (useMock) {
        return getMockData(range);
    } else {
        return await getRealData(range);
    }
}