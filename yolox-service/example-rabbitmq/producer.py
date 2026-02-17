import pika
import json
import base64
import time
import datetime
import cv2
import numpy as np

# Config:
# local testing -> 'localhost'. 
RABBITMQ_HOST = 'localhost' 
QUEUE_NAME = 'edge_frames' # example name

def create_dummy_image(): # AI did this
    """Creates a simple dummy image (a colored square with a timestamp)."""
    # Create a black image
    img = np.zeros((480, 640, 3), np.uint8)
    # Add a colored rectangle that changes based on time
    color_val = int(time.time() * 100) % 255
    cv2.rectangle(img, (100, 100), (540, 380), (color_val, 255 - color_val, 128), -1)
    # Add some text
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, 'Dummy Edge Stream', (150, 240), font, 1, (255, 255, 255), 2, cv2.LINE_AA)
    return img

def main():
    # Establish connection to RabbitMQ and declare the queue
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME)

    print(f" [*] Producer started. Publishing to '{QUEUE_NAME}'")

    try:
        while True:
            # --- Prepare the Message ---
            
            # a. Get current info
            timestamp = datetime.datetime.utcnow().isoformat() + 'Z'
            stream_id = 'camera-stream-001'
            location = 'edge-location-bldg4-floor2'

            # b. Create/Get the image
            image = create_dummy_image()
            
            # c. Encode image to JPEG, then to base64 string
            _, buffer = cv2.imencode('.jpg', image)
            image_base64 = base64.b64encode(buffer).decode('utf-8')

            # d. Create the payload dictionary
            message_payload = {
                'timestamp': timestamp,
                'stream_id': stream_id,
                'location': location,
                'image_data': image_base64
            }

            # e. Serialise dictionary to JSON string
            message_json = json.dumps(message_payload)

            # Publish the Message 
            channel.basic_publish(
                exchange='',
                routing_key=QUEUE_NAME,
                body=message_json
            )

            print(f" [x] Sent frame for {stream_id} at {timestamp}")
            
            # Simulate a frame rate (e.g., 1 frame per second)
            time.sleep(1.0)

    except KeyboardInterrupt:
        print(" [*] Stopping producer...")
        connection.close()

if __name__ == '__main__':
    main()