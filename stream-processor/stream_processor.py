#!/usr/bin/env python3
import argparse
import base64
import dataclasses
import datetime as dt
import json
import logging
import os
import queue
import threading
import time
import urllib.parse
from typing import Any, Dict, List, Optional

import cv2

import psycopg2

from rabbit_publisher import RabbitPublisher


@dataclasses.dataclass(frozen=True)
class StreamConfig:
    stream_id: str
    location: str
    url: str


def utc_iso_now() -> str:
    return (
        dt.datetime.now(dt.timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


# ---------------------------------------------------------------------------
# Stream loading — JSON file (original v1) or PostgreSQL (from v2)
# ---------------------------------------------------------------------------


def load_streams(path: str) -> List[StreamConfig]:
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, list):
        raise ValueError("Streams config must be a JSON array")
    streams: List[StreamConfig] = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f"Stream entry #{i} must be an object")
        for key in ("stream_id", "location", "url"):
            if key not in item or not item[key]:
                raise ValueError(f"Stream entry #{i} missing '{key}'")
        streams.append(
            StreamConfig(
                stream_id=str(item["stream_id"]),
                location=str(item["location"]),
                url=str(item["url"]),
            )
        )
    return streams


def replace_host_with_localhost(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if not parsed.hostname:
        return url
    replaced = parsed._replace(
        netloc=parsed.netloc.replace(parsed.hostname, "localhost", 1)
    )
    return urllib.parse.urlunparse(replaced)


def load_streams_from_db(
    host: str,
    port: int,
    dbname: str,
    user: str,
    password: str,
    use_localhost: bool = False,
) -> List[StreamConfig]:
    log = logging.getLogger("load_streams")
    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password,
        connect_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT stream_id, location, url FROM streams")
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        raise ValueError("No streams found in the database")

    streams: List[StreamConfig] = []
    for stream_id, location, url in rows:
        if not stream_id or not location or not url:
            log.warning(
                "Skipping incomplete stream row: id=%s location=%s url=%s",
                stream_id,
                location,
                url,
            )
            continue
        if use_localhost:
            url = replace_host_with_localhost(url)
        streams.append(
            StreamConfig(
                stream_id=str(stream_id),
                location=str(location),
                url=str(url),
            )
        )
        log.info("Loaded stream id=%s location=%s url=%s", stream_id, location, url)

    return streams


# ---------------------------------------------------------------------------
# DB polling — periodically refresh the stream list and spin up new threads
# ---------------------------------------------------------------------------


def db_poll_loop(
    db_args: Dict[str, Any],
    use_localhost: bool,
    poll_interval_s: float,
    active_streams: Dict[str, threading.Thread],
    out_q: "queue.Queue[Dict[str, Any]]",
    interval_s: float,
    jpeg_quality: int,
    stop_event: threading.Event,
) -> None:
    """Polls the DB every `poll_interval_s` seconds.

    For any stream_id not already being captured, a new capture thread is
    started. Streams that disappear from the DB are *not* forcibly killed —
    their capture threads will eventually fail and log a warning, which keeps
    the implementation simple and avoids needing per-thread stop events.
    If you need hard removal, that can be added later.
    """
    log = logging.getLogger("db_poll")
    while not stop_event.wait(poll_interval_s):
        try:
            fresh = load_streams_from_db(use_localhost=use_localhost, **db_args)
        except Exception as e:
            log.error("DB poll failed: %s", e)
            continue

        for cfg in fresh:
            if (
                cfg.stream_id in active_streams
                and active_streams[cfg.stream_id].is_alive()
            ):
                continue  # already running
            log.info("Starting capture thread for new stream id=%s", cfg.stream_id)
            t = threading.Thread(
                target=stream_capture_loop,
                name=f"capture:{cfg.stream_id}",
                daemon=True,
                args=(cfg, interval_s, jpeg_quality, out_q, stop_event),
            )
            t.start()
            active_streams[cfg.stream_id] = t


# ---------------------------------------------------------------------------
# Frame capture
# ---------------------------------------------------------------------------


def encode_frame_jpeg_base64(frame, jpeg_quality: int) -> str:
    try:
        ok, buf = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)]
        )
    except cv2.error as e:
        raise RuntimeError("Failed to encode frame as JPEG") from e
    if not ok:
        raise RuntimeError("Failed to encode frame as JPEG")
    return base64.b64encode(buf).decode("utf-8")  # type: ignore[arg-type]


