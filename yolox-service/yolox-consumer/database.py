import os
from datetime import datetime, timezone

import psycopg2
from loguru import logger

CLASS_MAPPING = {
    "bicycle": "bike",
    "bus": "bus",
    "car": "car",
    "truck": "truck",
    "person": "person",
}


class PostgresWriter:
    def __init__(self):
        self.host = os.getenv("DB_HOST")
        self.database = os.getenv("DB_NAME", "postgres")
        self.user = os.getenv("DB_USER")
        self.password = os.getenv("DB_PASSWORD")
        self.port = int(os.getenv("DB_PORT", 5432))

        try:
            self.conn = psycopg2.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                port=self.port,
            )
            self.conn.autocommit = True
            self.cur = self.conn.cursor()
            logger.info(f"Connected to Postgres at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Postgres: {e}")
            raise

    def write_inference(self, stream_id, location, result, timestamp=None):
        """
        Writes YOLOX inference results to Postgres.
        'result' expects: {'total_count': X, 'per_class': {'class': count}}
        """
        counts_raw = result.get("per_class", {})

        counts = {}
        for cls, value in counts_raw.items():
            mapped = CLASS_MAPPING.get(cls)
            if mapped:
                counts[mapped] = counts.get(mapped, 0) + value

        sql = """
        INSERT INTO traffic_metrics (
            id, datetime, location, total_count,
            person_count, car_count, truck_count,
            bus_count, bike_count,
            detected_classes, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        if timestamp is None:
            logger.warning("No frame timestamp provided, falling back to now()")
            ts = datetime.now(timezone.utc)
        else:
            ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

        params = (
            stream_id,
            ts,
            location,
            result.get("total_count", 0),
            counts.get("person", 0),
            counts.get("car", 0),
            counts.get("truck", 0),
            counts.get("bus", 0),
            counts.get("bike", 0),
            list(counts.keys()),
            "active_inference",
        )

        try:
            self.cur.execute(sql, params)
            return True
        except Exception as e:
            logger.error(f"Failed to write to Postgres: {e}")
            return False

    def close(self):
        self.cur.close()
        self.conn.close()
        logger.info("Postgres connection closed")
