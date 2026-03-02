// lib/dynamo.ts

import {
  DynamoDBClient,
  DynamoDBClientConfig,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { log, LogLevel } from "./logger";

const MAX_RETRIES = parseInt(process.env.DYNAMO_RETRY_MAX ?? "50", 10);
const RETRY_INTERVAL = parseInt(
  process.env.DYNAMO_RETRY_INTERVAL_MS ?? "5000",
  10
);
const RETRY_ENABLED = process.env.DYNAMO_RETRY_ENABLED !== "false";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * We store the client and init promise on globalThis
 * so that Next.js hot reload does not recreate them.
 */
declare global {
  // eslint-disable-next-line no-var
  var __dynamoClient: DynamoDBDocumentClient | undefined;
  // eslint-disable-next-line no-var
  var __dynamoInitPromise: Promise<DynamoDBDocumentClient> | undefined;
}

async function createDynamoClient(): Promise<DynamoDBDocumentClient> {
  if (!RETRY_ENABLED) {
    throw new Error("DynamoDB retry disabled via env");
  }

  const config: DynamoDBClientConfig = {
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(
        `[DynamoDB] Init attempt ${attempt}/${MAX_RETRIES}`,
        LogLevel.INFO
      );

      const client = new DynamoDBClient(config);

      // Ping DynamoDB
      await client.send(new ListTablesCommand({ Limit: 1 }));

      const docClient = DynamoDBDocumentClient.from(client);

      log("[DynamoDB] Connected and ping successful", LogLevel.INFO);

      return docClient;
    } catch (err) {
      lastError = err;

      log(
        `[DynamoDB] Connect/ping failed (attempt ${attempt}): ${err}`,
        LogLevel.ERROR
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_INTERVAL);
      }
    }
  }

  throw new Error(
    `[DynamoDB] All retry attempts failed — giving up: ${lastError}`
  );
}

/**
 * Public accessor — always await this before using Dynamo.
 */
export async function getDynamoClient(): Promise<DynamoDBDocumentClient> {
  // If already initialised, return immediately
  if (global.__dynamoClient) {
    return global.__dynamoClient;
  }

  // If initialisation already in progress, wait for it
  if (!global.__dynamoInitPromise) {
    global.__dynamoInitPromise = createDynamoClient().then((client) => {
      global.__dynamoClient = client;
      return client;
    });
  }

  return global.__dynamoInitPromise;
}