import { createClient, type RedisClientType } from "redis";
import { config } from "../config.js";

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (!client) {
    client = createClient({ url: config.redisUrl });
    client.on("error", (err) => console.error("Redis error", err));
    await client.connect();
  }
  return client;
}

export async function enqueuePipelineJob(
  caseId: string,
  stage: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const redis = await getRedis();
  await redis.lPush(
    "ait:pipeline:jobs",
    JSON.stringify({
      caseId,
      stage,
      payload: payload ?? {},
      enqueuedAt: new Date().toISOString(),
    }),
  );
}

export async function publishCaseEvent(
  caseId: string,
  event: Record<string, unknown>,
): Promise<void> {
  const redis = await getRedis();
  await redis.publish(`case:${caseId}:events`, JSON.stringify(event));
}
