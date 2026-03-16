import { NextResponse, NextRequest } from 'next/server'
import { PieChartResult, TimeRange } from '@/types/stats'
import { aggregateCameraData } from '@/app/api/stats/testing_db'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const idsString = searchParams.get('ids');
        const range = (searchParams.get('range') as TimeRange) || 'live';
        
        const cameraIds = idsString ? idsString.split(',') : [];

        if (cameraIds.length === 0) return NextResponse.json([]);

        const cameraData = await aggregateCameraData(cameraIds, range);

        const pieChartResult: PieChartResult[] = cameraData.map((cam) => ({
            stream: cam.cameraId,
            data: [
                { label: "Cars",         value: cam.counts.car_count },
                { label: "Trucks",       value: cam.counts.truck_count },
                { label: "Pedestrians",  value: cam.counts.person_count },
                { label: "Bikes",        value: cam.counts.bike_count },
                { label: "Buses",        value: cam.counts.bus_count }
            ]
        }));

        return NextResponse.json(pieChartResult);
    } catch (err) {
        console.error("API Stats Error:", err);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}