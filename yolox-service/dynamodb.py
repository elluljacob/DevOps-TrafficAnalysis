import boto3
from datetime import datetime, timezone
import json

# 1. Initialize the DynamoDB resource
# Boto3 automatically picks up the credentials from the environment variables we exported
dynamodb = boto3.resource('dynamodb', region_name='eu-north-1')

# Connect to your specific table
table = dynamodb.Table('Traffic-Metrics')

def write_dummy_data():
    # 2. Create the dummy JSON payload
    # Note: 'id' and 'datetime' must be strings as defined in your table schema
    dummy_item = {
        'id': 'edge-camera-001',                             # Partition Key (String)
        'datetime': datetime.now(timezone.utc).isoformat(),  # Sort Key (String)
        'vehicle_count': 12,                                 # Number
        'detected_classes': ['car', 'truck', 'bus'],         # List
        'status': 'test_from_edge'                           # String
    }
    
    print(f"Attempting to write item:\n{json.dumps(dummy_item, indent=2)}")

    # 3. Write to DynamoDB
    try:
        response = table.put_item(Item=dummy_item)
        
        # A successful response usually returns an HTTP 200 status code
        status_code = response.get('ResponseMetadata', {}).get('HTTPStatusCode')
        
        if status_code == 200:
            print("\n✅ Success! Data written to DynamoDB.")
        else:
            print(f"\n⚠️ Written, but received unexpected status code: {status_code}")
            print(response)
            
    except Exception as e:
        print("\n❌ Error writing to DynamoDB:")
        print(e)

if __name__ == "__main__":
    write_dummy_data()