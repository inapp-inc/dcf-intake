import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { llmChat } from "./llmService.js";

const REQUIRED_MARKERS = ["FINDINGS", "DETERMINATION", "VISIT"];

export async function saveFieldNotes(caseId: string, text: string): Promise<void> {
  await query("UPDATE cases SET field_notes = $2, updated_at = now() WHERE id = $1", [caseId, text]);
}

export async function generateDraft(caseId: string, fieldNotes: string): Promise<{
  version: number;
  content: string;
  aiGenerated: boolean;
  status: string;
}> {
  const { rows: caseRows } = await query<{
    external_id: string;
    child_display: string | null;
    field_notes: string;
  }>("SELECT external_id, child_display, field_notes FROM cases WHERE id = $1", [caseId]);
  if (!caseRows[0]) throw Object.assign(new Error("Case not found"), { status: 404 });

  const notes = fieldNotes || caseRows[0].field_notes || "";
  const child = caseRows[0].child_display ?? "Child";
  const visitDate = new Date().toLocaleDateString();

  let content: string;
  try {
    content = await llmChat(
      "You draft DCF 51B field investigation reports. Use professional tone. Include FINDINGS and DETERMINATION sections.",
      `Case ${caseRows[0].external_id}, child ${child}, visit ${visitDate}.\nField notes:\n${notes}\nDraft the report body.`,
    );
  } catch {
    content = `CASE: ${caseRows[0].external_id} — ${child}
VISIT DATE: ${visitDate}

FINDINGS:
${notes || "[Enter field observations]"}

DETERMINATION: [SUPPORTED / SUBSTANTIATED CONCERN / UNSUPPORTED — worker must finalize]

[Worker signature and supervisor approval required]`;
  }

  const { rows: versions } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM report_51b_versions WHERE case_id = $1`,
    [caseId],
  );
  const version = parseInt(versions[0]?.count ?? "0", 10) + 1;

  await query(
    `INSERT INTO report_51b_versions (id, case_id, content, status)
     VALUES ($1, $2, $3, 'draft')`,
    [uuidv4(), caseId, JSON.stringify({ text: content, version })],
  );

  return { version, content, aiGenerated: true, status: "draft" };
}

export async function getLatestDraft(caseId: string): Promise<{
  version: number;
  content: string;
  aiGenerated: boolean;
  status: string;
} | null> {
  const { rows } = await query<{ content: { text?: string; version?: number }; status: string }>(
    `SELECT content, status FROM report_51b_versions WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  if (!rows[0]) return null;
  return {
    version: rows[0].content.version ?? 1,
    content: rows[0].content.text ?? "",
    aiGenerated: true,
    status: rows[0].status,
  };
}

export async function approveDraft(
  caseId: string,
  approvedBy: string,
  editedContent?: string,
): Promise<void> {
  if (editedContent) {
    await query(
      `UPDATE report_51b_versions SET content = $2, status = 'worker_approved', approved_by = $3
       WHERE case_id = $1 AND id = (
         SELECT id FROM report_51b_versions WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1
       )`,
      [caseId, JSON.stringify({ text: editedContent }), approvedBy],
    );
  } else {
    await query(
      `UPDATE report_51b_versions SET status = 'worker_approved', approved_by = $2
       WHERE case_id = $1 AND id = (
         SELECT id FROM report_51b_versions WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1
       )`,
      [caseId, approvedBy],
    );
  }
  await query("UPDATE cases SET status = 'report_submitted', updated_at = now() WHERE id = $1", [caseId]);
}

export function complianceCheck(content: string): { passed: boolean; missingFields: string[] } {
  const missing: string[] = [];
  for (const marker of REQUIRED_MARKERS) {
    if (!content.toUpperCase().includes(marker)) missing.push(marker);
  }
  if (content.trim().length < 100) missing.push("MIN_LENGTH");
  return { passed: missing.length === 0, missingFields: missing };
}
