// lib/aggregateCameraData.ts
import { getDb } from "@/lib/database";


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
    cameraIds: string[]
): Promise<CameraResult[]> {
    const pool = await getDb();

    const query = `
        WITH per_camera AS (
            SELECT *,
                MAX(datetime) OVER (PARTITION BY id) AS latest_per_camera
            FROM traffic_metrics
            WHERE id = ANY($1)
        )
        SELECT
            id AS camera_id,
            COALESCE(MAX(person_count), 0) AS person_count,
            COALESCE(MAX(car_count), 0)    AS car_count,
            COALESCE(MAX(truck_count), 0)  AS truck_count,
            COALESCE(MAX(bike_count), 0)   AS bike_count,
            COALESCE(MAX(bus_count), 0)    AS bus_count
        FROM per_camera
        WHERE datetime >= latest_per_camera - INTERVAL '5 seconds'
        GROUP BY id;
    `;

    const { rows } = await pool.query(query, [cameraIds]);

    return cameraIds.map((camId) => {
        const row = rows.find((r) => r.camera_id === camId);
        return {
            cameraId: camId,
            counts: row ? {
                person_count: parseInt(row.person_count),
                car_count: parseInt(row.car_count),
                truck_count: parseInt(row.truck_count),
                bike_count: parseInt(row.bike_count),
                bus_count: parseInt(row.bus_count),
            } : { person_count: 0, car_count: 0, truck_count: 0, bike_count: 0, bus_count: 0 },
        };
    });
}