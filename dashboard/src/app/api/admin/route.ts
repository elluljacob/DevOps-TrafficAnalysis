import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/database";
import { StreamObject } from "@/types/stream";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret";
/* ============================================================================
 * POST /api/streams
 * ----------------------------------------------------------------------------
 * Adds a new stream. Expects JSON body with ID, loc, url, lat, long, password.
 * ============================================================================
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ID, loc, url, lat, long, password } = body;

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pool = await getDb();
        await pool.query(
            `INSERT INTO public.streams(stream_id, location, url, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5)`,
            [ID, loc, url, lat, long]
        );

        return NextResponse.json({ message: "Stream added successfully" });
    } catch (err) {
        console.error("POST /api/streams error:", err);
        return NextResponse.json({ error: "Failed to add stream" }, { status: 500 });
    }
}


/* ============================================================================
 * PUT /api/streams
 * ----------------------------------------------------------------------------
 * Updates an existing stream. Expects JSON body with ID, loc, url, lat, long, password.
 * ============================================================================
 */
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { ID, loc, url, lat, long, password } = body;

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pool = await getDb();
        const result = await pool.query(
            `UPDATE public.streams
             SET location=$2, url=$3, latitude=$4, longitude=$5
             WHERE stream_id=$1`,
            [ID, loc, url, lat, long]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Stream not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Stream updated successfully" });
    } catch (err) {
        console.error("PUT /api/streams error:", err);
        return NextResponse.json({ error: "Failed to update stream" }, { status: 500 });
    }
}


/* ============================================================================
 * DELETE /api/streams?id=STREAM_ID
 * ----------------------------------------------------------------------------
 * Deletes a stream. Expects query parameter `id` and JSON body { password }.
 * ============================================================================
 */
export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing stream ID" }, { status: 400 });

        const body = await req.json();
        const { password } = body;

        if (password !== ADMIN_PASSWORD) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const pool = await getDb();
        const result = await pool.query(`DELETE FROM public.streams WHERE stream_id=$1`, [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Stream not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Stream deleted successfully" });
    } catch (err) {
        console.error("DELETE /api/streams error:", err);
        return NextResponse.json({ error: "Failed to delete stream" }, { status: 500 });
    }
}