import { query } from "../db/pool.js";
import type { Form51ADocument } from "../domain/form51a/document.js";
import { createEmptyDocument } from "../domain/form51a/document.js";

export async function loadDocument(caseId: string): Promise<Form51ADocument | null> {
  const { rows } = await query<{ document_json: string }>(
    "SELECT document_json FROM form_51a_documents WHERE case_id = $1",
    [caseId],
  );
  if (!rows[0]?.document_json) return null;
  try {
    return JSON.parse(rows[0].document_json) as Form51ADocument;
  } catch {
    return null;
  }
}

export async function saveDocument(doc: Form51ADocument): Promise<void> {
  const payload = JSON.stringify({ ...doc, updatedAt: new Date().toISOString() });
  await query(
    `INSERT INTO form_51a_documents (case_id, document_json, updated_at)
     VALUES ($1, $2, datetime('now'))
     ON CONFLICT (case_id) DO UPDATE SET
       document_json = excluded.document_json,
       updated_at = datetime('now')`,
    [doc.caseId, payload],
  );
}

export async function ensureDocumentRow(caseId: string): Promise<Form51ADocument> {
  const existing = await loadDocument(caseId);
  if (existing) return existing;
  const doc = createEmptyDocument(caseId);
  await saveDocument(doc);
  return doc;
}