def stream_capture_loop(
    cfg: StreamConfig,
    interval_s: float,
    jpeg_quality: int,
    out_q: "queue.Queue[Dict[str, Any]]",
    stop_event: threading.Event,
    max_reconnect_sleep_s: float = 10.0,
) -> None:
    log = logging.getLogger(f"capture:{cfg.stream_id}")
    reconnect_sleep = 0.5
    cap: Optional[cv2.VideoCapture] = None
    next_emit = 0.0

    def open_capture() -> cv2.VideoCapture:
        c = cv2.VideoCapture(cfg.url)
        try:
            c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
        return c

    while not stop_event.is_set():
        try:
            if cap is None or not cap.isOpened():
                if cap is not None:
                    try:
                        cap.release()
                    except Exception:
                        pass
                log.warning("Opening stream url=%s", cfg.url)
                cap = open_capture()
                if not cap.isOpened():
                    log.error(
                        "Failed to open stream. Retrying in %.1fs", reconnect_sleep
                    )
                    time.sleep(reconnect_sleep)
                    reconnect_sleep = min(max_reconnect_sleep_s, reconnect_sleep * 1.5)
                    continue
                reconnect_sleep = 0.5
                next_emit = 0.0

            ok, frame = cap.read()
            if not ok or frame is None:
                log.warning("Read failed. Reconnecting in %.1fs", reconnect_sleep)
                try:
                    cap.release()
                except Exception:
                    pass
                cap = None
                time.sleep(reconnect_sleep)
                reconnect_sleep = min(max_reconnect_sleep_s, reconnect_sleep * 1.5)
                continue

            now = time.monotonic()
            if next_emit and now < next_emit:
                time.sleep(min(0.02, max(0.0, next_emit - now)))
                continue

            image_b64 = encode_frame_jpeg_base64(frame, jpeg_quality)
            payload = {
                "timestamp": utc_iso_now(),
                "stream_id": cfg.stream_id,
                "location": cfg.location,
                "image_data": image_b64,
            }

            try:
                out_q.put(payload, block=False)
            except queue.Full:
                log.warning("Publisher queue full; dropping frame")

            next_emit = time.monotonic() + interval_s
        except Exception as e:
            log.exception(
                "Unhandled error (%s). Reconnecting in %.1fs", e, reconnect_sleep
            )
            try:
                if cap is not None:
                    cap.release()
            except Exception:
                pass
            cap = None
            time.sleep(reconnect_sleep)
            reconnect_sleep = min(max_reconnect_sleep_s, reconnect_sleep * 1.5)

    try:
        if cap is not None:
            cap.release()
    except Exception:
        pass
    log.info("Stopped")


# ---------------------------------------------------------------------------
# Publisher loop
# ---------------------------------------------------------------------------


