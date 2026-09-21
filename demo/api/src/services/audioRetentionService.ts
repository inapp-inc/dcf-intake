import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { getBytes } from "./artifactStore.js";

export type CaseAudioSource = "live" | "upload";

export interface CaseAudioArtifactRow {
  id: string;
  caseId: string;
  audioKey: string;
  source: CaseAudioSource;
  sessionId: string | null;
  chunkIndex: number | null;
  byteSize: number;
  retained: boolean;
  transcribed: boolean;
  createdAt: string;
}

function artifactPath(audioKey: string): string {
  return join(config.artifactDir, audioKey);
}

export async function registerCaseAudioArtifact(params: {
  caseId: string;
  audioKey: string;
  source: CaseAudioSource;
  sessionId?: string;
  chunkIndex?: number;
  byteSize: number;
}): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO case_audio_artifacts
       (id, case_id, audio_key, source, session_id, chunk_index, byte_size, retained, transcribed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 0)
     ON CONFLICT (case_id, audio_key) DO UPDATE SET byte_size = excluded.byte_size`,
    [
      id,
      params.caseId,
      params.audioKey,
      params.source,
      params.sessionId ?? null,
      params.chunkIndex ?? null,
      params.byteSize,
    ],
  );
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM case_audio_artifacts WHERE case_id = $1 AND audio_key = $2",
    [params.caseId, params.audioKey],
  );
  return rows[0]?.id ?? id;
}

export async function markAudioTranscribed(caseId: string, audioKey: string): Promise<void> {
  await query(
    "UPDATE case_audio_artifacts SET transcribed = 1 WHERE case_id = $1 AND audio_key = $2",
    [caseId, audioKey],
  );
}

export async function listCaseAudioArtifacts(caseId: string): Promise<CaseAudioArtifactRow[]> {
  const { rows } = await query<{
    id: string;
    caseId: string;
    audioKey: string;
    source: CaseAudioSource;
    sessionId: string | null;
    chunkIndex: number | null;
    byteSize: number;
    retained: number;
    transcribed: number;
    createdAt: string;
  }>(
    `SELECT id, case_id AS "caseId", audio_key AS "audioKey", source,
            session_id AS "sessionId", chunk_index AS "chunkIndex", byte_size AS "byteSize",
            retained, transcribed, created_at AS "createdAt"
     FROM case_audio_artifacts
     WHERE case_id = $1 AND retained = 1
     ORDER BY created_at ASC, chunk_index ASC NULLS LAST`,
    [caseId],
  );
  return rows.map((r) => ({
    ...r,
    retained: Boolean(r.retained),
    transcribed: Boolean(r.transcribed),
  }));
}

export async function getCaseAudioArtifact(
  caseId: string,
  artifactId: string,
): Promise<CaseAudioArtifactRow | null> {
  const { rows } = await query<{
    id: string;
    caseId: string;
    audioKey: string;
    source: CaseAudioSource;
    sessionId: string | null;
    chunkIndex: number | null;
    byteSize: number;
    retained: number;
    transcribed: number;
    createdAt: string;
  }>(
    `SELECT id, case_id AS "caseId", audio_key AS "audioKey", source,
            session_id AS "sessionId", chunk_index AS "chunkIndex", byte_size AS "byteSize",
            retained, transcribed, created_at AS "createdAt"
     FROM case_audio_artifacts
     WHERE case_id = $1 AND id = $2 AND retained = 1`,
    [caseId, artifactId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    retained: Boolean(row.retained),
    transcribed: Boolean(row.transcribed),
  };
}

export function readArtifactBytes(audioKey: string): Buffer {
  return getBytes(audioKey);
}

/** Remove retained audio files after supervisor screening decision. */
export async function releaseCaseAudio(caseId: string): Promise<number> {
  const { rows } = await query<{ audioKey: string }>(
    "SELECT audio_key AS \"audioKey\" FROM case_audio_artifacts WHERE case_id = $1 AND retained = 1",
    [caseId],
  );
  let removed = 0;
  for (const row of rows) {
    const path = artifactPath(row.audioKey);
    if (existsSync(path)) {
      unlinkSync(path);
      removed += 1;
    }
  }
  await query("UPDATE case_audio_artifacts SET retained = 0 WHERE case_id = $1", [caseId]);
  return removed;
}
