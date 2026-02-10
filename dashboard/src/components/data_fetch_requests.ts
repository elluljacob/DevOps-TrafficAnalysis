import { PieChartStat, HistoryDataPoint, TimeRange, DashboardResponse } from "@/types/stats";
import { log, LogLevel } from "@/lib/logger"; 
import { connectToDatabase } from "@/lib/database";
import { TrafficStatModel } from "@/lib/models";

const labels = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'];

function generateMockHistory(range: TimeRange, fromDate?: string): HistoryDataPoint[] {
    const now = new Date();
    const data: HistoryDataPoint[] = [];
    let points = 60; // Default resolution
    let intervalMinutes = 1;

    // Determine density based on range
    switch (range) {
        case 'live': points = 30; intervalMinutes = 0.1; break; // Every 6 seconds
        case '1h': points = 60; intervalMinutes = 1; break;
        case '24h': points = 48; intervalMinutes = 30; break;
        case '7d': points = 84; intervalMinutes = 120; break;
        default: points = 50; intervalMinutes = 60;
    }

    // Determine start time
    let currentTime = fromDate ? new Date(fromDate).getTime() : now.getTime() - (points * intervalMinutes * 60 * 1000);

    for (let i = 0; i < points; i++) {
        const point: HistoryDataPoint = { 
            timestamp: new Date(currentTime).toISOString() 
        };
        
        // Generate pseudo-realistic trends using Sine waves + Random
        labels.forEach((label, idx) => {
            const noise = Math.random() * 20;
            const trend = Math.sin(i / 10 + idx) * 30 + 50; // Wavy pattern
            point[label] = Math.max(0, Math.floor(trend + noise));
        });

        data.push(point);
        currentTime += intervalMinutes * 60 * 1000;
    }
    return data;
}

function getMockData(range: TimeRange): DashboardResponse {
    const history = generateMockHistory(range);
    
    // Generate Pie stats from the *last* history point to keep them in sync
    const lastPoint = history[history.length - 1];
    const pie: PieChartStat[] = labels.map(label => ({
        label,
        value: Number(lastPoint[label]) || 0
    }));

    return { pie, history };
}

// Helper: Real DB Fetcher 
async function getRealData(range: TimeRange): Promise<DashboardResponse> {
    await connectToDatabase();
    
    // TODO: Implement Aggregation Pipeline based on 'range'
    // For now, returning Mock data structure to prevent crash until DB is populated
    return getMockData(range); 
}

// Main function to get stats
export async function getStats(range: TimeRange = '1h'): Promise<DashboardResponse> {
    const useMock = process.env.USE_MOCK_DATA === "true";
    log(`Fetching stats for range: ${range} (Mock: ${useMock})`, LogLevel.INFO);

    if (useMock) {
        return getMockData(range);
    } else {
        return await getRealData(range);
    }
}