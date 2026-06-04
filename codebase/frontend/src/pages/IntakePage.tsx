import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCaseWebSocket } from "../hooks/useCaseWebSocket";
import { C } from "../theme/tokens";
import { Chip, EmergBadge, RiskBadge } from "../components/atoms";
import { PipelineStrip } from "../components/intake/PipelineStrip";
import { AudioUpload, type TxState } from "../components/intake/AudioUpload";
import { TranscriptPanel } from "../components/intake/TranscriptPanel";
import { FormSection } from "../components/intake/FormSection";
import { BgChecks } from "../components/intake/BgChecks";
import { RiskScoreCard } from "../components/intake/RiskScoreCard";
import { TriageSection } from "../components/intake/TriageSection";
import { AIAssistant } from "../components/intake/AIAssistant";
import { formatCaseTitle, formatInitiatedTime } from "../utils/format";
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

const SECTION_ORDER: SectionId[] = ["child", "incident", "reporter", "household"];

export function IntakePage({
  caseId,
  onCaseId,
  onSubmitted,
}: {
  caseId: string | null;
  onCaseId: (id: string) => void;
  onSubmitted?: () => void;
}) {
  const { token } = useAuth();
  const [txState, setTxState] = useState<TxState>("idle");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [form, setForm] = useState<Form51A | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [flags, setFlags] = useState<TriageFlag[]>([]);
  const [bg, setBg] = useState<BackgroundSource[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [openSec, setOpenSec] = useState<SectionId | null>("child");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<string | null>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAll = useCallback(async () => {
    if (!token || !caseId) return;
    try {
      const caseMeta = await api.getCase(token, caseId).catch(() => null);
      if (caseMeta?.externalId) setExternalId(caseMeta.externalId);
      if (caseMeta) {
        setEmergency(caseMeta.emergency);
        const created = (caseMeta as { createdAt?: string }).createdAt;
        if (created) setInitiatedAt(created);
      }

      const [f, t, m, p] = await Promise.all([
        api.getForm51a(token, caseId),
        api.getTranscript(token, caseId).catch(() => ({ segments: [] })),
        api.getAssistantMessages(token, caseId).catch(() => []),
        api.getPipeline(token, caseId),
      ]);
      setForm(f);
      setTranscript(t.segments);
      setMessages(m);
      setPipeline(p);
      const tx = p.stages?.transcription;
      if (tx === "complete") setTxState("complete");
      else if (tx === "running" || tx === "pending") setTxState("processing");
      try {
        const r = await api.getRisk(token, caseId);
        setRisk(r);
      } catch {
        setRisk(null);
      }
      try {
        const fl = await api.getTriageFlags(token, caseId);
        setFlags(fl);
      } catch {
        /* */
      }
      try {
        const b = await api.getBackgroundChecks(token, caseId);
        setBg(b.sources);
      } catch {
        setBg([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load case");
    }
  }, [token, caseId]);

  useEffect(() => {
    if (!token) return;
    if (!caseId) {
      api
        .createCase(token)
        .then((c) => onCaseId(c.caseId))
        .catch((e) => setError(e instanceof Error ? e.message : "Could not create case"));
      return;
    }
    void refreshAll();
  }, [token, caseId, onCaseId, refreshAll]);

  useEffect(() => {
    if (!token || !caseId || txState !== "processing") return;
    const id = setInterval(() => void refreshAll(), 4000);
    return () => clearInterval(id);
  }, [token, caseId, txState, refreshAll]);

  const refreshAssistant = useCallback(async () => {
    if (!token || !caseId) return;
    const m = await api.getAssistantMessages(token, caseId).catch(() => []);
    setMessages(m);
    setTimeout(() => {
      if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
    }, 80);
  }, [token, caseId]);

  const onWsEvent = useCallback(
    (ev: CaseWsEvent) => {
      if (ev.type === "transcript.line" && ev.text) {
        setTxState((s) => (s === "idle" ? "processing" : s));
        setTranscript((prev) => {
          const next = {
            speaker: (ev.speaker === "S" ? "S" : "C") as "S" | "C",
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
        void refreshAll();
      }
      if (ev.type === "triage.alert") void refreshAll();
    },
    [refreshAll, refreshAssistant],
  );

  useCaseWebSocket(caseId, token, onWsEvent);

  const handleUpload = async (file: File) => {
    if (!token || !caseId) return;
    setUploadFile(file);
    setTxState("uploading");
    setError(null);
    try {
      await api.uploadAudio(token, caseId, file);
      setTxState("processing");
    } catch (e) {
      setTxState("idle");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const schedulePatch = (sectionId: SectionId, fieldId: string, value: string) => {
    if (!token || !caseId || !form) return;
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
        const updated = await api.patchForm51a(token, caseId, [{ sectionId, fieldId, value }]);
        setForm(updated);
      } catch {
        /* */
      }
    }, 400);
  };

  const handleConfirmSection = async (sectionId: SectionId) => {
    if (!token || !caseId) return;
    const updated = await api.confirmSection(token, caseId, sectionId);
    setForm(updated);
  };

  const handleCompleteCheckpoint = async () => {
    if (!token || !caseId) return;
    setError(null);
    try {
      await api.completeCheckpoint(token, caseId);
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
    if (!token || !caseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitCase(token, caseId);
      setSubmitSuccess(`Submitted to supervisor (${res.externalId ?? res.status}).`);
      if (onSubmitted) {
        setTimeout(() => onSubmitted(), 1500);
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "FORM_51A_INCOMPLETE") {
        setError("51A checkpoint must be complete before submit.");
      } else {
        setError(e instanceof Error ? e.message : "Submit failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiSend = async () => {
    if (!token || !caseId || !aiInput.trim()) return;
    const text = aiInput.trim();
    setAiInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, type: "user", message: text }]);
    try {
      const reply = await api.postAssistantMessage(token, caseId, text);
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, type: "warning", message: "Assistant unavailable." },
      ]);
    }
    setTimeout(() => {
      if (aiRef.current) aiRef.current.scrollTop = aiRef.current.scrollHeight;
    }, 100);
  };

  const handleTriage = async (flagId: string, action: "confirm" | "dismiss", reason?: string) => {
    if (!token || !caseId) return;
    await api.triageDecision(token, caseId, flagId, action, reason);
    const fl = await api.getTriageFlags(token, caseId);
    setFlags(fl);
  };

  const transcriptionComplete =
    pipeline?.stages?.transcription === "complete" || txState === "complete";
  const showWorkflow = txState !== "idle";
  const showTranscript = showWorkflow && (transcript.length > 0 || txState === "processing");
  const showForm = transcriptionComplete && form;
  const canSubmit = form?.completion.canSubmitToSupervisor ?? false;
  const canComplete =
    form &&
    form.completion.mandatoryFilled === form.completion.mandatoryTotal &&
    form.completion.aiFieldsPendingConfirmation === 0 &&
    form.checkpointStatus !== "complete";

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 94px)", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="card" style={{ padding: "13px 17px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 700, textTransform: "uppercase" }}>
              New 51A Report
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
              {externalId ? formatCaseTitle(externalId) : form?.caseId ? formatCaseTitle(undefined, form.caseId) : "Creating case…"}
            </div>
          </div>
          {emergency && <EmergBadge />}
          {risk && <RiskBadge score={risk.score} />}
          {initiatedAt && (
            <Chip color={C.teal} bg={C.tealPale}>
              Initiated {formatInitiatedTime(initiatedAt)}
            </Chip>
          )}
          {form?.checkpointStatus === "ready_for_review" && (
            <Chip color={C.teal} bg={C.tealPale}>
              AI fields ready for review
            </Chip>
          )}
          <button
            type="button"
            className="dcf-btn ghost-btn"
            style={{ fontSize: 12 }}
            disabled={!caseId}
            onClick={() => token && caseId && api.openOfficialForm(token, caseId)}
          >
            Open 51A for printing
          </button>
        </div>

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

        {showForm && (
          <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "0 2px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textDark }}>51A Report Fields</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: C.tealPale, border: `1.5px solid ${C.teal}` }} />
              <span style={{ fontSize: 10, color: C.textLight }}>AI auto-populated</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: C.amberPale, border: `1.5px solid ${C.amber}` }} />
              <span style={{ fontSize: 10, color: C.textLight }}>Needs your attention</span>
            </div>
          </div>
        )}

        <AudioUpload state={txState} file={uploadFile} onUpload={handleUpload} />
        {pipeline && showWorkflow && <PipelineStrip stages={pipeline.stages} currentStage={pipeline.currentStage} />}
        {showTranscript && <TranscriptPanel segments={transcript} live={txState === "processing"} />}
        {bg.length > 0 && <BgChecks sources={bg} />}
        {showForm &&
          form &&
          SECTION_ORDER.map((sid) => {
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
          })}
        {risk && <RiskScoreCard risk={risk} />}
        {flags.length > 0 && <TriageSection flags={flags} onDecision={handleTriage} />}

        {showForm && form && (
          <div className="card fade-up" style={{ padding: "13px 17px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Ready to submit?</div>
              <div style={{ fontSize: 11, color: canSubmit ? C.textLight : C.amber, marginTop: 2 }}>
                {canSubmit
                  ? `${form.completion.mandatoryFilled}/${form.completion.mandatoryTotal} required fields complete`
                  : `⚠ ${form.completion.mandatoryTotal - form.completion.mandatoryFilled} required fields still missing — review items flagged by the assistant`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="dcf-btn ghost-btn">
                Save Draft
              </button>
              {!canSubmit && canComplete && (
                <button type="button" className="dcf-btn ghost-btn" onClick={() => void handleCompleteCheckpoint()}>
                  Complete 51A Checkpoint
                </button>
              )}
              <button
                type="button"
                className="dcf-btn"
                style={{ background: C.teal, color: "#fff" }}
                disabled={!canSubmit || submitting}
                onClick={() => void handleSubmit()}
              >
                Submit to Supervisor →
              </button>
            </div>
          </div>
        )}
        <div style={{ height: 18 }} />
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
          msgRef={aiRef}
          monitoring={showWorkflow}
          onJump={(fieldId) => {
            document.getElementById(`field-${fieldId}`)?.scrollIntoView({ behavior: "smooth" });
            setOpenSec(
              SECTION_ORDER.find((sid) => form?.sections[sid].fields[fieldId]) ?? "child",
            );
          }}
        />
      </div>
    </div>
  );
}
