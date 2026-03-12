import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { TimeRange } from "@/types/stats";

type HistoryRow = {
    timestamp: string;
    Cars: number;
    Bikes: number;
    Buses: number;
    Trucks: number;
    Pedestrians: number;
};

function getRangeConfig(range: TimeRange) {
    switch (range) {
        case "live":
            return { interval: "5 minutes", bucket: "1 second" };
        case "1h":
            return { interval: "1 hour", bucket: "1 minute" };
        case "24h":
            return { interval: "24 hours", bucket: "10 minutes" }; // date_bin likes this
        case "7d":
            return { interval: "7 days", bucket: "1 hour" };
        default:
            return { interval: "5 minutes", bucket: "1 second" };
    }
}

// api/stream_history/route.ts
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const camera = searchParams.get("stream") ?? "cam1";
        const range = (searchParams.get("range") ?? "live") as TimeRange;
        const { interval, bucket } = getRangeConfig(range);

        const pool = await getDb();

        const query = `
        WITH bounds AS (
            -- Get the latest time and snap it to the nearest bucket (e.g., nearest 10m)
            SELECT date_bin($3::interval, MAX(datetime), '2000-01-01') AS end_time
            FROM traffic_metrics
            WHERE id = $1
        ),
        timeline AS (
            -- Generate a continuous scaffold of time slots
            SELECT generate_series(
                (SELECT end_time FROM bounds) - $2::interval, 
                (SELECT end_time FROM bounds), 
                $3::interval
            ) AS slot
        )
        SELECT
            t.slot AS timestamp,
            -- Use MAX instead of AVG. COALESCE ensures gaps show as 0, not null.
            COALESCE(MAX(tm.car_count), 0)    AS "Cars",
            COALESCE(MAX(tm.truck_count), 0)  AS "Trucks",
            COALESCE(MAX(tm.person_count), 0) AS "Pedestrians",
            COALESCE(MAX(tm.bike_count), 0)   AS "Bikes",
            COALESCE(MAX(tm.bus_count), 0)    AS "Buses"
        FROM timeline t
        LEFT JOIN traffic_metrics tm ON 
            tm.id = $1 AND 
            date_bin($3::interval, tm.datetime, '2000-01-01') = t.slot
        GROUP BY t.slot
        ORDER BY t.slot ASC;
        `;

        const { rows } = await pool.query(query, [camera, interval, bucket]);

        const history = rows.map((r) => ({
            timestamp: r.timestamp.toISOString(),
            Cars: Number(r.Cars),
            Bikes: Number(r.Bikes),
            Buses: Number(r.Buses),
            Trucks: Number(r.Trucks),
            Pedestrians: Number(r.Pedestrians),
        }));

        return NextResponse.json({ history });
    } catch (err) {
        console.error("API Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}