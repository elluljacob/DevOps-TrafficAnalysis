import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoClient } from "@/lib/database";

type CameraData = {
  total_count: number;
  location: string;
  datetime: string;
  status: string;
  detected_classes: string[];
  id: string;
  person_count: number;
  truck_count: number;
  car_count: number;
};

type AggregatedCounts = {
  person_count: number;
  car_count: number;
  truck_count: number;
};

type CameraResult = {
  cameraId: string;
  counts: AggregatedCounts;
};

function randomSample<T>(arr: T[], fraction: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.floor(arr.length * fraction)));
}

export async function aggregateCameraData(
  cameraIds: string[] = ["cam1", "cam2", "cam3"]
): Promise<CameraResult[]> {
  const dynamoDocClient = await getDynamoClient();
  const result: CameraResult[] = [];

  for (const camId of cameraIds) {
    const queryResult = await dynamoDocClient.send(
      new QueryCommand({
        TableName: process.env.DYNAMO_TABLE_NAME,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: { "#id": "id" },
        ExpressionAttributeValues: { ":id": camId },
        ScanIndexForward: false,
        Limit: 100,
      })
    );

    const items = queryResult.Items as CameraData[] | undefined;

    if (!items || items.length === 0) {
      result.push({
        cameraId: camId,
        counts: { person_count: 0, car_count: 0, truck_count: 0 },
      });
      continue;
    }

    const latestTime = new Date(items[0].datetime).getTime();

    const windowItems = items.filter(
      (item) => latestTime - new Date(item.datetime).getTime() <= 5000
    );

    if (windowItems.length === 0) {
      result.push({
        cameraId: camId,
        counts: { person_count: 0, car_count: 0, truck_count: 0 },
      });
      continue;
    }

    const sampledItems = randomSample(windowItems, 0.8);

    // 🔥 Aggregate + Average
    const totals = sampledItems.reduce(
      (acc, item) => {
        acc.person_count += item.person_count;
        acc.car_count += item.car_count;
        acc.truck_count += item.truck_count;
        return acc;
      },
      { person_count: 0, car_count: 0, truck_count: 0 }
    );

    const divisor = sampledItems.length;

    const averaged: AggregatedCounts = {
      person_count: Math.round(totals.person_count / divisor),
      car_count: Math.round(totals.car_count / divisor),
      truck_count: Math.round(totals.truck_count / divisor),
    };

    result.push({
      cameraId: camId,
      counts: averaged,
    });
  }

  return result;
}