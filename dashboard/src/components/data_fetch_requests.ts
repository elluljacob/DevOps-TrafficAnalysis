import { PieChartStat } from "@/types/stats";
import { log, LogLevel } from "@/lib/logger"; 
import { connectToDatabase } from "@/lib/database";
import { TrafficStatModel } from "@/lib/models";

const labels = ['Cars', 'Bikes', 'Buses', 'Trucks', 'Pedestrians'];

// Helper: Mock Data Generator
function getMockData(): PieChartStat[] {
    log("Generating MOCK pie chart Statistics", LogLevel.INFO);
    return labels.map(label => ({
        label,
        value: Math.floor(Math.random() * 100) + 1,
    }));
}

// Helper: Real DB Fetcher 
async function getRealData(): Promise<PieChartStat[]> {
    log("Fetching REAL pie chart Statistics from Mongo", LogLevel.INFO);
    await connectToDatabase();
    
    // Example aggregation: Sum values by label
    const results = await TrafficStatModel.find({});
    
    // If DB is empty, this returns empty
    return results.map(doc => ({
        label: doc.label,
        value: doc.value
    }));
}

// Main function to get stats
export async function getStats(): Promise<PieChartStat[]> {
    // The Flag Check
    const useMock = process.env.USE_MOCK_DATA === "true";

    if (useMock) {
        return getMockData();
    } else {
        return await getRealData();
    }
}