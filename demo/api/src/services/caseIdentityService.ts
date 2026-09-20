import { query } from "../db/pool.js";

/** Normalize child name for match key: lowercase, trim, collapse whitespace. */
export function normalizeChildName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Parse DOB to YYYY-MM-DD when possible; returns null if unparseable. */
export function normalizeChildDob(dob: string): string | null {
  const raw = dob.trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const us = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (us) {
    const mm = us[1].padStart(2, "0");
    const dd = us[2].padStart(2, "0");
    return `${us[3]}-${mm}-${dd}`;
  }

  return null;
}

/** Build match key from name + DOB; both required. */
export function buildChildMatchKey(childName: string, childDob: string): string | null {
  const name = normalizeChildName(childName);
  const dob = normalizeChildDob(childDob);
  if (!name || !dob) return null;
  return `${name}|${dob}`;
}

export async function getFormChildFields(
  caseId: string,
): Promise<{ childName: string; childDob: string }> {
  const { rows } = await query<{ field_id: string; value: string }>(
    `SELECT field_id, value FROM form_51a_fields
     WHERE case_id = $1 AND section_id = 'child' AND field_id IN ('child_name', 'child_dob')`,
    [caseId],
  );
  const byId = Object.fromEntries(rows.map((r) => [r.field_id, r.value ?? ""]));
  return {
    childName: byId.child_name ?? "",
    childDob: byId.child_dob ?? "",
  };
}

/** Update child_display from form child_name; skip empty values. */
export async function syncChildDisplayFromForm(caseId: string): Promise<string | null> {
  const { childName } = await getFormChildFields(caseId);
  const trimmed = childName.trim();
  if (!trimmed) return null;

  await query(
    "UPDATE cases SET child_display = $2, updated_at = datetime('now') WHERE id = $1",
    [caseId, trimmed],
  );
  return trimmed;
}

/** Recompute and persist child_match_key from form fields. */
export async function syncChildMatchKey(caseId: string): Promise<string | null> {
  const { childName, childDob } = await getFormChildFields(caseId);
  const key = buildChildMatchKey(childName, childDob);

  await query(
    "UPDATE cases SET child_match_key = $2, updated_at = datetime('now') WHERE id = $1",
    [caseId, key],
  );
  return key;
}

/** Sync display name and match key after form or NLP changes. */
export async function syncCaseIdentityFromForm(caseId: string): Promise<void> {
  await syncChildDisplayFromForm(caseId);
  await syncChildMatchKey(caseId);
}

/** Year-scoped sequential external_id: IR-2026-0001 */
export async function generateExternalId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IR-${year}-`;
  const { rows } = await query<{ external_id: string }>(
    `SELECT external_id FROM cases
     WHERE external_id LIKE $1
     ORDER BY external_id DESC LIMIT 1`,
    [`${prefix}%`],
  );
  let next = 1;
  const last = rows[0]?.external_id;
  if (last) {
    const suffix = last.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export interface RelatedCaseSummary {
  caseId: string;
  externalId: string | null;
  childDisplay: string | null;
  status: string;
  createdAt: string;
  reporterName: string | null;
}

export async function findRelatedCases(
  caseId: string,
  matchKey: string | null,
): Promise<RelatedCaseSummary[]> {
  if (!matchKey) return [];

  const { rows } = await query<{
    caseId: string;
    externalId: string | null;
    childDisplay: string | null;
    status: string;
    createdAt: string;
  }>(
    `SELECT id AS "caseId", external_id AS "externalId", child_display AS "childDisplay",
            status, created_at AS "createdAt"
     FROM cases
     WHERE child_match_key = $1 AND id != $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [matchKey, caseId],
  );

  const results: RelatedCaseSummary[] = [];
  for (const r of rows) {
    const { rows: repRows } = await query<{ value: string }>(
      `SELECT value FROM form_51a_fields
       WHERE case_id = $1 AND section_id = 'reporter' AND field_id = 'rep_name'`,
      [r.caseId],
    );
    results.push({
      ...r,
      reporterName: repRows[0]?.value?.trim() || null,
    });
  }
  return results;
}
