import { query } from "../db/pool.js";
import { ollamaChat } from "./ollamaService.js";
import * as formRepo from "../repositories/form51aRepository.js";

export interface BriefingPayload {
  caseId: string;
  childDisplay: string;
  address: string;
  riskScore: number;
  riskFactors: string[];
  protectiveFactors: string[];
  collateralContacts: { name: string; role: string; phone: string }[];
  leAccompanimentRecommended: boolean;
  leReason: string;
  communityResources: string[];
  evidence: { claim: string; source: string }[];
}

export async function getOrCreateBriefing(caseId: string): Promise<BriefingPayload> {
  const { rows: existing } = await query<{ content: BriefingPayload }>(
    `SELECT content FROM briefings WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  if (existing[0]?.content?.caseId) {
    return existing[0].content;
  }

  const { rows: caseRows } = await query<{
    child_display: string | null;
    risk_score: number | null;
    emergency: boolean;
  }>("SELECT child_display, risk_score, emergency FROM cases WHERE id = $1", [caseId]);
  if (!caseRows[0]) throw Object.assign(new Error("Case not found"), { status: 404 });

  const form = await formRepo.loadForm51A(caseId);
  const addr = form.sections.child.fields.child_addr?.value ?? "Address on file";
  const allegation = form.sections.incident.fields.allegation?.value ?? "";

  let riskFactors: string[] = [];
  const { rows: riskRows } = await query<{ contributing_factors: string[] }>(
    `SELECT contributing_factors FROM risk_assessments WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  if (riskRows[0]) riskFactors = riskRows[0].contributing_factors;

  const { rows: triage } = await query<{ label: string; evidence: string | null }>(
    `SELECT label, evidence FROM triage_flags WHERE case_id = $1 AND status != 'dismissed'`,
    [caseId],
  );
  for (const t of triage) {
    riskFactors.push(t.evidence ? `${t.label}: ${t.evidence}` : t.label);
  }

  const weaponFlag = triage.some((t) => t.label.toLowerCase().includes("weapon"));
  const leAccompanimentRecommended = weaponFlag || Boolean(caseRows[0].emergency);
  const leReason = weaponFlag
    ? "Weapon reference in report — coordinate with local PD before home visit."
    : caseRows[0].emergency
      ? "Emergency intake — consider law enforcement accompaniment."
      : "";

  let briefing: BriefingPayload = {
    caseId,
    childDisplay: caseRows[0].child_display ?? "Child",
    address: addr,
    riskScore: caseRows[0].risk_score ?? 10,
    riskFactors: riskFactors.length ? riskFactors : ["Review risk assessment in case file"],
    protectiveFactors: ["Child enrolled in school (verify)", "Reporter engaged with safety concerns"],
    collateralContacts: [
      { name: "School (on file)", role: "Education", phone: "(413) 555-0100" },
      { name: "Primary care (verify)", role: "Pediatrician", phone: "(413) 555-0200" },
    ],
    leAccompanimentRecommended,
    leReason,
    communityResources: [
      "Local Family Resource Center",
      "WIC Program — regional office",
      "Safe Families Network",
    ],
    evidence: [{ claim: allegation || "See 51A incident section", source: "51A intake form" }],
  };

  try {
    const raw = await ollamaChat(
      "Generate a 51B pre-visit briefing JSON only: {riskFactors[], protectiveFactors[], communityResources[]}",
      `Case: ${briefing.childDisplay}, risk ${briefing.riskScore}, factors: ${riskFactors.join("; ")}`,
    );
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<BriefingPayload>;
      if (parsed.riskFactors?.length) briefing.riskFactors = parsed.riskFactors;
      if (parsed.protectiveFactors?.length) briefing.protectiveFactors = parsed.protectiveFactors;
      if (parsed.communityResources?.length) briefing.communityResources = parsed.communityResources;
    }
  } catch {
    /* template briefing is sufficient */
  }

  await query(`INSERT INTO briefings (case_id, content) VALUES ($1, $2::jsonb)`, [
    caseId,
    JSON.stringify(briefing),
  ]);
  return briefing;
}
