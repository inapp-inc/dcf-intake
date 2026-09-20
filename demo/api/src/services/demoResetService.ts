import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { config } from "../config.js";
import { seedFormFieldsForCase } from "../repositories/form51aRepository.js";
import { generateExternalId, syncCaseIdentityFromForm } from "./caseIdentityService.js";

const ARTIFACT_SUBDIRS = [
  "audio",
  "transcribe",
  "nlp",
  "risk",
  "background",
  "documents",
  "field-memo",
] as const;

export async function resetDemoData(opts?: { seedDemoCases?: boolean }): Promise<{
  casesRemoved: number;
  seededCases: number;
}> {
  const { rows: countRows } = await query<{ count: number }>("SELECT COUNT(*) AS count FROM cases");
  const casesRemoved = Number(countRows[0]?.count ?? 0);

  await query("DELETE FROM pipeline_jobs");
  await query("DELETE FROM audit_events");
  await query("DELETE FROM cases");

  const artifactRoot = config.artifactDir;
  if (artifactRoot && existsSync(artifactRoot)) {
    for (const sub of ARTIFACT_SUBDIRS) {
      const dir = join(artifactRoot, sub);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }

  let seededCases = 0;
  if (opts?.seedDemoCases !== false) {
    seededCases = await seedLinkedDemoCases();
  }

  return { casesRemoved, seededCases };
}

async function insertSeedCase(params: {
  externalId: string;
  childName: string;
  childDob: string;
  reporterName: string;
  status?: string;
}): Promise<string> {
  const id = uuidv4();
  await query(
    `INSERT INTO cases (id, external_id, status, area_office, child_display)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, params.externalId, params.status ?? "in_progress", "Springfield", params.childName],
  );
  await seedFormFieldsForCase(id);
  await query(
    `UPDATE form_51a_fields SET value = $2, source = 'human', confirmed_by_human = 1, missing = 0
     WHERE case_id = $1 AND section_id = 'child' AND field_id = 'child_name'`,
    [id, params.childName],
  );
  await query(
    `UPDATE form_51a_fields SET value = $2, source = 'human', confirmed_by_human = 1, missing = 0
     WHERE case_id = $1 AND section_id = 'child' AND field_id = 'child_dob'`,
    [id, params.childDob],
  );
  await query(
    `UPDATE form_51a_fields SET value = $2, source = 'human', confirmed_by_human = 1, missing = 0
     WHERE case_id = $1 AND section_id = 'reporter' AND field_id = 'rep_name'`,
    [id, params.reporterName],
  );
  await syncCaseIdentityFromForm(id);
  return id;
}

async function seedLinkedDemoCases(): Promise<number> {
  const ext1 = await generateExternalId();
  const ext2 = await generateExternalId();
  const ext3 = await generateExternalId();

  await insertSeedCase({
    externalId: ext1,
    childName: "Emma Johnson",
    childDob: "2018-03-15",
    reporterName: "Neighbor — Maria Santos",
  });
  await insertSeedCase({
    externalId: ext2,
    childName: "Emma Johnson",
    childDob: "03/15/2018",
    reporterName: "School counselor — James Lee",
  });
  await insertSeedCase({
    externalId: ext3,
    childName: "Noah Williams",
    childDob: "2015-07-22",
    reporterName: "Anonymous caller",
  });

  return 3;
}
