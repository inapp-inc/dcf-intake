import { query } from "../db/pool.js";
import { FORM_CATALOG, SECTION_IDS, type SectionId } from "../domain/form51a/fieldCatalog.js";
import type { CheckpointStatus, FieldSource, Form51A, Form51AField } from "../domain/form51a/types.js";
import { computeCompletion } from "../usecases/form51a/completion.js";

export async function seedFormFieldsForCase(caseId: string): Promise<void> {
  for (const sectionId of SECTION_IDS) {
    const sec = FORM_CATALOG[sectionId];
    for (const f of sec.fields) {
      await query(
        `INSERT INTO form_51a_fields
         (case_id, section_id, field_id, label, required, value, source, confirmed_by_human, missing, multiline)
         VALUES ($1,$2,$3,$4,$5,'','human',false,$6,$7)
         ON CONFLICT DO NOTHING`,
        [caseId, sectionId, f.id, f.label, f.required, f.required, f.multiline ?? false],
      );
    }
  }
}

export async function getCheckpointStatus(caseId: string): Promise<CheckpointStatus> {
  const { rows } = await query<{ form51a_checkpoint_status: CheckpointStatus }>(
    "SELECT form51a_checkpoint_status FROM cases WHERE id = $1",
    [caseId],
  );
  return rows[0]?.form51a_checkpoint_status ?? "not_started";
}

export async function setCheckpointStatus(
  caseId: string,
  status: CheckpointStatus,
): Promise<void> {
  await query(
    "UPDATE cases SET form51a_checkpoint_status = $2, updated_at = now() WHERE id = $1",
    [caseId, status],
  );
}

export async function loadForm51A(caseId: string): Promise<Form51A> {
  const checkpointStatus = await getCheckpointStatus(caseId);
  const { rows } = await query<{
    section_id: string;
    field_id: string;
    label: string;
    required: boolean;
    value: string;
    source: FieldSource;
    ai_confidence: number | null;
    confirmed_by_human: boolean;
    missing: boolean;
    multiline: boolean;
  }>(
    `SELECT section_id, field_id, label, required, value, source, ai_confidence,
            confirmed_by_human, missing, multiline
     FROM form_51a_fields WHERE case_id = $1`,
    [caseId],
  );

  const sections = {} as Form51A["sections"];
  for (const sectionId of SECTION_IDS) {
    const def = FORM_CATALOG[sectionId];
    const fields: Record<string, Form51AField> = {};
    for (const f of def.fields) {
      const row = rows.find((r) => r.section_id === sectionId && r.field_id === f.id);
      const value = row?.value ?? "";
      fields[f.id] = {
        label: f.label,
        required: f.required,
        value,
        source: (row?.source as FieldSource) ?? "human",
        aiConfidence: row?.ai_confidence ?? undefined,
        confirmedByHuman: row?.confirmed_by_human ?? false,
        missing: row?.missing ?? (f.required && !value.trim()),
        multiline: f.multiline,
      };
    }
    sections[sectionId] = { title: def.title, icon: def.icon, fields };
  }

  const form: Form51A = { caseId, checkpointStatus, sections, completion: computeCompletion(sections, checkpointStatus) };
  return form;
}

export async function updateFields(
  caseId: string,
  updates: { sectionId: SectionId; fieldId: string; value: string }[],
): Promise<void> {
  for (const u of updates) {
    await query(
      `UPDATE form_51a_fields
       SET value = $4, source = 'human', confirmed_by_human = true, missing = false
       WHERE case_id = $1 AND section_id = $2 AND field_id = $3`,
      [caseId, u.sectionId, u.fieldId, u.value],
    );
  }
  await query("UPDATE cases SET updated_at = now() WHERE id = $1", [caseId]);
}

export async function confirmSection(caseId: string, sectionId: SectionId): Promise<void> {
  await query(
    `UPDATE form_51a_fields
     SET confirmed_by_human = true
     WHERE case_id = $1 AND section_id = $2 AND source = 'ai'`,
    [caseId, sectionId],
  );
}

export async function mergeNlpFields(
  caseId: string,
  fields: {
    sectionId: SectionId;
    fieldId: string;
    value: string;
    confidence: number;
    threshold: number;
  }[],
): Promise<void> {
  for (const f of fields) {
    if (f.confidence < f.threshold) continue;
    await query(
      `UPDATE form_51a_fields
       SET value = $4, source = 'ai', ai_confidence = $5, confirmed_by_human = false, missing = false
       WHERE case_id = $1 AND section_id = $2 AND field_id = $3`,
      [caseId, f.sectionId, f.fieldId, f.value, f.confidence],
    );
  }
  await setCheckpointStatus(caseId, "ready_for_review");
}
