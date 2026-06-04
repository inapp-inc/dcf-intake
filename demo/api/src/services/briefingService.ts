import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { llmChat } from "./llmService.js";
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

function formatBriefingListItem(item: unknown): string {
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        return formatBriefingListItem(JSON.parse(trimmed));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const type = typeof obj.type === "string" ? obj.type.trim() : "";
    const details = typeof obj.details === "string" ? obj.details.trim() : "";
    if (type && details) return `${type}: ${details}`;
    if (type) return type;
    if (details) return details;
    for (const key of ["text", "factor", "label", "name", "description", "value", "title", "resource"]) {
      const val = obj[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
    const parts = Object.values(obj)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
    return parts.length ? parts.join(": ") : "";
  }
  return item != null ? String(item).trim() : "";
}

function coerceStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const items = value.map(formatBriefingListItem).filter(Boolean);
    return items.length ? items : null;
  }
  if (typeof value === "string" && value.trim()) {
    const formatted = formatBriefingListItem(value);
    return formatted ? [formatted] : null;
  }
  return null;
}

function coerceContacts(
  value: unknown,
  fallback: BriefingPayload["collateralContacts"],
): BriefingPayload["collateralContacts"] {
  if (!Array.isArray(value)) return fallback;
  const contacts = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === "string" ? obj.name.trim() : "";
      const role = typeof obj.role === "string" ? obj.role.trim() : "Contact";
      const phone = typeof obj.phone === "string" ? obj.phone.trim() : "";
      if (!name) return null;
      return { name, role, phone: phone || "—" };
    })
    .filter((c): c is BriefingPayload["collateralContacts"][number] => c != null);
  return contacts.length ? contacts : fallback;
}

function coerceEvidence(
  value: unknown,
  fallback: BriefingPayload["evidence"],
): BriefingPayload["evidence"] {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const claim = typeof obj.claim === "string" ? obj.claim.trim() : "";
      const source = typeof obj.source === "string" ? obj.source.trim() : "Case file";
      if (!claim) return null;
      return { claim, source };
    })
    .filter((e): e is BriefingPayload["evidence"][number] => e != null);
  return items.length ? items : fallback;
}

export function normalizeBriefing(raw: unknown, caseId: string): BriefingPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<BriefingPayload>;
  const fallbackContacts: BriefingPayload["collateralContacts"] = [
    { name: "School (on file)", role: "Education", phone: "(413) 555-0100" },
    { name: "Primary care (verify)", role: "Pediatrician", phone: "(413) 555-0200" },
  ];
  const fallbackEvidence: BriefingPayload["evidence"] = [
    { claim: "See 51A incident section", source: "51A intake form" },
  ];

  const riskFactors = coerceStringArray(obj.riskFactors) ?? ["Review risk assessment in case file"];
  const protectiveFactors =
    coerceStringArray(obj.protectiveFactors) ?? ["Child enrolled in school (verify)", "Reporter engaged with safety concerns"];
  const communityResources =
    coerceStringArray(obj.communityResources) ?? [
      "Local Family Resource Center",
      "WIC Program — regional office",
      "Safe Families Network",
    ];

  const scoreRaw = (obj as { riskScore?: unknown }).riskScore;
  let riskScore = 10;
  if (typeof scoreRaw === "number" && Number.isFinite(scoreRaw)) {
    riskScore = scoreRaw;
  } else if (typeof scoreRaw === "string" && scoreRaw.trim()) {
    const parsed = Number.parseInt(scoreRaw, 10);
    if (Number.isFinite(parsed)) riskScore = parsed;
  }

  return {
    caseId: typeof obj.caseId === "string" && obj.caseId ? obj.caseId : caseId,
    childDisplay: typeof obj.childDisplay === "string" && obj.childDisplay.trim() ? obj.childDisplay : "Child",
    address: typeof obj.address === "string" && obj.address.trim() ? obj.address : "Address on file",
    riskScore: Number.isFinite(riskScore) ? riskScore : 10,
    riskFactors,
    protectiveFactors,
    collateralContacts: coerceContacts(obj.collateralContacts, fallbackContacts),
    leAccompanimentRecommended: Boolean(obj.leAccompanimentRecommended),
    leReason: typeof obj.leReason === "string" ? obj.leReason : "",
    communityResources,
    evidence: coerceEvidence(obj.evidence, fallbackEvidence),
  };
}

function parseLlmBriefing(raw: string): Partial<BriefingPayload> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<BriefingPayload>;
  } catch {
    return null;
  }
}

function mergeLlmBriefing(base: BriefingPayload, parsed: Partial<BriefingPayload>): BriefingPayload {
  const next = { ...base };
  const riskFactors = coerceStringArray(parsed.riskFactors);
  const protectiveFactors = coerceStringArray(parsed.protectiveFactors);
  const communityResources = coerceStringArray(parsed.communityResources);
  if (riskFactors) next.riskFactors = riskFactors;
  if (protectiveFactors) next.protectiveFactors = protectiveFactors;
  if (communityResources) next.communityResources = communityResources;
  return normalizeBriefing(next, base.caseId)!;
}

export async function getOrCreateBriefing(caseId: string): Promise<BriefingPayload> {
  const { rows: existing } = await query<{ content: unknown }>(
    `SELECT content FROM briefings WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  const cached = normalizeBriefing(existing[0]?.content, caseId);
  if (cached) return cached;

  const { rows: caseRows } = await query<{
    child_display: string | null;
    risk_score: number | null;
    emergency: boolean;
  }>("SELECT child_display, risk_score, emergency FROM cases WHERE id = $1", [caseId]);
  if (!caseRows[0]) throw Object.assign(new Error("Case not found"), { status: 404 });

  const form = await formRepo.loadForm51A(caseId);
  const addr = form.sections.child?.fields?.child_addr?.value?.trim() || "Address on file";
  const allegation = form.sections.incident?.fields?.allegation?.value?.trim() ?? "";

  let riskFactors: string[] = [];
  const { rows: riskRows } = await query<{ contributing_factors: unknown }>(
    `SELECT contributing_factors FROM risk_assessments WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  if (riskRows[0]?.contributing_factors) {
    riskFactors = coerceStringArray(riskRows[0].contributing_factors) ?? [];
  }

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

  let briefing = normalizeBriefing(
    {
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
    },
    caseId,
  )!;

  try {
    const raw = await llmChat(
      "You are a DCF field worker assistant. Reply with JSON only, no markdown. Shape: {\"riskFactors\":[\"string\"],\"protectiveFactors\":[\"string\"],\"communityResources\":[\"string\"]}. Each array item must be a plain string sentence.",
      `Case: ${briefing.childDisplay}, risk ${briefing.riskScore}/20. Known factors: ${riskFactors.join("; ") || "none yet"}. Allegation context: ${allegation || "see 51A"}.`,
      { maxTokens: 1024 },
    );
    const parsed = parseLlmBriefing(raw);
    if (parsed) briefing = mergeLlmBriefing(briefing, parsed);
  } catch {
    /* template briefing is sufficient when HF is slow or unavailable */
  }

  await query(`INSERT INTO briefings (id, case_id, content) VALUES ($1, $2, $3)`, [
    uuidv4(),
    caseId,
    JSON.stringify(briefing),
  ]);
  return briefing;
}
