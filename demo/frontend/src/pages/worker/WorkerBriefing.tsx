import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { EmergBadge, RiskBadge } from "../../components/atoms";
import { BriefingStatusChip, briefingStatusDetail } from "../../components/worker/BriefingStatusChip";
import { BackButton } from "../../components/ui/BackButton";
import { LoadingBlock } from "../../components/ui/LoadingSpinner";
import { PageShell } from "../../components/ui/PageShell";
import { useApiQuery } from "../../hooks/useApiQuery";
import { briefingProgress } from "../../utils/briefingStatus";
import { formatCaseTitle } from "../../utils/format";
import type { Briefing } from "../../api/types";

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

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(formatBriefingListItem).filter(Boolean);
}

function normalizeBriefingView(raw: Briefing | null | undefined): Briefing | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    riskScore: typeof raw.riskScore === "number" && Number.isFinite(raw.riskScore) ? raw.riskScore : 10,
    riskFactors: asStringList(raw.riskFactors),
    protectiveFactors: asStringList(raw.protectiveFactors),
    communityResources: asStringList(raw.communityResources),
    collateralContacts: Array.isArray(raw.collateralContacts) ? raw.collateralContacts : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    childDisplay: raw.childDisplay?.trim() || "Child",
    address: raw.address?.trim() || "Address on file",
    leReason: raw.leReason ?? "",
    leAccompanimentRecommended: Boolean(raw.leAccompanimentRecommended),
  };
}

export function WorkerBriefing({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [briefingOpenedAt, setBriefingOpenedAt] = useState<string | null>(null);
  const { data: caseMeta } = useApiQuery(() => api.getCase(caseId), [caseId]);
  const { data, loading, error } = useApiQuery(() => api.getBriefing(caseId), [caseId]);
  const briefing = normalizeBriefingView(data ?? null);
  const openedAt = briefingOpenedAt ?? caseMeta?.briefingOpenedAt ?? null;

  useEffect(() => {
    if (!briefing || loading || error) return;
    void api
      .markBriefingOpened(caseId)
      .then((r) => setBriefingOpenedAt(r.briefingOpenedAt))
      .catch(() => setBriefingOpenedAt(new Date().toISOString()));
  }, [caseId, briefing, loading, error]);

  if (loading) {
    return (
      <LoadingBlock
        message="Generating pre-visit briefing…"
        hint="Demo uses Hugging Face Inference — this can take one to several minutes."
        minHeight={220}
      />
    );
  }

  if (error || !briefing) {
    const timedOut = error?.includes("timed out") || error?.includes("Timeout");
    const forbidden = error?.includes("not assigned") || error?.includes("Forbidden");
    return (
      <PageShell style={{ gap: 13 }}>
        <div className="card" style={{ padding: "13px 17px", display: "flex", gap: 11, alignItems: "center" }}>
          <BackButton onClick={onBack} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>AI Pre-Visit Briefing</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.textDark }}>
              {formatCaseTitle(undefined, caseId)}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 16, color: timedOut ? C.amber : C.coral, fontSize: 13, lineHeight: 1.5 }}>
          {error ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Could not load briefing</div>
              {error}
            </>
          ) : (
            "Briefing unavailable — try again or check ai-bundle logs."
          )}
          {forbidden && (
            <div style={{ marginTop: 8, color: C.textMid, fontSize: 12 }}>
              Only cases in <strong>assigned</strong> or <strong>report submitted</strong> status are available to field workers.
            </div>
          )}
          {timedOut && (
            <div style={{ marginTop: 8, color: C.textMid, fontSize: 12 }}>
              Hugging Face may still be processing — wait a minute and refresh this page.
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell style={{ gap: 13 }}>
      <div className="card" style={{ padding: "13px 17px", display: "flex", gap: 11, alignItems: "center" }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>AI Pre-Visit Briefing</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.textDark }}>
            {formatCaseTitle(undefined, caseId)} — {briefing.childDisplay}
          </div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>{briefing.address}</div>
        </div>
        <BriefingStatusChip briefingOpenedAt={openedAt} />
        {briefing.leAccompanimentRecommended && <EmergBadge />}
        <RiskBadge score={briefing.riskScore} />
      </div>
      <p style={{ fontSize: 12, color: C.textMid, margin: "-4px 0 0" }}>
        {briefingStatusDetail(briefingProgress({ briefingOpenedAt: openedAt }))}
      </p>
      {briefing.leAccompanimentRecommended && (
        <div
          style={{
            background: C.coralPale,
            border: `1.5px solid ${C.coral}66`,
            borderRadius: 12,
            padding: "13px 17px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 22 }}>🚔</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.coral, marginBottom: 3 }}>
              Law Enforcement Accompaniment Recommended
            </div>
            <p style={{ fontSize: 12, color: C.textMid }}>{briefing.leReason || "Review safety plan before visit."}</p>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Risk Factors</div>
          {briefing.riskFactors.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textLight }}>No risk factors listed — review the Initial Report and risk score.</p>
          ) : (
            briefing.riskFactors.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: C.textMid, display: "flex", gap: 6, marginBottom: 7 }}>
                <span style={{ color: C.coral, flexShrink: 0 }}>▸</span>
                {f}
              </div>
            ))
          )}
          <div className="divider" />
          <div className="sec-title">Protective Factors</div>
          {briefing.protectiveFactors.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textLight }}>No protective factors listed yet.</p>
          ) : (
            briefing.protectiveFactors.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: C.textMid, display: "flex", gap: 6, marginBottom: 7 }}>
                <span style={{ color: C.green, flexShrink: 0 }}>▸</span>
                {f}
              </div>
            ))
          )}
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Collateral Contacts</div>
          {briefing.collateralContacts.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textLight }}>No collateral contacts on file.</p>
          ) : (
            briefing.collateralContacts.map((c, i) => (
              <div key={i} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>
                  {c.role} · {c.phone}
                </div>
              </div>
            ))
          )}
          <div className="divider" />
          <div className="sec-title">Community Resources</div>
          {briefing.communityResources.length === 0 ? (
            <p style={{ fontSize: 12, color: C.textLight }}>No community resources listed.</p>
          ) : (
            briefing.communityResources.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 6 }}>
                📍 {r}
              </div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
}
