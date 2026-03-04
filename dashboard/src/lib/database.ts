// lib/database.ts

import { Pool } from "pg";

const MAX_RETRIES = parseInt(process.env.DB_RETRY_MAX ?? "50", 10);
const RETRY_INTERVAL = parseInt(process.env.DB_RETRY_INTERVAL_MS ?? "5000", 10);

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Store pool + init promise on globalThis
 * to survive Next.js hot reload
 */
declare global {
    // eslint-disable-next-line no-var
    var __pgPool: Pool | undefined;
    // eslint-disable-next-line no-var
    var __pgInitPromise: Promise<Pool> | undefined;
}

async function createPostgresPool(): Promise<Pool> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[Postgres] Init attempt ${attempt}/${MAX_RETRIES}`);

            const pool = new Pool({
                host     : process.env.DB_HOST,
                port     : Number(process.env.DB_PORT ?? 5432),
                user     : process.env.DB_USER,
                password : process.env.DB_PASSWORD,
                database : process.env.DB_NAME,
                max      : 10, // max connections
                ssl      : { rejectUnauthorized: false },
            });

            // Test connection
            await pool.query("SELECT 1");

            console.log("[Postgres] Connected and ping successful");

            return pool;
        } catch (err) {
            lastError = err;

            console.error(`[Postgres] Connection failed (attempt ${attempt}):`, err);

            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_INTERVAL);
            }
        }
    }

    throw new Error(`[Postgres] All retry attempts failed — giving up: ${lastError}`);
}

/**
 * Public accessor — always await before using
 */
export async function getDb(): Promise<Pool> {
    if (global.__pgPool) {
        return global.__pgPool;
    }

    if (!global.__pgInitPromise) {
        global.__pgInitPromise = createPostgresPool().then((pool) => {
            global.__pgPool = pool;
            return pool;
        });
    }

    return global.__pgInitPromise;
}