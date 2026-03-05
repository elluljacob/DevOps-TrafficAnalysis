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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const camera = searchParams.get("camera") ?? "cam1";
        const range = (searchParams.get("range") ?? "live") as TimeRange;

        const { interval, bucket } = getRangeConfig(range);

        const pool = await getDb();

        const query = `
        WITH latest AS (
            SELECT MAX(datetime) AS latest_time
            FROM traffic_metrics
            WHERE id = $1
        )
        SELECT
            -- date_bin(stride, source, origin)
            date_bin($3::interval, tm.datetime, '2000-01-01') AS timestamp,
            AVG(tm.car_count)    AS "Cars",
            AVG(tm.truck_count)  AS "Trucks",
            AVG(tm.person_count) AS "Pedestrians",
            0 AS "Bikes",
            0 AS "Buses"
        FROM traffic_metrics tm
        CROSS JOIN latest
        WHERE tm.id = $1
        AND tm.datetime >= latest.latest_time - $2::interval
        AND tm.datetime <= latest.latest_time
        GROUP BY timestamp
        ORDER BY timestamp;
        `;

        const { rows } = await pool.query(query, [
            camera,
            interval,
            bucket,
        ]);

        const history: HistoryRow[] = rows.map((r) => ({
            timestamp: r.timestamp,
            Cars: Number(r.Cars),
            Bikes: Number(r.Bikes),
            Buses: Number(r.Buses),
            Trucks: Number(r.Trucks),
            Pedestrians: Number(r.Pedestrians),
        }));

        return NextResponse.json({
            history,
        });
    } catch (err) {
        console.error("Camera history API error:", err);

        return NextResponse.json(
            { error: "Failed to fetch camera history" },
            { status: 500 }
        );
    }
}