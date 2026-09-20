import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { useCaseWebSocket } from "../hooks/useCaseWebSocket";
import { C } from "../theme/tokens";
import { Chip, EmergBadge, RiskBadge } from "../components/atoms";
import { PipelineStrip } from "../components/intake/PipelineStrip";
import { AudioUpload, type TxState } from "../components/intake/AudioUpload";
import { LiveCallPanel, type LiveState } from "../components/intake/LiveCallPanel";
import { useVadRecorder } from "../hooks/useVadRecorder";
import { TranscriptPanel } from "../components/intake/TranscriptPanel";
import { FormSection } from "../components/intake/FormSection";
import { FormPopulatingCard } from "../components/intake/FormPopulatingCard";
import { IntakeCollapsibleSection, IntakePlaceholder } from "../components/intake/IntakeCollapsibleSection";
import { BgChecks } from "../components/intake/BgChecks";
import { RiskScoreCard } from "../components/intake/RiskScoreCard";
import { TriageSection } from "../components/intake/TriageSection";
import { IntakeProgressTracker } from "../components/intake/IntakeProgressTracker";
import { AIAssistant } from "../components/intake/AIAssistant";
import { LinkedCasesDrawer, RelatedCasesBanner } from "../components/cases/LinkedCasesDrawer";
import {
  formatCaseName,
  formatCaseNumber,
  formatCheckpointStatus,
  formatInitiatedTime,
} from "../utils/format";
import type { RelatedCaseSummary } from "../api/types";
import { PIPELINE_POLL_MS } from "../config/timeouts";
import { LoadingBlock, LoadingSpinner } from "../components/ui/LoadingSpinner";
import type {
  AssistantMessage,
  BackgroundSource,
  CaseWsEvent,
  Form51A,
  PipelineStatus,
  RiskAssessment,
  SectionId,
  TranscriptSegment,
  TriageFlag,
} from "../api/types";

const SECTION_ORDER: SectionId[] = ["child", "incident", "reporter", "household", "filing"];

const FORM_SECTION_LABELS: Record<SectionId, { title: string; icon: string }> = {
  child: { title: "Child Information", icon: "👶" },
  incident: { title: "Incident Details", icon: "🔍" },
  reporter: { title: "Reporter Information", icon: "📞" },
  household: { title: "Household Members", icon: "👨‍👩‍👧" },
  filing: { title: "Initial Report Filing Details", icon: "📋" },
};

function nlpSettled(stages: Record<string, string> | undefined): boolean {
  if (!stages) return false;
  const nlp = stages.nlp;
  return nlp === "complete" || nlp === "failed";
}

function pipelineStillRunning(stages: Record<string, string> | undefined): boolean {
  if (!stages) return false;
  return Object.values(stages).some((s) => s === "running" || s === "pending");
}

function syncTxStateFromPipeline(
  txState: TxState,
  stages: Record<string, string> | undefined,
): TxState {
  const tx = stages?.transcription;
  if (tx === "complete") return "complete";
  if (tx === "running" || tx === "pending") return "processing";
  if (
    nlpSettled(stages) ||
    stages?.risk === "complete" ||
    stages?.triage === "complete" ||
    stages?.keywords_triage === "complete"
  ) {
    return "complete";
  }
  return txState;
}

