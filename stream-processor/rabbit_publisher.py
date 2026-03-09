import base64
import json
import logging
import urllib.request
from typing import Any, Dict, Optional

import pika


class RabbitPublisher:
    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        queue_name: str,
        aws_mq_uri: str,
        heartbeat: int = 30,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.queue_name = queue_name
        self.aws_mq_uri = aws_mq_uri
        self.heartbeat = heartbeat

        self._connection: Optional[pika.BlockingConnection] = None
        self._channel: Optional[pika.adapters.blocking_connection.BlockingChannel] = (
            None
        )
        self.log = logging.getLogger("rabbit_publisher")

    def connect(self) -> None:
        self.close()
        creds = pika.PlainCredentials(self.username, self.password)
        params = pika.ConnectionParameters(
            host=self.host,
            port=self.port,
            credentials=creds,
            heartbeat=self.heartbeat,
            blocked_connection_timeout=30,
        )
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()

        # --- DLX & OVERFLOW CONFIGURATION ---
        dlx_name = "dlx_overflow"
        overflow_queue = "overflow_frames"

        # 1. Declare the Dead Letter Exchange
        self._channel.exchange_declare(
            exchange=dlx_name, exchange_type="direct", durable=True
        )

        # 2. Declare the local overflow queue
        self._channel.queue_declare(queue=overflow_queue, durable=True)

        # 3. Bind overflow queue to DLX
        self._channel.queue_bind(
            exchange=dlx_name, queue=overflow_queue, routing_key=self.queue_name
        )

        # 4. Declare primary queue (limit to 20 frames, drop oldest to DLX)
        args = {
            "x-max-length": 20,
            "x-overflow": "drop-head",
            "x-dead-letter-exchange": dlx_name,
            "x-dead-letter-routing-key": self.queue_name,
        }
        self._channel.queue_declare(queue=self.queue_name, durable=True, arguments=args)

        # --- AUTOMATIC SHOVEL CREATION ---
        if self.aws_mq_uri:
            self._setup_cloud_shovel(overflow_queue)

    def _setup_cloud_shovel(self, src_queue: str) -> None:
        """Automatically calls the local RabbitMQ API to configure the Shovel to AWS"""
        api_url = (
            f"http://{self.host}:15672/api/parameters/shovel/%2f/aws_cloud_offload"
        )

        # Build the auth header for the local RabbitMQ management API
        auth_str = f"{self.username}:{self.password}".encode("utf-8")
        b64_auth = base64.b64encode(auth_str).decode("utf-8")

        payload = {
            "value": {
                "src-uri": "amqp://localhost",
                "src-queue": src_queue,
                "dest-uri": self.aws_mq_uri,
                "dest-queue": self.queue_name,  # Drops into an AWS queue with the same name
            }
        }

        req = urllib.request.Request(
            api_url, data=json.dumps(payload).encode("utf-8"), method="PUT"
        )
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Basic {b64_auth}")

        try:
            urllib.request.urlopen(req, timeout=5)
            self.log.info("✅ Successfully configured Shovel to AWS MQ.")
        except Exception as e:
            self.log.error(
                f"⚠️ Failed to configure Shovel to AWS. Is the management plugin enabled? Error: {e}"
            )

    def close(self) -> None:
        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
        except Exception:
            pass
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass
        self._channel = None
        self._connection = None

    def publish_json(self, payload: Dict[str, Any]) -> None:
        if not self._channel or self._channel.is_closed:
            self.connect()
        assert self._channel is not None

        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode(
            "utf-8"
        )
        props = pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
        )
        self._channel.basic_publish(
            exchange="", routing_key=self.queue_name, body=body, properties=props
        )
