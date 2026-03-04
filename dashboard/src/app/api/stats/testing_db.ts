// lib/aggregateCameraData.ts
import { getDb } from "@/lib/database";

type AggregatedCounts = {
    person_count: number;
    car_count: number;
    truck_count: number;
};

type CameraResult = {
    cameraId: string;
    counts: AggregatedCounts;
};

export async function aggregateCameraData(
    cameraIds: string[] = ["cam1", "cam2", "cam3"]
): Promise<CameraResult[]> {
    const pool = await getDb();

    // Single query per all cameras
    const query = `
WITH per_camera AS (
    SELECT *,
        MAX(datetime) OVER (PARTITION BY id) AS latest_per_camera
    FROM traffic_metrics
)
SELECT
    id AS camera_id,
    MAX(person_count) AS person_count,
    MAX(car_count) AS car_count,
    MAX(truck_count) AS truck_count
FROM per_camera
WHERE datetime >= latest_per_camera - INTERVAL '5 seconds'
GROUP BY id;
    `;

    const { rows } = await pool.query(query);

    // Map rows to CameraResult, fill in cameras with no data
    const result: CameraResult[] = cameraIds.map((camId) => {
        const row = rows.find((r) => r.camera_id === camId);
        return {
            cameraId: camId,
            counts: row
                ? {
                    person_count: row.person_count,
                    car_count: row.car_count,
                    truck_count: row.truck_count,
                }
                : { person_count: 0, car_count: 0, truck_count: 0 },
        };
    });

    return result;
}