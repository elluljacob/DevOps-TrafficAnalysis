import pika
import json
import base64
import numpy as np
import cv2

# Config:
# local testing -> 'localhost'. 
RABBITMQ_HOST = 'localhost' 
QUEUE_NAME = 'edge_frames' # example name

def on_message_received(ch, method, properties, body):
    """
    Callback function that is triggered when a message is received.
    """
    try:
        # Deserialize the JSON message body
        message = json.loads(body)

        # Extract Metadata
        timestamp = message.get('timestamp')
        stream_id = message.get('stream_id')
        location = message.get('location')
        image_data_base64 = message.get('image_data')

        print(f" [✓] Received message:") # definately didn't ask ai to make boilerplate code
        print(f"      - Stream ID: {stream_id}")
        print(f"      - Location:  {location}")
        print(f"      - Timestamp: {timestamp}")
        
        # Decode the image
        if image_data_base64:
            # Decode base64 string to bytes
            img_bytes = base64.b64decode(image_data_base64)
            
            # Then convert bytes to numpy array
            nparr = np.frombuffer(img_bytes, np.uint8)
            
            # Decode image from numpy array
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            # INSERT YOLOX INFERENCE HERE
            # ---
            # For this demo, we'll just display the received frame so you guys get a good idea 
            
            # Add the received metadata to the image for visualization
            label = f"{stream_id} | {timestamp}"
            cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                        0.6, (0, 255, 0), 2)
            
            cv2.imshow('Edge Consumer - Received Frame', frame)
            # Wait for 1ms to allow the image window to refresh
            cv2.waitKey(1)
            
        else:
            print("      - [!] No image data found in message.")
            # ---

    except json.JSONDecodeError:
        print(" [!] Error: Could not decode JSON body.")
    except Exception as e:
        print(f" [!] An error occurred: {e}")
        

def main():
    # Establish connection to RabbitMQ
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    # Declare the queue (idempotent: does nothing if it already exists)
    channel.queue_declare(queue=QUEUE_NAME)

    # Set prefetch count. This tells RabbitMQ not to give more than one
    #    message to a worker at a time until the previous one is processed.
    channel.basic_qos(prefetch_count=1)

    # Configure the consumer
    #    auto_ack=True means the message is automatically acknowledged as soon
    #    as it's received. 
    # 
    # For the real ML pipeline, we could set this to False and manually ack after inference is done.
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message_received, auto_ack=True)

    print(f" [*] Consumer started. Waiting for messages in '{QUEUE_NAME}'.")
    print(" [*] A window will open showing the received video frames.")
    print(" [*] Press CTRL+C in this terminal to exit.")

    try:
        # Start consuming loop
        channel.start_consuming()
    except KeyboardInterrupt:
        print(" [*] Stopping consumer...")
        # Clean up resources
        channel.stop_consuming()
        connection.close()
        cv2.destroyAllWindows()

if __name__ == '__main__':
    main()