import dataclasses
import json
import logging
import threading
import urllib.parse
from typing import Any, Dict, List, Optional

import psycopg2


@dataclasses.dataclass(frozen=True)
class StreamConfig:
    stream_id: str
    location: str
    url: str


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
        netloc=parsed.netloc.replace(parsed.hostname, "host.docker.internal", 1)
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


def db_poll_loop(
    db_args: Dict[str, Any],
    use_localhost: bool,
    poll_interval_s: float,
    active_streams: Dict[str, threading.Thread],
    out_q: "Any",  # queue.Queue — avoid importing queue here for simplicity
    interval_s: float,
    jpeg_quality: int,
    stop_event: threading.Event,
    capture_fn: Optional[Any] = None,
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
                continue
            log.info("Starting capture thread for new stream id=%s", cfg.stream_id)
            t = threading.Thread(
                target=capture_fn,
                name=f"capture:{cfg.stream_id}",
                daemon=True,
                args=(cfg, interval_s, jpeg_quality, out_q, stop_event),
            )
            t.start()
            active_streams[cfg.stream_id] = t
