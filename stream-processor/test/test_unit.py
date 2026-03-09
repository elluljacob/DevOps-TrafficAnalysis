import base64
import json
from pathlib import Path

import cv2
import numpy as np
import pytest

from streams import StreamConfig
from capture import encode_frame_jpeg_base64
from streams import load_streams


# helpers
def write_json(tmp_path: Path, data) -> str:
    p = tmp_path / "streams.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return str(p)


def make_frame(h=480, w=640) -> np.ndarray:
    """Returns a random BGR frame."""
    return np.random.randint(0, 255, (h, w, 3), dtype=np.uint8)


# load stream test


class TestLoadStreams:

    def test_valid_config_returns_stream_configs(self, tmp_path):
        data = [
            {"stream_id": "cam1", "location": "L42", "url": "rtsp://localhost/cam1"}
        ]
        result = load_streams(write_json(tmp_path, data))
        assert len(result) == 1
        assert result[0] == StreamConfig(
            stream_id="cam1", location="L42", url="rtsp://localhost/cam1"
        )

    def test_multiple_streams(self, tmp_path):
        data = [
            {"stream_id": "cam1", "location": "L42", "url": "rtsp://localhost/cam1"},
            {"stream_id": "cam2", "location": "SP", "url": "rtsp://localhost/cam2"},
            {"stream_id": "cam3", "location": "BM", "url": "rtsp://localhost/cam3"},
        ]
        result = load_streams(write_json(tmp_path, data))
        assert len(result) == 3
        assert [s.stream_id for s in result] == ["cam1", "cam2", "cam3"]

    def test_raises_if_not_a_list(self, tmp_path):
        with pytest.raises(ValueError, match="must be a JSON array"):
            load_streams(write_json(tmp_path, {"stream_id": "cam1"}))

    def test_raises_if_entry_not_a_dict(self, tmp_path):
        with pytest.raises(ValueError, match="must be an object"):
            load_streams(write_json(tmp_path, ["not_a_dict"]))

    @pytest.mark.parametrize("missing_key", ["stream_id", "location", "url"])
    def test_raises_if_required_key_missing(self, tmp_path, missing_key):
        entry = {"stream_id": "cam1", "location": "L42", "url": "rtsp://localhost/cam1"}
        del entry[missing_key]
        with pytest.raises(ValueError, match=f"missing '{missing_key}'"):
            load_streams(write_json(tmp_path, [entry]))

    @pytest.mark.parametrize("empty_key", ["stream_id", "location", "url"])
    def test_raises_if_required_key_empty(self, tmp_path, empty_key):
        entry = {"stream_id": "cam1", "location": "L42", "url": "rtsp://localhost/cam1"}
        entry[empty_key] = ""
        with pytest.raises(ValueError, match=f"missing '{empty_key}'"):
            load_streams(write_json(tmp_path, [entry]))

    def test_raises_on_empty_list(self, tmp_path):
        """Empty config is technically valid JSON but should produce no streams."""
        result = load_streams(write_json(tmp_path, []))
        assert result == []

    def test_fields_are_cast_to_str(self, tmp_path):
        data = [{"stream_id": 1, "location": 42, "url": "rtsp://localhost/cam1"}]
        result = load_streams(write_json(tmp_path, data))
        assert result[0].stream_id == "1"
        assert result[0].location == "42"


# encoding tests


class TestEncodeFrameJpegBase64:

    def test_returns_valid_base64_string(self):
        result = encode_frame_jpeg_base64(make_frame(), jpeg_quality=80)
        assert isinstance(result, str)
        # Should not raise
        decoded = base64.b64decode(result)
        assert len(decoded) > 0

    def test_decoded_bytes_are_valid_jpeg(self):
        result = encode_frame_jpeg_base64(make_frame(), jpeg_quality=80)
        decoded = base64.b64decode(result)
        # JPEG magic bytes: FF D8
        assert decoded[:2] == b"\xff\xd8"

    def test_decoded_image_matches_original_shape(self):
        frame = make_frame(h=480, w=640)
        result = encode_frame_jpeg_base64(frame, jpeg_quality=80)
        decoded = base64.b64decode(result)
        arr = np.frombuffer(decoded, np.uint8)
        recovered = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        assert recovered.shape == frame.shape

    @pytest.mark.parametrize("quality", [1, 50, 95])
    def test_valid_quality_levels(self, quality):
        result = encode_frame_jpeg_base64(make_frame(), jpeg_quality=quality)
        assert isinstance(result, str)

    def test_higher_quality_produces_larger_output(self):
        frame = make_frame()
        low = encode_frame_jpeg_base64(frame, jpeg_quality=1)
        high = encode_frame_jpeg_base64(frame, jpeg_quality=95)
        assert len(high) > len(low)

    def test_raises_on_invalid_frame(self):
        with pytest.raises(RuntimeError, match="Failed to encode frame"):
            encode_frame_jpeg_base64(np.array([]), jpeg_quality=80)
