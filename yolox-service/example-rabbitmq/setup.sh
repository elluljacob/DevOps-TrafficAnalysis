#!/bin/bash
if [ ! -d "venv" ]; then
    # Create the virtual environment
    python3 -m venv venv
    echo "   Virtual environment created"
fi

./venv/bin/pip install pika opencv-python numpy
source venv/bin/activate

if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

if [ "$(docker ps -aq -f name=some-rabbit)" ]; then
    echo "   Container 'some-rabbit' already exists."
    # Check if it's currently running
    if [ "$(docker ps -q -f name=some-rabbit)" ]; then
        echo "It is already running."
    else
        echo "Starting existing container..."
        docker start some-rabbit
    fi
else
    # Run a fresh container if it doesn't exist
    echo "Running new RabbitMQ container..."
    docker run -d --hostname my-rabbit --name some-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
fi

echo "👉 RabbitMQ Management UI: http://localhost:15672 (user/pass: guest/guest)"
