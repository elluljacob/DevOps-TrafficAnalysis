import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { StreamObject } from "@/types/stream";

export async function GET() {
    try {
        const pool = await getDb();

        // SQL: select all columns from streams
        const query = `
            SELECT stream_id, location, url, latitude, longitude
            FROM public.streams
            ORDER BY stream_id;
        `;

        const result = await pool.query(query);

        // Map database rows to StreamObject type
        const streams: StreamObject[] = result.rows.map(row => ({
            ID   : row.stream_id,
            loc  : row.location,
            url  : row.url,
            lat  : Number(row.latitude),
            long : Number(row.longitude)
        }));

        return NextResponse.json(streams);

    } catch (err) {
        console.error("Camera API error:", err);

        return NextResponse.json(
            { error: "Failed to fetch camera streams" },
            { status: 500 }
        );
    }
}