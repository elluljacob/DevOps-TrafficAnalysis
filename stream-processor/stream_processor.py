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
import pika


@dataclasses.dataclass(frozen=True)
class StreamConfig:
    stream_id: str
    location: str
    url: str


def utc_iso_now() -> str:
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def replace_host_with_localhost(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    replaced = parsed._replace(netloc=parsed.netloc.replace(parsed.hostname, "localhost", 1))
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
    conn = psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password, connect_timeout=10)
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
            log.warning("Skipping incomplete stream row: id=%s location=%s url=%s", stream_id, location, url)
            continue
        if use_localhost:
            url = replace_host_with_localhost(url)
        streams.append(StreamConfig(stream_id=str(stream_id), location=str(location), url=str(url)))
        log.info("Loaded stream id=%s location=%s url=%s", stream_id, location, url)

    return streams


class RabbitPublisher:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        queue_name: str,
        heartbeat: int = 30,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.queue_name = queue_name
        self.heartbeat = heartbeat

        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[pika.adapters.blocking_connection.BlockingChannel] = None

    def connect(self) -> None:
        self.close()
        creds = pika.PlainCredentials(self.username, self.password)
        params = pika.ConnectionParameters(
            host=self.host,
            port=self.port,
            credentials=creds,
            heartbeat=self.heartbeat,
            blocked_connection_timeout=30,
        )
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()
        self._channel.queue_declare(queue=self.queue_name, durable=True)

    def close(self) -> None:
        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
        except Exception:
            pass
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass
        self._channel = None
        self._connection = None

    def publish_json(self, payload: Dict[str, Any]) -> None:
        if not self._channel or self._channel.is_closed:
            self.connect()
        assert self._channel is not None

        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        props = pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,  # persistent
        )
        self._channel.basic_publish(exchange="", routing_key=self.queue_name, body=body, properties=props)


def encode_frame_jpeg_base64(frame, jpeg_quality: int) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)])
    if not ok:
        raise RuntimeError("Failed to encode frame as JPEG")
    return base64.b64encode(buf).decode("utf-8")


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
                    log.error("Failed to open stream. Retrying in %.1fs", reconnect_sleep)
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
                # Discard frames until it's time to emit
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
            log.exception("Unhandled error (%s). Reconnecting in %.1fs", e, reconnect_sleep)
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
                log.info("DRY_RUN publish stream_id=%s location=%s ts=%s bytes(image_data)=%s",
                         payload.get("stream_id"), payload.get("location"), payload.get("timestamp"),
                         len(payload.get("image_data", "")))
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


def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Stream processor: sample frames and push to RabbitMQ.")
    # PostgreSQL
    p.add_argument("--db-host", default=os.environ.get("DB_HOST", "localhost"), help="PostgreSQL host.")
    p.add_argument("--db-port", type=int, default=int(os.environ.get("DB_PORT", "5432")), help="PostgreSQL port.")
    p.add_argument("--db-name", default=os.environ.get("DB_NAME", "postgres"), help="PostgreSQL database name.")
    p.add_argument("--db-user", default=os.environ.get("DB_USER", "postgres"), help="PostgreSQL user.")
    p.add_argument("--db-password", default=os.environ.get("DB_PASSWORD", ""), help="PostgreSQL password.")
    p.add_argument("--use-localhost", action="store_true",
                   default=os.environ.get("USE_LOCALHOST", "").lower() in ("1", "true", "yes"),
                   help="Replace stream URL hostnames with localhost (for edge deployments).")
    # RabbitMQ
    p.add_argument("--interval", type=float, default=float(os.environ.get("FRAME_INTERVAL_S", "0.2")), help="Seconds between pushed frames per stream.")
    p.add_argument("--jpeg-quality", type=int, default=int(os.environ.get("JPEG_QUALITY", "80")), help="JPEG quality (1-100).")
    p.add_argument("--queue-name", default=os.environ.get("QUEUE_NAME", "edge_frames"))
    p.add_argument("--rabbitmq-host", default=os.environ.get("RABBITMQ_HOST", "localhost"))
    p.add_argument("--rabbitmq-port", type=int, default=int(os.environ.get("RABBITMQ_PORT", "5672")))
    p.add_argument("--rabbitmq-username", default=os.environ.get("RABBITMQ_USERNAME", "guest"))
    p.add_argument("--rabbitmq-password", default=os.environ.get("RABBITMQ_PASSWORD", "guest"))
    p.add_argument("--dry-run", action="store_true", help="Don't publish; just log payload metadata.")
    p.add_argument("--log-level", default=os.environ.get("LOG_LEVEL", "INFO"))
    return p


def main() -> int:
    args = make_parser().parse_args()
    logging.basicConfig(
        level=getattr(logging, str(args.log_level).upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )

    streams = load_streams_from_db(
        host=args.db_host,
        port=args.db_port,
        dbname=args.db_name,
        user=args.db_user,
        password=args.db_password,
        use_localhost=args.use_localhost,
    )
    logging.getLogger("main").info("Loaded %d streams from database", len(streams))

    stop_event = threading.Event()
    out_q: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=200)

    publisher = RabbitPublisher(
        host=args.rabbitmq_host,
        port=args.rabbitmq_port,
        username=args.rabbitmq_username,
        password=args.rabbitmq_password,
        queue_name=args.queue_name,
    )

    pub_thread = threading.Thread(
        target=publisher_loop,
        name="publisher",
        daemon=True,
        args=(publisher, out_q, stop_event, bool(args.dry_run)),
    )
    pub_thread.start()

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

    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        logging.getLogger("main").info("Stopping")
        stop_event.set()
        for t in cap_threads:
            t.join(timeout=2.0)
        pub_thread.join(timeout=2.0)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())


