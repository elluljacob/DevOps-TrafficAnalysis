#!/usr/bin/env python3
import argparse
import logging
import os
import queue
import threading
import time
from typing import Any, Dict, List, Optional

from capture import stream_capture_loop
from rabbit_publisher import RabbitPublisher
from sinks import FrameSink, LocalDiskSink, MultiSink, RabbitSink
from streams import db_poll_loop, load_streams, load_streams_from_db


def publisher_loop(
    sink: FrameSink,
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

            sink.send(payload)
            backoff = 0.5
        except Exception as e:
            log.error("Sink send failed (%s). Retrying in %.1fs", e, backoff)
            time.sleep(backoff)
            backoff = min(10.0, backoff * 1.7)

    sink.close()
    log.info("Stopped")


def make_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Stream processor")

    src = p.add_mutually_exclusive_group()
    src.add_argument(
        "--streams",
        default=os.environ.get("STREAMS_FILE", ""),
        help="Path to streams JSON file. If set, DB args are ignored.",
    )

    # PostgreSQL
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

    # Capture / encoding
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

    # Output — RabbitMQ
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

    # Output — local disk
    p.add_argument(
        "--save-frames",
        action="store_true",
        default=os.environ.get("SAVE_FRAMES", "").lower() in ("1", "true", "yes"),
        help="Write captured frames to disk alongside publishing to RabbitMQ.",
    )
    p.add_argument(
        "--output-dir",
        default=os.environ.get("OUTPUT_DIR", "frames"),
        help="Directory to write frames to when --save-frames is set. Default: ./frames",
    )
    p.add_argument(
        "--save-frames-only",
        action="store_true",
        default=os.environ.get("SAVE_FRAMES_ONLY", "").lower() in ("1", "true", "yes"),
        help="Write frames to disk only; do not publish to RabbitMQ.",
    )

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

    # Stream source
    use_db = not args.streams
    if use_db:
        streams = load_streams_from_db(use_localhost=args.use_localhost, **db_args)
        log.info("Loaded %d streams from database", len(streams))
    else:
        streams = load_streams(args.streams)
        log.info("Loaded %d streams from file %s", len(streams), args.streams)

    # Build sink
    sinks: List[FrameSink] = []

    if not args.save_frames_only:
        publisher = RabbitPublisher(
            host=args.rabbitmq_host,
            port=args.rabbitmq_port,
            username=args.rabbitmq_username,
            password=args.rabbitmq_password,
            queue_name=args.queue_name,
            aws_mq_uri=args.aws_mq_uri,
        )
        sinks.append(RabbitSink(publisher))
        log.info(
            "Output: RabbitMQ %s:%s queue=%s",
            args.rabbitmq_host,
            args.rabbitmq_port,
            args.queue_name,
        )

    if args.save_frames or args.save_frames_only:
        sinks.append(LocalDiskSink(args.output_dir))
        log.info("Output: local disk -> %s", os.path.abspath(args.output_dir))

    if not sinks:
        log.error(
            "No output sink configured — pass --save-frames or ensure RabbitMQ args are set."
        )
        return 1

    sink: FrameSink = sinks[0] if len(sinks) == 1 else MultiSink(sinks)

    stop_event = threading.Event()
    out_q: "queue.Queue[Dict[str, Any]]" = queue.Queue(maxsize=200)

    pub_thread = threading.Thread(
        target=publisher_loop,
        name="publisher",
        daemon=True,
        args=(sink, out_q, stop_event, bool(args.dry_run)),
    )
    pub_thread.start()

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
                stream_capture_loop,
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
