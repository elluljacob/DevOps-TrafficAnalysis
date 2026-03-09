import base64
import logging
import os
from typing import Any, Dict, List

from rabbit_publisher import RabbitPublisher
from utils import utc_iso_now


class FrameSink:
    """Base class for frame output sinks."""

    def send(self, payload: Dict[str, Any]) -> None:
        raise NotImplementedError

    def close(self) -> None:
        pass


class RabbitSink(FrameSink):
    """Publishes frames to RabbitMQ via RabbitPublisher."""

    def __init__(self, publisher: RabbitPublisher) -> None:
        self._publisher = publisher

    def send(self, payload: Dict[str, Any]) -> None:
        self._publisher.publish_json(payload)

    def close(self) -> None:
        self._publisher.close()


class LocalDiskSink(FrameSink):
    """Writes JPEG frames to a local directory for inspection.

    Files are named: <output_dir>/<stream_id>/<stream_id>_<timestamp>.jpg
    The image_data field in the payload is expected to be base64-encoded JPEG.
    """

    def __init__(self, output_dir: str) -> None:
        self._output_dir = output_dir
        self._log = logging.getLogger("disk_sink")

    def send(self, payload: Dict[str, Any]) -> None:
        stream_id = payload.get("stream_id", "unknown")
        timestamp = payload.get("timestamp", utc_iso_now())
        image_b64 = payload.get("image_data", "")

        safe_ts = timestamp.replace(":", "-").replace(".", "-")
        filename = f"{stream_id}_{safe_ts}.jpg"

        stream_dir = os.path.join(self._output_dir, stream_id)
        os.makedirs(stream_dir, exist_ok=True)

        filepath = os.path.join(stream_dir, filename)
        try:
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(image_b64))
        except Exception as e:
            self._log.error("Failed to write frame to %s: %s", filepath, e)


class MultiSink(FrameSink):
    """Fans out to multiple sinks."""

    def __init__(self, sinks: List[FrameSink]) -> None:
        self._sinks = sinks

    def send(self, payload: Dict[str, Any]) -> None:
        for sink in self._sinks:
            sink.send(payload)

    def close(self) -> None:
        for sink in self._sinks:
            sink.close()
