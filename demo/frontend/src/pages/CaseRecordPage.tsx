import { useCallback, useState } from "react";
import { api } from "../api/client";
import { C } from "../theme/tokens";
import { Chip, EmergBadge, RiskBadge } from "../components/atoms";
import { FormSection } from "../components/intake/FormSection";
import { TranscriptPanel } from "../components/intake/TranscriptPanel";
import { TriageSection } from "../components/intake/TriageSection";
import { RiskScoreCard } from "../components/intake/RiskScoreCard";
import { BgChecks } from "../components/intake/BgChecks";
import { BackButton } from "../components/ui/BackButton";
import { LoadingBlock } from "../components/ui/LoadingSpinner";
import { PageShell } from "../components/ui/PageShell";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatCaseTitle, formatStatus } from "../utils/format";
import type { SectionId, UserRole } from "../api/types";

const SECTION_ORDER: SectionId[] = ["child", "incident", "reporter", "household", "filing"];

export function CaseRecordPage({
  caseId,
  role,
  onBack,
}: {
  caseId: string;
  role: UserRole;
  onBack: () => void;
}) {
  const [openSec, setOpenSec] = useState<SectionId | null>("child");

  const load = useCallback(async () => {
    const [caseMeta, form, transcript, flags, risk, bg, report] = await Promise.all([
      api.getCase(caseId),
      api.getForm51a(caseId),
      api.getTranscript(caseId).catch(() => ({ segments: [] })),
      api.getTriageFlags(caseId).catch(() => []),
      api.getRisk(caseId).catch(() => null),
      api.getBackgroundChecks(caseId).catch(() => ({ sources: [], summaryAvailable: false })),
      api.getReport51bDraft(caseId).catch(() => null),
    ]);
    return { caseMeta, form, transcript, flags, risk, bg, report };
  }, [caseId]);

  const { data, loading, error } = useApiQuery(load, [caseId]);

  if (loading && !data) {
    return <LoadingBlock message="Loading case record…" minHeight={220} />;
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="card" style={{ padding: 16, color: C.coral }}>{error ?? "Case not found"}</div>
        <BackButton onClick={onBack} />
      </PageShell>
    );
  }

  const { caseMeta, form, transcript, flags, risk, bg, report } = data;
  const canOpen51a = role === "screener" || role === "supervisor" || role === "worker";

  return (
    <PageShell style={{ gap: 13 }}>
      <div className="card" style={{ padding: "13px 17px", display: "flex", gap: 11, alignItems: "center", flexWrap: "wrap" }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>Full case record</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.textDark }}>
            {formatCaseTitle(caseMeta.externalId, caseId)} — {caseMeta.childDisplay ?? "Child"}
          </div>
        </div>
        <Chip color={C.navy} bg={C.bg}>
          {formatStatus(caseMeta.status)}
        </Chip>
        {caseMeta.emergency && <EmergBadge />}
        {caseMeta.riskScore != null && <RiskBadge score={caseMeta.riskScore} />}
        {canOpen51a && (
          <button type="button" className="app-btn ghost-btn" onClick={() => void api.openOfficialForm(caseId)}>
            Open Initial Report
          </button>
        )}
      </div>

      <div className="card" style={{ padding: "15px 17px" }}>
        <div className="sec-title">Emergency triage flags</div>
        <TriageSection flags={flags} readOnly />
      </div>

      <div className="card" style={{ padding: "15px 17px" }}>
        <div className="sec-title">Call transcript</div>
        <TranscriptPanel segments={transcript.segments} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {SECTION_ORDER.map((sid) => (
          <FormSection
            key={sid}
            sectionId={sid}
            section={form.sections[sid]}
            expanded={openSec === sid}
            onToggle={() => setOpenSec(openSec === sid ? null : sid)}
            onFieldChange={() => {}}
            onConfirmSection={() => {}}
            pendingAi={0}
            readOnly
          />
        ))}
      </div>

      <div className="card" style={{ padding: "15px 17px" }}>
        <div className="sec-title">AI risk assessment</div>
        <RiskScoreCard risk={risk} />
      </div>

      <div className="card" style={{ padding: "15px 17px" }}>
        <div className="sec-title">Background checks</div>
        <BgChecks sources={bg.sources} />
      </div>

      {(report || caseMeta.status === "report_submitted") && (
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Field report</div>
          {report ? (
            <>
              <p style={{ fontSize: 11, color: C.textLight, marginBottom: 10 }}>
                Status: {report.status}
                {report.status === "worker_approved" ? " · Approved by worker" : ""}
              </p>
              <pre
                style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  background: C.bg,
                  padding: 12,
                  borderRadius: 8,
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                {report.content}
              </pre>
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.textLight }}>Field Report marked submitted — draft text not available.</p>
          )}
        </div>
      )}
    </PageShell>
  );
}
