import os
import psycopg2
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# --- Config ---
HOST     = os.getenv("DB_HOST")
DATABASE = os.getenv("DB_NAME", "postgres")
USER     = os.getenv("DB_USER")
PASSWORD = os.getenv("DB_PASSWORD")
PORT     = int(os.getenv("DB_PORT", 5432))

CAMERAS      = ["cam1"]
CHECK_MINUTES = int(os.getenv("CHECK_MINUTES", 60))  # how far back to check

# --------------

conn = psycopg2.connect(host=HOST, database=DATABASE, user=USER, password=PASSWORD, port=PORT)
cur  = conn.cursor()

now        = datetime.now(timezone.utc)
start_time = now - timedelta(minutes=CHECK_MINUTES)

# Fetch all rows in the window, truncated to the second
cur.execute("""
    SELECT
        id AS stream_id,
        date_trunc('second', datetime) AS second
    FROM traffic_metrics
    WHERE datetime >= %s AND datetime < %s
    ORDER BY second
""", (start_time, now))

rows = cur.fetchall()

# Build a set of (stream_id, second) that exist
present = defaultdict(set)
for stream_id, second in rows:
    present[stream_id].add(second)

cur.close()
conn.close()

# Generate every expected second in the window
total_seconds = int((now - start_time).total_seconds())
all_seconds   = [start_time.replace(microsecond=0) + timedelta(seconds=i) for i in range(total_seconds)]

# Check each second for each camera
all_good    = True
missing_log = defaultdict(list)

for second in all_seconds:
    for cam in CAMERAS:
        if second not in present[cam]:
            all_good = False
            missing_log[cam].append(second.strftime("%Y-%m-%d %H:%M:%S UTC"))

if all_good:
    print("YES — all cameras have data for every second in the last "
          f"{CHECK_MINUTES} minute(s).")
else:
    print(f"MISSING DATA detected in the last {CHECK_MINUTES} minute(s):\n")
    for cam in CAMERAS:
        if missing_log[cam]:
            print(f"  {cam} — {len(missing_log[cam])} missing second(s):")
            for ts in missing_log[cam]:
                print(f"    ✗ {ts}")
        else:
            print(f"  {cam} — OK")