def publisher_loop(
    publisher: RabbitPublisher,
    in_q: "queue.Queue[Dict[str, Any]]",
    stop_event: threading.Event,
    dry_run: bool,
) -> None:
    log = logging.getLogger("publisher")
    backoff = 0.5
    while not stop_event.is_set():
        try:
            try:
                payload = in_q.get(timeout=0.5)
            except queue.Empty:
                continue

            if dry_run:
                log.info(
                    "DRY_RUN publish stream_id=%s location=%s ts=%s bytes(image_data)=%s",
                    payload.get("stream_id"),
                    payload.get("location"),
                    payload.get("timestamp"),
                    len(payload.get("image_data", "")),
                )
                continue

            publisher.publish_json(payload)
            backoff = 0.5
        except Exception as e:
            log.error("Publish failed (%s). Reconnecting in %.1fs", e, backoff)
            try:
                publisher.close()
            except Exception:
                pass
            time.sleep(backoff)
            backoff = min(10.0, backoff * 1.7)

    try:
        publisher.close()
    except Exception:
        pass
    log.info("Stopped")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Stream processor")

    src = p.add_mutually_exclusive_group()
    src.add_argument(
        "--streams",
        default=os.environ.get("STREAMS_FILE", ""),
        help="Path to streams JSON file. If set, DB args are ignored.",
    )

    p.add_argument("--db-host", default=os.environ.get("DB_HOST", "localhost"))
    p.add_argument(
        "--db-port", type=int, default=int(os.environ.get("DB_PORT", "5432"))
    )
    p.add_argument("--db-name", default=os.environ.get("DB_NAME", "postgres"))
    p.add_argument("--db-user", default=os.environ.get("DB_USER", "postgres"))
    p.add_argument("--db-password", default=os.environ.get("DB_PASSWORD", ""))
    p.add_argument(
        "--use-localhost",
        action="store_true",
        default=os.environ.get("USE_LOCALHOST", "").lower() in ("1", "true", "yes"),
        help="Replace stream URL hostnames with localhost (for edge deployments).",
    )
    p.add_argument(
        "--db-poll-interval",
        type=float,
        default=float(os.environ.get("DB_POLL_INTERVAL_S", "60")),
        help="Seconds between DB polls for new streams (0 = no polling). Only used with DB mode.",
    )

    p.add_argument(
        "--interval",
        type=float,
        default=float(os.environ.get("FRAME_INTERVAL_S", "1")),
    )
    p.add_argument(
        "--jpeg-quality",
        type=int,
        default=int(os.environ.get("JPEG_QUALITY", "80")),
    )

    p.add_argument("--queue-name", default=os.environ.get("QUEUE_NAME", "edge_frames"))
    p.add_argument(
        "--rabbitmq-host", default=os.environ.get("RABBITMQ_HOST", "localhost")
    )
    p.add_argument(
        "--rabbitmq-port",
        type=int,
        default=int(os.environ.get("RABBITMQ_PORT", "5672")),
    )
    p.add_argument(
        "--rabbitmq-username", default=os.environ.get("RABBITMQ_USERNAME", "guest")
    )
    p.add_argument(
        "--rabbitmq-password", default=os.environ.get("RABBITMQ_PASSWORD", "guest")
    )
    p.add_argument("--aws-mq-uri", default=os.environ.get("AWS_MQ_URI", ""))
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--log-level", default=os.environ.get("LOG_LEVEL", "INFO"))
    return p


def main() -> int:
    args = make_parser().parse_args()
    logging.basicConfig(
        level=getattr(logging, str(args.log_level).upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    log = logging.getLogger("main")

    db_args = {
        "host": args.db_host,
        "port": args.db_port,
        "dbname": args.db_name,
        "user": args.db_user,
        "password": args.db_password,
    }

    # Decide stream source
    use_db = not args.streams  # fall back to DB when no JSON file is given
    if use_db:
        streams = load_streams_from_db(use_localhost=args.use_localhost, **db_args)
        log.info("Loaded %d streams from database", len(streams))
    else:
        streams = load_streams(args.streams)
        log.info("Loaded %d streams from file %s", len(streams), args.streams)

    stop_event = threading.Event()
    out_q: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=200)

    publisher = RabbitPublisher(
        host=args.rabbitmq_host,
        port=args.rabbitmq_port,
        username=args.rabbitmq_username,
        password=args.rabbitmq_password,
        queue_name=args.queue_name,
        aws_mq_uri=args.aws_mq_uri,
    )

    pub_thread = threading.Thread(
        target=publisher_loop,
        name="publisher",
        daemon=True,
        args=(publisher, out_q, stop_event, bool(args.dry_run)),
    )
    pub_thread.start()

    # active_streams tracks stream_id → thread so the poll loop can avoid
    # starting duplicates.
    active_streams: Dict[str, threading.Thread] = {}

    cap_threads: List[threading.Thread] = []
    for cfg in streams:
        t = threading.Thread(
            target=stream_capture_loop,
            name=f"capture:{cfg.stream_id}",
            daemon=True,
            args=(cfg, float(args.interval), int(args.jpeg_quality), out_q, stop_event),
        )
        t.start()
        cap_threads.append(t)
        active_streams[cfg.stream_id] = t

    # Start DB poll thread only in DB mode and when polling is enabled
    poll_thread: Optional[threading.Thread] = None
    if use_db and args.db_poll_interval > 0:
        log.info("DB polling enabled every %.0fs", args.db_poll_interval)
        poll_thread = threading.Thread(
            target=db_poll_loop,
            name="db_poll",
            daemon=True,
            args=(
                db_args,
                args.use_localhost,
                args.db_poll_interval,
                active_streams,
                out_q,
                float(args.interval),
                int(args.jpeg_quality),
                stop_event,
            ),
        )
        poll_thread.start()

    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        log.info("Stopping")
        stop_event.set()
        for t in cap_threads:
            t.join(timeout=2.0)
        if poll_thread:
            poll_thread.join(timeout=2.0)
        pub_thread.join(timeout=2.0)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
