FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY yolox/ ./yolox/
COPY exps/ ./exps/
COPY database.py .
COPY consumer.py .

# Downloads the weights for yolo-s model from official YOLOX GitHub
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    mkdir -p /app/weights && \
    curl -L -o /app/weights/yolox_s.pth \
      https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_s.pth && \
    apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

ENV RABBITMQ_HOST=rabbitmq
ENV QUEUE_NAME=edge_frames
ENV MODEL_NAME=yolox-s
ENV CHECKPOINT_PATH=/app/weights/yolox_s.pth
# Previous defaults: TEST_SIZE=640, CONF_THRESHOLD=0.3, NMS_THRESHOLD=0.3
ENV DEVICE=cpu
ENV TEST_SIZE=1024
ENV CONF_THRESHOLD=0.20
ENV NMS_THRESHOLD=0.45
ENV FP16=False
ENV DISPLAY_OUTPUT=False

CMD ["python", "consumer.py"]
