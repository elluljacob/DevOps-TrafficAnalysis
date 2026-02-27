import os
import json
import time
import base64
from collections import Counter
from database import DynamoDBWriter

import ssl
import pika
import cv2
import numpy as np
import torch
from loguru import logger

from yolox.data.data_augment import ValTransform
from yolox.data.datasets import COCO_CLASSES
from yolox.exp import get_exp
from yolox.utils import get_model_info, postprocess


RABBITMQ_HOST   = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASSWORD", "guest")

QUEUE_NAME      = os.getenv("QUEUE_NAME", "edge_frames")
MODEL_NAME      = os.getenv("MODEL_NAME", "yolox-s")
CHECKPOINT_PATH = os.getenv("CHECKPOINT_PATH", "/app/weights/yolox_s.pth")
DEVICE          = os.getenv("DEVICE", "cpu")
CONF_THRESHOLD  = float(os.getenv("CONF_THRESHOLD", "0.3"))
NMS_THRESHOLD   = float(os.getenv("NMS_THRESHOLD", "0.3"))
FP16            = os.getenv("FP16", "False").lower() == "true"
DISPLAY_OUTPUT  = os.getenv("DISPLAY_OUTPUT", "False").lower() == "true"

# ported from model/main.py
class Predictor:
    def __init__(self, model, exp, cls_names=COCO_CLASSES, device="cpu", fp16=False):
        self.model = model
        self.cls_names = cls_names
        self.num_classes = exp.num_classes
        self.confthre = exp.test_conf
        self.nmsthre = exp.nmsthre
        self.test_size = exp.test_size
        self.device = device
        self.fp16 = fp16
        self.preproc = ValTransform(legacy=False)

    def inference(self, img):
        img_info = {}
        height, width = img.shape[:2]
        img_info["height"] = height
        img_info["width"] = width

        ratio = min(self.test_size[0] / height, self.test_size[1] / width)
        img_info["ratio"] = ratio

        processed, _ = self.preproc(img, None, self.test_size)
        tensor = torch.from_numpy(processed).unsqueeze(0).float()
        if self.device == "gpu":
            tensor = tensor.cuda()
            if self.fp16:
                tensor = tensor.half() # to FP16

        with torch.no_grad():
            t0 = time.time()
            outputs = self.model(tensor)
            outputs = postprocess(
                outputs, self.num_classes, self.confthre,
                self.nmsthre, class_agnostic=True,
            )
            logger.debug("Infer time: {:.4f}s".format(time.time() - t0))

        return outputs, img_info


def load_model():
    exp = get_exp(None, MODEL_NAME)
    exp.test_conf = CONF_THRESHOLD
    exp.nmsthre = NMS_THRESHOLD

    model = exp.get_model()
    logger.info("Model: {} | {}".format(MODEL_NAME, get_model_info(model, exp.test_size)))

    if DEVICE == "gpu":
        model.cuda()
        if FP16:
            model.half() # to FP16
    model.eval()

    logger.info("Loading checkpoint from {}".format(CHECKPOINT_PATH))
    if not os.path.exists(CHECKPOINT_PATH):
        raise FileNotFoundError(
            f"Checkpoint not found at {CHECKPOINT_PATH}. "
            "Place a YOLOX .pth file there or set CHECKPOINT_PATH env var."
        )

    ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu")
    # Some checkpoints store weights under ckpt['model'], others are a plain state_dict.
    state_dict = ckpt["model"] if isinstance(ckpt, dict) and "model" in ckpt else ckpt
    model.load_state_dict(state_dict)
    logger.info("Checkpoint loaded.")

    return Predictor(model, exp, COCO_CLASSES, device=DEVICE)


def process_frame(predictor, frame):
    outputs, img_info = predictor.inference(frame)
    output = outputs[0]

    if output is None:
        return {"total_count": 0, "per_class": {}}

    output = output.cpu()
    ratio = img_info["ratio"]
    scores = (output[:, 4] * output[:, 5]).numpy() # can be used later if we want to incorperate confidence scores
    class_ids = output[:, 6].int().numpy()

    class_names = [predictor.cls_names[int(cid)] for cid in class_ids]
    return {
        "total_count": len(class_ids),
        "per_class": dict(Counter(class_names)),
    }


def make_callback(predictor, db_writer):
    """
    (Definitely not AI that told me to do this)
    basic_consume expects a callback with the fixed signature
    (ch, method, properties, body) and provides no way to pass extra
    arguments.  This closure captures `predictor` so the inner
    callback can use it without relying on global state.
    """

    def on_message_received(ch, method, properties, body):
        try:
            message = json.loads(body)

            # Extract Metadata
            timestamp = message.get("timestamp")
            stream_id = message.get("stream_id")
            location = message.get("location")
            image_data_base64 = message.get("image_data")

            if not image_data_base64:
                logger.warning("No image data in message from {}".format(stream_id))
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return


            img_bytes = base64.b64decode(image_data_base64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                logger.error("Failed to decode image from {}".format(stream_id))
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            # Run YOLOX inference
            result = process_frame(predictor, frame)

            # Temporary json logging, eventually write to dynamoDB
            log_entry = {
                "timestamp": timestamp,
                "stream_id": stream_id,
                "location": location,
                "total_count": result["total_count"],
                "per_class": result["per_class"],
            }
            logger.info(json.dumps(log_entry))

            db_writer.write_inference(
                stream_id=message.get("stream_id"),
                location=message.get("location"),
                result=result
            )
            logger.info("Wrote to DynamoDB - remove after working")

            if DISPLAY_OUTPUT:
                cv2.putText(frame, f"Total Count: {result['total_count']}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.imshow("YOLOX Inference", frame)
                cv2.waitKey(1)

            # Acknowledge after successful processing
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except json.JSONDecodeError:
            logger.error("Could not decode JSON body")
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error("Error processing message: {}".format(e))
            ch.basic_ack(delivery_tag=method.delivery_tag)

    return on_message_received


def main():
    predictor = load_model()
    db_writer = DynamoDBWriter()

    # Setup Credentials
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    
    # AWS/SSL Logic: Use SSL if port is 5671
    ssl_options = None
    if RABBITMQ_PORT == 5671:
        logger.info("Configuring SSL for Amazon MQ")
        context = ssl.create_default_context()
        ssl_options = pika.SSLOptions(context)

    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        ssl_options=ssl_options,
        heartbeat=600
    )

    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # --- MUST MATCH PUBLISHER EXACTLY ---
    args = {
        "x-max-length": 20,
        "x-overflow": "drop-head",
        "x-dead-letter-exchange": "dlx_overflow",
        "x-dead-letter-routing-key": QUEUE_NAME
    }
    
    # Declare with the identical arguments dictionary
    channel.queue_declare(queue=QUEUE_NAME, durable=True, arguments=args)
    # ------------------------------------

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=make_callback(predictor, db_writer), auto_ack=False)
    
    logger.info("Consumer started — waiting for frames on '{}'".format(QUEUE_NAME))

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        channel.stop_consuming()
        connection.close()


if __name__ == "__main__":
    main()
