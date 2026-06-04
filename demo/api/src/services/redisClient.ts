/** Demo stack: SQLite job queue + in-process WebSocket events (no Redis). */
export { enqueuePipelineJob } from "./jobQueue.js";
export { publishCaseEvent } from "./eventBus.js";

export async function getRedis(): Promise<never> {
  throw new Error("Redis is not used in the demo stack");
}