function submitStatusMessage(form: Form51A): { text: string; warn: boolean; missingLabels: string[] } {
  const { completion, checkpointStatus } = form;
  const missingLabels = listMissingRequired(form);
  if (completion.canSubmitToSupervisor) {
    return {
      text: `${completion.mandatoryFilled}/${completion.mandatoryTotal} required fields complete — ready to submit`,
      warn: false,
      missingLabels,
    };
  }
  if (completion.mandatoryFilled < completion.mandatoryTotal) {
    const missing = completion.mandatoryTotal - completion.mandatoryFilled;
    return {
      text: `⚠ ${missing} required field${missing === 1 ? "" : "s"} still missing`,
      warn: true,
      missingLabels,
    };
  }
  if (completion.aiFieldsPendingConfirmation > 0) {
    return {
      text: `⚠ ${completion.aiFieldsPendingConfirmation} AI field(s) need confirmation`,
      warn: true,
      missingLabels,
    };
  }
  if (completion.canCompleteCheckpoint) {
    return {
      text: "All fields complete — complete the Initial Report checkpoint to enable submit (or submit will auto-complete)",
      warn: true,
      missingLabels,
    };
  }
  if (checkpointStatus !== "complete" && checkpointStatus !== "locked") {
    return {
      text: "Complete the Initial Report checkpoint before submitting to supervisor",
      warn: true,
      missingLabels,
    };
  }
  return { text: "Review required fields before submit", warn: true, missingLabels };
}

function listMissingRequired(form: Form51A): string[] {
  const labels: string[] = [];
  for (const sid of SECTION_ORDER) {
    for (const f of Object.values(form.sections[sid].fields)) {
      if (f.required && !f.value.trim()) labels.push(f.label);
    }
  }
  return labels;
}

function firstMissingSection(form: Form51A): SectionId | null {
  for (const sid of SECTION_ORDER) {
    if (Object.values(form.sections[sid].fields).some((f) => f.required && !f.value.trim())) {
      return sid;
    }
  }
  return null;
}

