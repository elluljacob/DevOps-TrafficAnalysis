import base64
import logging
import queue
import threading
import time
from typing import Any, Dict, Optional

import cv2

from streams import StreamConfig
from utils import utc_iso_now


def encode_frame_jpeg_base64(frame: Any, jpeg_quality: int) -> str:
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
