// lib/aggregateCameraData.ts
import { getDb } from "@/lib/database";
import { TimeRange } from "@/types/stats";


type AggregatedCounts = {
    person_count: number;
    car_count: number;
    truck_count: number;
    bike_count: number;
    bus_count: number;
};

type CameraResult = {
    cameraId: string;
    counts: AggregatedCounts;
};
export async function aggregateCameraData(
    cameraIds: string[],
    range: TimeRange
): Promise<CameraResult[]> {
    const pool = await getDb();

    // Mapping ranges to SQL intervals
    const intervalMap: Record<string, string> = {
        'live': '5 seconds',
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days'
    };

    const selectedInterval = intervalMap[range] || '5 seconds';

    let query = '';
    
    if (range === 'live') {
        // Original logic for Live: Latest snapshot
        query = `
            WITH latest_ts AS (
                SELECT id, MAX(datetime) as last_seen 
                FROM traffic_metrics WHERE id = ANY($1) GROUP BY id
            )
            SELECT
                t.id AS camera_id,
                MAX(t.person_count) AS person_count,
                MAX(t.car_count) AS car_count,
                MAX(t.truck_count) AS truck_count,
                MAX(t.bike_count) AS bike_count,
                MAX(t.bus_count) AS bus_count
            FROM traffic_metrics t
            JOIN latest_ts l ON t.id = l.id
            WHERE t.datetime >= l.last_seen - INTERVAL '5 seconds'
            GROUP BY t.id;
        `;
    } else {
        // Historical Logic: Sum of Maxes in 20s buckets
        query = `
            WITH bucketed_data AS (
                SELECT 
                    id,
                    floor(extract(epoch from datetime) / 30) AS bucket,
                    MAX(person_count) as max_p,
                    MAX(car_count) as max_c,
                    MAX(truck_count) as max_t,
                    MAX(bike_count) as max_bk,
                    MAX(bus_count) as max_bs
                FROM traffic_metrics
                WHERE id = ANY($1) 
                  AND datetime >= NOW() - INTERVAL '${selectedInterval}'
                GROUP BY id, bucket
            )
            SELECT 
                id AS camera_id,
                SUM(max_p) AS person_count,
                SUM(max_c) AS car_count,
                SUM(max_t) AS truck_count,
                SUM(max_bk) AS bike_count,
                SUM(max_bs) AS bus_count
            FROM bucketed_data
            GROUP BY id;
        `;
    }

    const { rows } = await pool.query(query, [cameraIds]);

    return cameraIds.map((camId) => {
        const row = rows.find((r) => r.camera_id === camId);
        return {
            cameraId: camId,
            counts: row ? {
                person_count: Math.round(Number(row.person_count)),
                car_count: Math.round(Number(row.car_count)),
                truck_count: Math.round(Number(row.truck_count)),
                bike_count: Math.round(Number(row.bike_count)),
                bus_count: Math.round(Number(row.bus_count)),
            } : { person_count: 0, car_count: 0, truck_count: 0, bike_count: 0, bus_count: 0 },
        };
    });
}