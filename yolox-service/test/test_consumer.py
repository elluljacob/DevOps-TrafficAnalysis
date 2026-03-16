import base64
import json

import cv2
import numpy as np
import torch
from unittest.mock import MagicMock

from yolox.data.datasets import COCO_CLASSES
from consumer import process_frame, make_callback


def _make_predictor(fake_output):
    predictor = MagicMock()
    predictor.inference.return_value = ([fake_output], {"ratio": 1.0})
    predictor.cls_names = COCO_CLASSES
    return predictor


def _make_test_image_b64():
    img = np.zeros((64, 64, 3), dtype=np.uint8)
    img[10:50, 10:50] = (0, 255, 0)
    _, buf = cv2.imencode(".jpg", img)
    return base64.b64encode(buf).decode("utf-8")


class TestProcessFrame:
    def test_with_detections(self):
        fake_output = torch.tensor([
            [100, 100, 200, 200, 0.9, 0.8, 2],
            [300, 300, 400, 400, 0.7, 0.6, 0],
        ])
        predictor = _make_predictor(fake_output)
        frame = np.zeros((640, 640, 3), dtype=np.uint8)

        result = process_frame(predictor, frame)

        assert result["total_count"] == 2
        assert result["per_class"]["car"] == 1
        assert result["per_class"]["person"] == 1

    def test_no_detections(self):
        predictor = _make_predictor(None)
        frame = np.zeros((640, 640, 3), dtype=np.uint8)

        result = process_frame(predictor, frame)

        assert result["total_count"] == 0
        assert result["per_class"] == {}


class TestMessageCallback:
    def test_valid_message(self):
        fake_output = torch.tensor([
            [100, 100, 200, 200, 0.9, 0.8, 2],
        ])
        predictor = _make_predictor(fake_output)
        db_writer = MagicMock()

        callback = make_callback(predictor, db_writer)

        message = {
            "timestamp": "2026-03-06T12:00:00Z",
            "stream_id": "cam1",
            "location": "intersection-A",
            "image_data": _make_test_image_b64(),
        }
        ch = MagicMock()
        method = MagicMock()
        method.delivery_tag = 1

        callback(ch, method, None, json.dumps(message).encode())

        # Verify inference was called
        predictor.inference.assert_called_once()
        # Verify DB write was called with correct args
        db_writer.write_inference.assert_called_once()
        call_kwargs = db_writer.write_inference.call_args
        assert call_kwargs[1]["stream_id"] == "cam1"
        assert call_kwargs[1]["location"] == "intersection-A"
        # Verify message was acknowledged
        ch.basic_ack.assert_called_once_with(delivery_tag=1)

    def test_invalid_json(self):
        predictor = _make_predictor(None)
        db_writer = MagicMock()
        callback = make_callback(predictor, db_writer)

        ch = MagicMock()
        method = MagicMock()
        method.delivery_tag = 2

        callback(ch, method, None, b"not valid json")

        predictor.inference.assert_not_called()
        db_writer.write_inference.assert_not_called()
        ch.basic_ack.assert_called_once_with(delivery_tag=2)

    def test_missing_image_data(self):
        predictor = _make_predictor(None)
        db_writer = MagicMock()
        callback = make_callback(predictor, db_writer)

        message = {
            "timestamp": "2026-03-06T12:00:00Z",
            "stream_id": "cam1",
            "location": "intersection-A",
        }
        ch = MagicMock()
        method = MagicMock()
        method.delivery_tag = 3

        callback(ch, method, None, json.dumps(message).encode())

        predictor.inference.assert_not_called()
        db_writer.write_inference.assert_not_called()
        ch.basic_ack.assert_called_once_with(delivery_tag=3)

    def test_corrupt_image_data(self):
        predictor = _make_predictor(None)
        db_writer = MagicMock()
        callback = make_callback(predictor, db_writer)

        message = {
            "timestamp": "2026-03-06T12:00:00Z",
            "stream_id": "cam1",
            "location": "intersection-A",
            "image_data": base64.b64encode(b"not a jpeg").decode("utf-8"),
        }
        ch = MagicMock()
        method = MagicMock()
        method.delivery_tag = 4

        callback(ch, method, None, json.dumps(message).encode())

        predictor.inference.assert_not_called()
        db_writer.write_inference.assert_not_called()
        ch.basic_ack.assert_called_once_with(delivery_tag=4)
