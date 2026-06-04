import { pool } from "../db/pool.js";

export async function enqueuePipelineJob(
  caseId: string,
  stage: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({ caseId, stage, payload: payload ?? {} });
  await pool.query(
    "INSERT INTO pipeline_jobs (payload, status) VALUES (?, 'pending')",
    [body],
  );
}