export function IntakePage({
  caseId,
  onCaseId,
  onSubmitted,
}: {
  caseId: string | null;
  onCaseId: (id: string) => void;
  onSubmitted?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [txState, setTxState] = useState<TxState>("idle");
  const [liveState, setLiveState] = useState<LiveState>("idle");
  const [liveError, setLiveError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const liveSessionIdRef = useRef<string | null>(null);
  const [form, setForm] = useState<Form51A | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [flags, setFlags] = useState<TriageFlag[]>([]);
  const [bg, setBg] = useState<BackgroundSource[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [openSec, setOpenSec] = useState<SectionId | null>("child");
  const [error, setError] = useState<string | null>(null);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [childDisplay, setChildDisplay] = useState<string | null>(null);
  const [relatedCases, setRelatedCases] = useState<RelatedCaseSummary[]>([]);
  const [relatedDrawerOpen, setRelatedDrawerOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [nlpReextracting, setNlpReextracting] = useState(false);
  const { run: postAssistant, pending: aiSending } = useAsyncAction(
    async (caseId: string, text: string) => api.postAssistantMessage(caseId, text),
  );
  const { run: submitCase, pending: submitting } = useAsyncAction(async (caseId: string) =>
    api.submitCase(caseId),
  );
  const { run: reextractForm, pending: reextracting } = useAsyncAction(async (caseId: string) =>
    api.reextractForm51a(caseId),
  );
  const aiRef = useRef<HTMLDivElement>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLiveChunk = useCallback(
    async (blob: Blob, meta: { chunkIndex: number; durationMs: number }) => {
      if (!caseId || !liveSessionIdRef.current) return;
      try {
        await api.uploadLiveChunk(caseId, blob, {
          sessionId: liveSessionIdRef.current,
          chunkIndex: meta.chunkIndex,
          durationMs: meta.durationMs,
        });
        setTxState("processing");
      } catch (e) {
        setLiveError(e instanceof ApiError ? e.message : "Failed to upload audio chunk");
      }
    },
    [caseId],
  );

  const vadEnabled = liveState === "recording";
  const { level, error: vadError, start: startMic, stop: stopMic } = useVadRecorder({
    enabled: vadEnabled,
    onChunk: handleLiveChunk,
  });

  const refreshAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isAuthenticated || !caseId) return;
    if (!opts?.silent) setPageLoading(true);
    try {
      const caseMeta = await api.getCase(caseId).catch(() => null);
      if (caseMeta?.externalId) setExternalId(caseMeta.externalId);
      if (caseMeta) {
        setChildDisplay(caseMeta.childDisplay ?? null);
        setRelatedCases(caseMeta.relatedCases ?? []);
        setEmergency(caseMeta.emergency);
        if (caseMeta.createdAt) setInitiatedAt(caseMeta.createdAt);
      }

      const [f, t, m, p] = await Promise.all([
        api.getForm51a(caseId),
        api.getTranscript(caseId).catch(() => null),
        api.getAssistantMessages(caseId).catch(() => []),
        api.getPipeline(caseId),
      ]);
      setForm(f);
      setTranscript((prev) => {
        const next = t?.segments ?? [];
        if (next.length > 0) return next;
        if (opts?.silent && prev.length > 0) return prev;
        return next;
      });
      setMessages(m);
      setPipeline(p);
      setTxState((prev) => syncTxStateFromPipeline(prev, p.stages));
      try {
        const live = await api.getLiveStatus(caseId);
        if (live.status === "recording") {
          liveSessionIdRef.current = live.sessionId ?? null;
          setLiveState("recording");
          setTxState("processing");
        } else if (live.status === "ended" && live.chunkCount && live.chunkCount > 0) {
          setLiveState("complete");
        }
      } catch {
        /* live status optional */
      }
      try {
        const r = await api.getRisk(caseId);
        setRisk(r);
      } catch {
        setRisk(null);
      }
      try {
        const fl = await api.getTriageFlags(caseId);
        setFlags(fl);
      } catch {
        /* */
      }
      try {
        const b = await api.getBackgroundChecks(caseId);
        setBg(b.sources);
      } catch {
        setBg([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load case");
    } finally {
      if (!opts?.silent) setPageLoading(false);
    }
  }, [isAuthenticated, caseId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!caseId) {
      setPageLoading(true);
      api
        .createCase()
        .then((c) => onCaseId(c.caseId))
        .catch((e) => setError(e instanceof Error ? e.message : "Could not create case"))
        .finally(() => setPageLoading(false));
      return;
    }
    void refreshAll();
  }, [isAuthenticated, caseId, onCaseId, refreshAll]);

  useEffect(() => {
    if (!isAuthenticated || !caseId) return;
    const transcriptionDone =
      pipeline?.stages?.transcription === "complete" || txState === "complete";
    const awaitingNlp = transcriptionDone && !nlpSettled(pipeline?.stages);
    const nlpRunning =
      pipeline?.stages?.nlp === "running" ||
      pipeline?.stages?.nlp === "pending" ||
      form?.checkpointStatus === "ai_populating" ||
      nlpReextracting;
    const processing =
      liveState === "recording" ||
      txState === "processing" ||
      txState === "uploading" ||
      pipeline?.stages?.transcription === "running" ||
      pipeline?.stages?.live_transcription === "running" ||
      pipelineStillRunning(pipeline?.stages) ||
      nlpRunning;
    if (!processing && !awaitingNlp) return;
    const id = setInterval(() => void refreshAll({ silent: true }), PIPELINE_POLL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, caseId, txState, liveState, pipeline, form?.checkpointStatus, nlpReextracting, refreshAll]);

  useEffect(() => {
    if (!nlpReextracting) return;
    const nlp = pipeline?.stages?.nlp;
    if (nlp === "complete" || nlp === "failed") {
      setNlpReextracting(false);
    }
  }, [nlpReextracting, pipeline?.stages?.nlp]);

  const refreshAssistant = useCallback(async () => {
    if (!isAuthenticated || !caseId) return;
    const m = await api.getAssistantMessages(caseId).catch(() => []);
    setMessages(m);
    setTimeout(() => {
      if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
    }, 80);
  }, [isAuthenticated, caseId]);

  const onWsEvent = useCallback(
    (ev: CaseWsEvent) => {
      if (ev.type === "transcript.line" && ev.text) {
        setTxState((s) => (s === "idle" ? "processing" : s));
        setTranscript((prev) => {
          const next = {
            speaker: (ev.speaker === "S" ? "S" : ev.speaker === "L" ? "L" : "C") as "S" | "C" | "L",
            text: ev.text!,
            keywordFlag: ev.keywordFlag,
          };
          if (ev.index != null && ev.index < prev.length) {
            const copy = [...prev];
            copy[ev.index] = next;
            return copy;
          }
          return [...prev, next];
        });
      }
      if (ev.type === "assistant.refresh") {
        void refreshAssistant();
      }
      if (
        ev.type === "form.field.updated" ||
        ev.type === "form.checkpoint.changed" ||
        ev.type === "pipeline.stage"
      ) {
        void refreshAll({ silent: true });
      }
      if (ev.type === "triage.alert") void refreshAll({ silent: true });
    },
    [refreshAll, refreshAssistant],
  );

  useCaseWebSocket(caseId, onWsEvent);

  const handleUpload = async (file: File) => {
    if (!isAuthenticated || !caseId || liveState !== "idle") return;
    setUploadFile(file);
    setTxState("uploading");
    setError(null);
    try {
      await api.uploadAudio(caseId, file);
      setTxState("processing");
    } catch (e) {
      setTxState("idle");
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Upload failed");
    }
  };

  const handleLiveStart = async () => {
    if (!isAuthenticated || !caseId || txState !== "idle") return;
    setLiveError(null);
    setError(null);
    setLiveState("starting");
    try {
      const session = await api.startLiveSession(caseId);
      liveSessionIdRef.current = session.sessionId ?? null;
      await startMic();
      setLiveState("recording");
      setTxState("processing");
      setPipeline(session);
      await refreshAssistant();
    } catch (e) {
      liveSessionIdRef.current = null;
      setLiveState("idle");
      setLiveError(e instanceof ApiError ? e.message : "Could not start live session");
    }
  };

  const handleLiveStop = async () => {
    if (!caseId) return;
    setLiveState("stopping");
    try {
      await stopMic();
      await api.endLiveSession(caseId);
      setLiveState("complete");
      await refreshAll({ silent: true });
    } catch (e) {
      setLiveError(e instanceof ApiError ? e.message : "Could not end live session");
      setLiveState("recording");
    }
  };

  const schedulePatch = (sectionId: SectionId, fieldId: string, value: string) => {
    if (!isAuthenticated || !caseId || !form) return;
    const sections = { ...form.sections };
    sections[sectionId] = {
      ...sections[sectionId],
      fields: {
        ...sections[sectionId].fields,
        [fieldId]: { ...sections[sectionId].fields[fieldId], value },
      },
    };
    setForm({ ...form, sections });
    if (patchTimer.current) clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(async () => {
      try {
        const updated = await api.patchForm51a(caseId, [{ sectionId, fieldId, value }]);
        setForm(updated);
      } catch {
        /* */
      }
    }, 400);
  };

  const handleConfirmSection = async (sectionId: SectionId) => {
    if (!isAuthenticated || !caseId) return;
    const updated = await api.confirmSection(caseId, sectionId);
    setForm(updated);
  };

  const handleCompleteCheckpoint = async () => {
    if (!isAuthenticated || !caseId) return;
    setError(null);
    try {
      await api.completeCheckpoint(caseId);
      await refreshAll();
    } catch (e) {
      if (e instanceof ApiError && e.code === "FORM_51A_INCOMPLETE") {
        setError("Complete all required fields and confirm AI-populated fields before checkpoint.");
      } else {
        setError(e instanceof Error ? e.message : "Checkpoint failed");
      }
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !caseId || !form) return;
    setError(null);
    try {
      if (!form.completion.canSubmitToSupervisor && form.completion.canCompleteCheckpoint) {
        await api.completeCheckpoint(caseId);
        await refreshAll({ silent: true });
      }
      const res = await submitCase(caseId);
      if (!res) return;
      setSubmitSuccess(`Submitted to supervisor (${res.externalId ?? res.status}).`);
      if (onSubmitted) setTimeout(() => onSubmitted(), 1500);
    } catch (e) {
      if (e instanceof ApiError && e.code === "FORM_51A_INCOMPLETE") {
        setError("Initial Report checkpoint must be complete before submit.");
      } else {
        setError(e instanceof Error ? e.message : "Submit failed");
      }
    }
  };

  const handleAiSend = async () => {
    if (!isAuthenticated || !caseId || !aiInput.trim()) return;
    const text = aiInput.trim();
    setAiInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, type: "user", message: text }]);
    try {
      const reply = await postAssistant(caseId, text);
      if (reply) setMessages((m) => [...m, reply]);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.code === "CLIENT_TIMEOUT"
          ? "Assistant timed out — Hugging Face may still be busy. Try again shortly."
          : "Assistant unavailable.";
      setMessages((m) => [...m, { id: `e-${Date.now()}`, type: "warning", message: msg }]);
    }
    setTimeout(() => {
      if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
    }, 100);
  };

  const handleTriage = async (flagId: string, action: "confirm" | "dismiss", reason?: string) => {
    if (!isAuthenticated || !caseId) return;
    await api.triageDecision(caseId, flagId, action, reason);
    const fl = await api.getTriageFlags(caseId);
    setFlags(fl);
  };

  const nlpStatus = pipeline?.stages?.nlp;
  const nlpBusy =
    nlpReextracting ||
    nlpStatus === "running" ||
    nlpStatus === "pending" ||
    pipeline?.stages?.clean === "running";
  const nlpFailed = nlpStatus === "failed";
  const canSubmit = form?.completion.canSubmitToSupervisor ?? false;
  const canComplete = form?.completion.canCompleteCheckpoint ?? false;
  const submitReady = canSubmit || canComplete;
  const submitStatus = form ? submitStatusMessage(form) : null;
  const pipelineMonitoring =
    liveState === "recording" ||
    txState !== "idle" ||
    pipelineStillRunning(pipeline?.stages) ||
    nlpBusy;
  const uploadDisabled = liveState !== "idle";
  const liveDisabled = txState !== "idle";

  if (!caseId) {
    return (
      <LoadingBlock
        message="Creating intake case…"
        hint="Transcription and form fill use Hugging Face — can take several minutes."
        minHeight={280}
      />
    );
  }

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 94px)", overflow: "hidden", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 18 }}>
        <div className="card" style={{ padding: "13px 17px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>
              New Initial Report
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
              {formatCaseName(childDisplay ?? form?.sections.child.fields.child_name?.value)}
            </div>
            {externalId && (
              <span style={{ display: "inline-block", marginTop: 4 }}>
                <Chip color={C.navy} bg={C.bg}>
                  Case #{formatCaseNumber(externalId)}
                </Chip>
              </span>
            )}
          </div>
          {emergency && <EmergBadge />}
          {risk?.score != null && <RiskBadge score={risk.score} />}
          {initiatedAt && (
            <Chip color={C.teal} bg={C.tealPale}>
              Initiated {formatInitiatedTime(initiatedAt)}
            </Chip>
          )}
          {form?.checkpointStatus && (
            <Chip color={C.teal} bg={C.tealPale}>
              {formatCheckpointStatus(form.checkpointStatus)}
            </Chip>
          )}
          <button
            type="button"
            className="app-btn ghost-btn"
            style={{ fontSize: 12 }}
            disabled={!caseId}
            onClick={() => caseId && void api.openOfficialForm(caseId)}
          >
            Open Initial Report
          </button>
        </div>

        <RelatedCasesBanner count={relatedCases.length} onOpen={() => setRelatedDrawerOpen(true)} />

        {error && (
          <div className="card" style={{ padding: 12, background: C.coralPale, color: C.coral, fontSize: 13 }}>
            {error}
          </div>
        )}
        {submitSuccess && (
          <div className="card" style={{ padding: 12, background: C.greenPale, color: C.green, fontSize: 13 }}>
            {submitSuccess}
          </div>
        )}

        {pageLoading && (
          <div className="card" style={{ padding: 10, fontSize: 12, color: C.textLight, display: "flex", gap: 8, alignItems: "center" }}>
            <LoadingSpinner size={16} />
            Refreshing case data…
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ opacity: uploadDisabled ? 0.55 : 1, pointerEvents: uploadDisabled ? "none" : "auto" }}>
            <AudioUpload state={txState} file={uploadFile} onUpload={handleUpload} />
          </div>
          <LiveCallPanel
            state={liveState}
            level={level}
            error={liveError ?? vadError}
            disabled={liveDisabled}
            onStart={() => void handleLiveStart()}
            onStop={() => void handleLiveStop()}
          />
        </div>

        {form && (
          <IntakeProgressTracker
            form={form}
            pipeline={pipeline}
            hasTranscript={transcript.length > 0}
            hasAudio={txState !== "idle"}
            liveActive={liveState === "recording" || liveState === "complete"}
          />
        )}

        <IntakeCollapsibleSection
          title="AI pipeline"
          subtitle="Transcription, field extraction, triage, and risk scoring"
          icon="⚙️"
          defaultExpanded
        >
          <PipelineStrip stages={pipeline?.stages ?? {}} currentStage={pipeline?.currentStage} />
        </IntakeCollapsibleSection>

        {nlpFailed && (
          <div className="card" style={{ padding: 12, background: C.amberPale, color: C.amber, fontSize: 13 }}>
            AI field extraction did not complete — enter required fields manually or re-upload the recording.
          </div>
        )}

        <IntakeCollapsibleSection
          title="Call transcript"
          subtitle="Speaker-attributed lines from the intake call"
          icon="📝"
          defaultExpanded
        >
          <TranscriptPanel
            segments={transcript}
            live={liveState === "recording" || (txState === "processing" && liveState !== "idle")}
          />
        </IntakeCollapsibleSection>

        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "0 2px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textDark }}>Initial Report fields</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: C.tealPale, border: `1.5px solid ${C.teal}` }} />
            <span style={{ fontSize: 10, color: C.textLight }}>AI auto-populated</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: C.amberPale, border: `1.5px solid ${C.amber}` }} />
            <span style={{ fontSize: 10, color: C.textLight }}>Needs your attention</span>
          </div>
        </div>

        {nlpBusy && form && (
          <FormPopulatingCard
            form={form}
            pipelineStage={
              nlpReextracting || pipeline?.stages?.nlp === "running" || pipeline?.stages?.nlp === "pending"
                ? "nlp"
                : pipeline?.stages?.clean === "running"
                  ? "clean"
                  : undefined
            }
          />
        )}

        {form
          ? SECTION_ORDER.map((sid) => {
              const sec = form.sections[sid];
              const pendingAi = Object.values(sec.fields).filter(
                (f) => f.source === "ai" && !f.confirmedByHuman,
              ).length;
              return (
                <FormSection
                  key={sid}
                  sectionId={sid}
                  section={sec}
                  expanded={openSec === sid}
                  onToggle={() => setOpenSec(openSec === sid ? null : sid)}
                  onFieldChange={(fieldId, value) => schedulePatch(sid, fieldId, value)}
                  onConfirmSection={() => void handleConfirmSection(sid)}
                  pendingAi={pendingAi}
                />
              );
            })
          : SECTION_ORDER.map((sid) => (
              <IntakeCollapsibleSection
                key={sid}
                title={FORM_SECTION_LABELS[sid].title}
                icon={FORM_SECTION_LABELS[sid].icon}
                expanded={openSec === sid}
                onToggle={() => setOpenSec(openSec === sid ? null : sid)}
                defaultExpanded={sid === "child"}
              >
                <IntakePlaceholder>
                  {pageLoading
                    ? "Loading form fields…"
                    : "Form fields will appear here. You can enter values manually or upload a recording for AI extraction."}
                </IntakePlaceholder>
              </IntakeCollapsibleSection>
            ))}

        <IntakeCollapsibleSection
          title="Background checks"
          subtitle="Registry and prior-case lookups"
          icon="🔎"
          defaultExpanded={false}
        >
          <BgChecks sources={bg} />
        </IntakeCollapsibleSection>

        <IntakeCollapsibleSection
          title="AI risk assessment"
          subtitle="Advisory score — screener retains override authority"
          icon="📊"
          defaultExpanded
        >
          <RiskScoreCard risk={risk} />
        </IntakeCollapsibleSection>

        <IntakeCollapsibleSection
          title="Emergency triage flags"
          subtitle="Confirm or dismiss AI-detected indicators"
          icon="🚨"
          defaultExpanded
        >
          <TriageSection flags={flags} onDecision={handleTriage} />
        </IntakeCollapsibleSection>

        <IntakeCollapsibleSection
          title="Submit to supervisor"
          subtitle="Complete required fields and checkpoint before submitting"
          icon="✅"
          defaultExpanded
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: submitStatus?.warn ? C.amber : C.textLight, marginTop: 2 }}>
                {submitStatus?.text ?? (form ? "Review required fields before submit" : "Loading form status…")}
              </div>
              {submitStatus && submitStatus.missingLabels.length > 0 && (
                <div style={{ fontSize: 10, color: C.textLight, marginTop: 6, lineHeight: 1.5 }}>
                  Missing: {submitStatus.missingLabels.join(" · ")}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
              {submitStatus && submitStatus.missingLabels.length > 0 && form && (
                <button
                  type="button"
                  className="app-btn ghost-btn"
                  onClick={() => {
                    const sid = firstMissingSection(form);
                    if (sid) setOpenSec(sid);
                  }}
                >
                  Jump to missing fields
                </button>
              )}
              {caseId && (
                <button
                  type="button"
                  className="app-btn ghost-btn"
                  disabled={reextracting || !transcript.length}
                  onClick={async () => {
                    setNlpReextracting(true);
                    try {
                      await reextractForm(caseId);
                      await refreshAll({ silent: true });
                    } catch {
                      setNlpReextracting(false);
                    }
                  }}
                >
                  {reextracting ? <LoadingSpinner size={14} /> : null}
                  Re-run AI extraction
                </button>
              )}
              <button type="button" className="app-btn ghost-btn">
                Save Draft
              </button>
              {canComplete && (
                <button
                  type="button"
                  className="app-btn"
                  style={{ background: C.navy, color: "#fff" }}
                  onClick={() => void handleCompleteCheckpoint()}
                >
                  Complete Initial Report Checkpoint
                </button>
              )}
              <button
                type="button"
                className="app-btn"
                style={{ background: C.teal, color: "#fff" }}
                disabled={!form || !submitReady || submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? <LoadingSpinner size={14} color="#fff" /> : null}
                Submit to Supervisor →
              </button>
            </div>
          </div>
        </IntakeCollapsibleSection>
        </div>
      </div>

      <div
        style={{
          width: 308,
          flexShrink: 0,
          marginLeft: 13,
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AIAssistant
          messages={messages}
          input={aiInput}
          setInput={setAiInput}
          onSend={() => void handleAiSend()}
          sending={aiSending}
          msgRef={aiRef}
          monitoring={pipelineMonitoring}
          onJump={(fieldId) => {
            document.getElementById(`field-${fieldId}`)?.scrollIntoView({ behavior: "smooth" });
            setOpenSec(
              SECTION_ORDER.find((sid) => form?.sections[sid].fields[fieldId]) ?? "child",
            );
          }}
        />
      </div>

      <LinkedCasesDrawer
        open={relatedDrawerOpen}
        relatedCases={relatedCases}
        onClose={() => setRelatedDrawerOpen(false)}
        onOpenCase={(id) => {
          setRelatedDrawerOpen(false);
          onCaseId(id);
        }}
      />
    </div>
  );
}
