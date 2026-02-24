## Stream Processor

Deze service leest **meerdere streams** (bv. RTSP/HLS), pakt elke ~`0.2s` een frame per stream, en pusht die frames als JSON naar **RabbitMQ**.

### Payload format (RabbitMQ message)

Zelfde velden als je bestaande `yolox-service/example-rabbitmq/producer.py`:

- `location`
- `stream_id`
- `timestamp` (UTC ISO met `Z`)
- `image_data` (JPEG base64)

### Config: `streams.json`

Maak een `streams.json` (of start van `streams.example.json`) met:

```json
[
  { "stream_id": "cam-001", "location": "bldg4-floor2", "url": "rtsp://..." }
]
```

### Run (Docker Compose)

1. Kopieer voorbeeld:

```bash
cp streams.example.json streams.json
```

2. Vul je echte stream URLs in (`streams.json`)
3. Start RabbitMQ + stream processor:

```bash
docker compose up --build
```

RabbitMQ UI staat dan op `http://localhost:15672` (guest/guest).

### Run (lokaal, Python)

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python stream_processor.py --streams streams.json
```

### Belangrijke env vars

- `FRAME_INTERVAL_S` (default `0.2`)
- `QUEUE_NAME` (default `edge_frames`)
- `RABBITMQ_HOST` / `RABBITMQ_PORT` / `RABBITMQ_USERNAME` / `RABBITMQ_PASSWORD`
- `JPEG_QUALITY` (default `80`)

