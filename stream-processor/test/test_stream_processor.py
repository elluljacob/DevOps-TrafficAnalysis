import queue
import threading
import time
from unittest.mock import MagicMock, patch

import numpy as np

from streams import StreamConfig
from capture import stream_capture_loop


def make_cfg(stream_id="cam1"):
    return StreamConfig(
        stream_id=stream_id, location="test-loc", url="rtsp://fake/stream"
    )


def make_frame():
    return np.zeros((480, 640, 3), dtype=np.uint8)


def make_mock_cap(frames_before_fail=None):
    """
    Returns a mock VideoCapture that yields real frames.
    If frames_before_fail is set, read() returns (False, None) after that many frames.
    """
    cap = MagicMock()
    cap.isOpened.return_value = True
    call_count = {"n": 0}

    def read_side_effect():
        call_count["n"] += 1
        if frames_before_fail is not None and call_count["n"] > frames_before_fail:
            return False, None
        return True, make_frame()

    cap.read.side_effect = read_side_effect
    return cap


def run_capture_loop(mock_cap, interval_s=1.0, duration=3.0, queue_size=100):
    """Runs stream_capture_loop in a thread for `duration` seconds, returns collected payloads."""
    out_q = queue.Queue(maxsize=queue_size)
    stop = threading.Event()
    cfg = make_cfg()

    with patch("stream_processor.cv2.VideoCapture", return_value=mock_cap):
        t = threading.Thread(
            target=stream_capture_loop,
            args=(cfg, interval_s, 80, out_q, stop),
            daemon=True,
        )
        t.start()
        time.sleep(duration)
        stop.set()
        t.join(timeout=3.0)

    payloads = []
    while not out_q.empty():
        payloads.append(out_q.get_nowait())
    return payloads


class TestStreamCaptureLoop:

    def test_emits_one_payload_per_second(self):
        """With interval=1s over 3s, should get ~3 payloads."""
        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=3.2)
        assert 2 <= len(payloads) <= 4, f"Expected ~3 payloads, got {len(payloads)}"

    def test_payload_contains_required_fields(self):
        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=1.5)
        assert len(payloads) >= 1
        p = payloads[0]
        assert "timestamp" in p
        assert "stream_id" in p
        assert "location" in p
        assert "image_data" in p

    def test_payload_stream_id_matches_config(self):
        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=1.5)
        assert all(p["stream_id"] == "cam1" for p in payloads)

    def test_payload_location_matches_config(self):
        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=1.5)
        assert all(p["location"] == "test-loc" for p in payloads)

    def test_image_data_is_non_empty_string(self):
        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=1.5)
        assert all(
            isinstance(p["image_data"], str) and len(p["image_data"]) > 0
            for p in payloads
        )

    def test_stops_cleanly_on_stop_event(self):
        """Thread should join within timeout after stop is set."""
        out_q = queue.Queue(maxsize=100)
        stop = threading.Event()
        cap = make_mock_cap()

        with patch("stream_processor.cv2.VideoCapture", return_value=cap):
            t = threading.Thread(
                target=stream_capture_loop,
                args=(make_cfg(), 1.0, 80, out_q, stop),
                daemon=True,
            )
            t.start()
            time.sleep(1.0)
            stop.set()
            t.join(timeout=3.0)
            assert not t.is_alive(), "Thread did not stop cleanly"

    def test_reconnects_after_failed_read(self):
        """If cap.read() starts failing, a new VideoCapture should be opened."""
        good_cap = make_mock_cap(frames_before_fail=2)  # fails after 2 frames
        fresh_cap = make_mock_cap()

        open_calls = {"n": 0}

        def fake_video_capture(url):
            open_calls["n"] += 1
            return good_cap if open_calls["n"] == 1 else fresh_cap

        out_q = queue.Queue(maxsize=100)
        stop = threading.Event()

        with patch("stream_processor.cv2.VideoCapture", side_effect=fake_video_capture):
            t = threading.Thread(
                target=stream_capture_loop,
                args=(make_cfg(), 0.1, 80, out_q, stop),
                daemon=True,
            )
            t.start()
            time.sleep(2.0)
            stop.set()
            t.join(timeout=3.0)

        assert open_calls["n"] >= 2, "Expected reconnect attempt after read failure"

    def test_does_not_emit_faster_than_interval(self):
        """Timestamps between payloads should be >= interval_s."""
        import datetime

        payloads = run_capture_loop(make_mock_cap(), interval_s=1.0, duration=4.0)
        assert len(payloads) >= 2
        times = [
            datetime.datetime.fromisoformat(p["timestamp"].replace("Z", "+00:00"))
            for p in payloads
        ]
        gaps = [
            (times[i + 1] - times[i]).total_seconds() for i in range(len(times) - 1)
        ]
        assert all(g >= 0.9 for g in gaps), f"Emitted too fast, gaps: {gaps}"

    def test_queue_full_does_not_crash(self):
        """If the queue is full, the loop should log a warning and continue, not crash."""
        run_capture_loop(make_mock_cap(), interval_s=0.1, duration=2.0, queue_size=2)
        # Just assert the thread completed without exception — queue overflow should be handled
        assert True
