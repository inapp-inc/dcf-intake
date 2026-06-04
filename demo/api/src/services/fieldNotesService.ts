import { query } from "../db/pool.js";

export async function getFieldNotes(caseId: string): Promise<{
  text: string;
  fieldMemoStatus: string | null;
}> {
  const { rows } = await query<{ field_notes: string }>(
    "SELECT field_notes FROM cases WHERE id = $1",
    [caseId],
  );
  const { rows: ps } = await query<{ stages: string | Record<string, string> }>(
    "SELECT stages FROM pipeline_state WHERE case_id = $1",
    [caseId],
  );
  let fieldMemoStatus: string | null = null;
  if (ps[0]?.stages) {
    const stages =
      typeof ps[0].stages === "string"
        ? (JSON.parse(ps[0].stages) as Record<string, string>)
        : ps[0].stages;
    fieldMemoStatus = stages.field_memo ?? null;
  }
  return {
    text: rows[0]?.field_notes ?? "",
    fieldMemoStatus,
  };
}
