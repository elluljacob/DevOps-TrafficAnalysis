import { NextResponse, NextRequest } from 'next/server'
import { generateMockHistory } from '@/app/api/stats/data_fetch_requests'
import { DashboardResponse, TimeRange, TrafficEntry } from '@/types/stats'
import { aggregateCameraData } from '@/app/api/stats/testing_db'
import { log, LogLevel } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get("range") as TimeRange) || "live";

    // Get averaged counts per camera
    const cameraData = await aggregateCameraData();

    log(
      `DATA:\n\n${JSON.stringify(cameraData, null, 2)}\n\n=========================`,
      LogLevel.INFO
    );

    // Convert each camera into TrafficEntry format
    const traffic_entry: TrafficEntry[] = cameraData.map((cam) => ({
      camera: cam.cameraId,
      data: [
        { label: "Cars", value: cam.counts.car_count },
        { label: "Trucks", value: cam.counts.truck_count },
        { label: "Pedestrians", value: cam.counts.person_count },
        { label: "Bikes", value: 0 },   // Add when supported
        { label: "Buses", value: 0 }    // Add when supported
      ]
    }));

    // Keep mock history for now
    const history = generateMockHistory(range);

    const response: DashboardResponse = {
      traffic_entry,
      history
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}