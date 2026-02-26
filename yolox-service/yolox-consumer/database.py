import boto3
from datetime import datetime, timezone
import os
from loguru import logger

class DynamoDBWriter:
    def __init__(self, table_name='Traffic-Metrics', region='eu-north-1'):
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)

    def write_inference(self, stream_id, location, result):
        """
        Formats and writes YOLOX results to DynamoDB.
        'result' expects: {'total_count': X, 'per_class': {'class': count}}
        """
        # We extract counts safely, defaulting to 0 if the class wasn't found
        counts = result.get("per_class", {})
        
        item = {
            'id': stream_id,                                     # Partition Key
            'datetime': datetime.now(timezone.utc).isoformat(),  # Sort Key
            'location': location,
            'total_count': result.get("total_count", 0),
            'person_count': counts.get("person", 0),
            'car_count': counts.get("car", 0),
            'truck_count': counts.get("truck", 0),
            'detected_classes': list(counts.keys()),             # List of strings found
            'status': 'active_inference'
        }

        try:
            self.table.put_item(Item=item)
            return True
        except Exception as e:
            logger.error(f"Failed to write to DynamoDB: {e}")
            return False