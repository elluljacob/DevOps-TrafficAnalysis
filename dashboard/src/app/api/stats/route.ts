import { NextResponse, NextRequest } from 'next/server'
import { generateMockHistory, getStats } from '@/app/api/stats/data_fetch_requests'
import { PieChartResult } from '@/types/stats'
import { aggregateCameraData } from '@/app/api/stats/testing_db'
import { log, LogLevel } from '@/lib/logger'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        // Get averaged counts per camera
        const cameraData = await aggregateCameraData();

        // Convert each camera into TrafficEntry format
        const pieChartResult: PieChartResult[] = cameraData.map((cam) => ({
            camera: cam.cameraId,
            data: [
                { label: "Cars"         , value: cam.counts.car_count       },
                { label: "Trucks"       , value: cam.counts.truck_count     },
                { label: "Pedestrians"  , value: cam.counts.person_count    },
                { label: "Bikes"        , value: 0                          },   // Add when supported
                { label: "Buses"        , value: 0                          }    // Add when supported
            ]
        }));


    return NextResponse.json(pieChartResult);

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}