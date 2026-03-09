# Minimal runtime image for the stream processor
FROM python:3.11-slim

WORKDIR /app

# OpenCV on slim often needs these runtime libs
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/stream_processor.py ./stream_processor.py
COPY src/rabbit_publisher.py ./rabbit_publisher.py
COPY src/capture.py           ./capture.py
COPY src/streams.py           ./streams.py
COPY src/sinks.py             ./sinks.py
COPY src/utils.py             ./utils.py

CMD ["python", "/app/stream_processor.py"]

