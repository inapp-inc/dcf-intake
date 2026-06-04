import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { Chip } from "../../components/atoms";
import { C } from "../../theme/tokens";
import { BackButton } from "../../components/ui/BackButton";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { LoadingBlock, LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useCaseWebSocket } from "../../hooks/useCaseWebSocket";
import { Report51bStepper } from "../../components/worker/Report51bStepper";
import { Report51bStatusChip } from "../../components/worker/Report51bStatusChip";
import { PIPELINE_POLL_MS } from "../../config/timeouts";
import { formatCaseTitle } from "../../utils/format";
import type { CaseSummary } from "../../api/types";

type AudioMemoState = "idle" | "uploading" | "processing" | "complete" | "failed";

const MEMO_ACCEPT = "audio/*,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.flac";

/** Matches demo API `complianceCheck` in report51bService (advisory only). */
function formatComplianceMessage(passed: boolean, missingFields: string[]): string {
  if (passed) {
    return "Compliance check passed — draft includes FINDINGS, DETERMINATION, and VISIT labels plus minimum length.";
  }
  const parts = missingFields.map((m) =>
    m === "MIN_LENGTH" ? "at least 100 characters of report text" : `section label “${m}” (anywhere in the draft)`,
  );
  return `Compliance check did not pass. Add: ${parts.join("; ")}.`;
}

export function WorkerReport({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [generated, setGenerated] = useState(false);
  const [audioSt, setAudioSt] = useState<AudioMemoState>("idle");
  const [memoFileName, setMemoFileName] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<string | null>(null);
  const { data: caseMeta } = useApiQuery(() => api.getCase(caseId), [caseId]);
  const caseRow: Pick<CaseSummary, "status" | "report51bStatus"> = {
    status: caseMeta?.status ?? "assigned",
    report51bStatus: status ?? caseMeta?.report51bStatus ?? null,
  };

  const syncFieldNotes = useCallback((text: string, memoStatus: string | null) => {
    setNotes(text);
    if (memoStatus === "running" || memoStatus === "pending") setAudioSt("processing");
    else if (memoStatus === "complete") setAudioSt("complete");
    else if (memoStatus === "failed") setAudioSt("failed");
  }, []);

  const pollFieldNotes = useCallback(async () => {
    try {
      const data = await api.getFieldNotes(caseId);
      syncFieldNotes(data.text, data.fieldMemoStatus);
    } catch {
      /* keep prior notes */
    }
  }, [caseId, syncFieldNotes]);

  useApiQuery(() => api.getFieldNotes(caseId), [caseId], {
    onSuccess: (data) => syncFieldNotes(data.text, data.fieldMemoStatus),
  });

  useCaseWebSocket(caseId, (ev) => {
    if (ev.type === "field_memo.complete" && typeof ev.text === "string") {
      setNotes(ev.text);
      setAudioSt("complete");
      setMemoError(null);
      void pollFieldNotes();
    }
    if (ev.type === "field_memo.failed") {
      setAudioSt("failed");
      setMemoError(ev.message ?? "Transcription failed");
    }
    if (ev.type === "pipeline.stage" && ev.stage === "field_memo") {
      if (ev.status === "running" || ev.status === "pending") setAudioSt("processing");
      if (ev.status === "complete") {
        setAudioSt("complete");
        void pollFieldNotes();
      }
      if (ev.status === "failed") setAudioSt("failed");
    }
  });

  useEffect(() => {
    if (audioSt !== "processing" && audioSt !== "uploading") return;
    const id = window.setInterval(() => void pollFieldNotes(), PIPELINE_POLL_MS);
    return () => window.clearInterval(id);
  }, [audioSt, pollFieldNotes]);

  const { loading: loadingDraft } = useApiQuery(
    () => api.getReport51bDraft(caseId),
    [caseId],
    {
      onSuccess: (d) => {
        if (d.content) {
          setDraft(d.content);
          setGenerated(true);
        }
        setStatus(d.status);
      },
    },
  );

  const { run: generate, pending: generating } = useAsyncAction(async (fieldNotes: string) => {
    const d = await api.generateReport51b(caseId, fieldNotes);
    setDraft(d.content);
    setStatus(d.status);
    setGenerated(true);
    setCompliance(null);
  });

  const { run: runCompliance, pending: checking } = useAsyncAction(async (content: string) => {
    const r = await api.complianceCheck51b(caseId, content);
    setCompliance(formatComplianceMessage(r.passed, r.missingFields));
  });

  const { run: submit, pending: submitting } = useAsyncAction(async (content: string) => {
    await api.approveReport51b(caseId, content);
    setStatus("worker_approved");
    setCompliance("Submitted to supervisor");
  });

  const handleMemoFile = async (file: File | undefined) => {
    if (!file) return;
    setMemoFileName(file.name);
    setMemoError(null);
    setAudioSt("uploading");
    try {
      await api.uploadFieldMemoAudio(caseId, file);
      setAudioSt("processing");
    } catch (e) {
      setAudioSt("failed");
      setMemoError(e instanceof Error ? e.message : "Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const memoBusy = audioSt === "uploading" || audioSt === "processing";

  return (
    <PageShell style={{ gap: 13 }}>
      <div className="card" style={{ padding: "13px 17px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <BackButton onClick={onBack} />
          <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
            51B Field Report — {formatCaseTitle(undefined, caseId)}
          </div>
          <Report51bStatusChip caseRow={caseRow} />
        </div>
      </div>
      <Report51bStepper
        caseRow={caseRow}
        draftStatus={status}
        hasDraftContent={Boolean(draft.trim())}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Field Notes & Voice Memos</div>
          <textarea
            className="dcf-input dcf-ta"
            style={{ minHeight: 120, marginBottom: 12 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes.trim()) void api.saveFieldNotes(caseId, notes).catch(() => undefined);
            }}
            placeholder="Enter your field observations here, or upload a voice memo below…"
            disabled={memoBusy}
          />
          <input
            ref={fileRef}
            type="file"
            accept={MEMO_ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => void handleMemoFile(e.target.files?.[0])}
          />
          <div
            role="button"
            tabIndex={memoBusy ? -1 : 0}
            style={{
              borderRadius: 9,
              border: `2px dashed ${audioSt === "failed" ? C.coral : C.border}`,
              padding: 16,
              textAlign: "center",
              cursor: memoBusy ? "wait" : "pointer",
              marginBottom: 12,
              opacity: memoBusy ? 0.85 : 1,
            }}
            onClick={() => !memoBusy && fileRef.current?.click()}
            onKeyDown={(e) => !memoBusy && e.key === "Enter" && fileRef.current?.click()}
          >
            {audioSt === "idle" && (
              <>
                <div style={{ fontSize: 20, marginBottom: 5 }}>🎙</div>
                <div style={{ fontSize: 12, color: C.textLight }}>
                  Upload voice memo · MP3, WAV, M4A, and other audio formats
                </div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>
                  Transcribed with the same Hugging Face ASR as 51A intake (may take several minutes)
                </div>
              </>
            )}
            {audioSt === "uploading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <LoadingSpinner size={28} />
                <div className="pulsing" style={{ fontSize: 12, color: C.teal }}>
                  Uploading {memoFileName ?? "audio"}…
                </div>
              </div>
            )}
            {audioSt === "processing" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <LoadingSpinner size={28} />
                <div className="pulsing" style={{ fontSize: 12, color: C.teal }}>
                  Transcribing {memoFileName ?? "voice memo"}…
                </div>
              </div>
            )}
            {audioSt === "complete" && (
              <div style={{ fontSize: 12, color: C.green }}>
                ✓ Voice memo transcribed and appended to field notes
                {memoFileName ? ` (${memoFileName})` : ""}
              </div>
            )}
            {audioSt === "failed" && (
              <div style={{ fontSize: 12, color: C.coral, lineHeight: 1.5 }}>
                {memoError ?? "Transcription failed"} — try again or type notes manually.
              </div>
            )}
          </div>
          <button
            type="button"
            className="dcf-btn"
            style={{ background: C.teal, color: "#fff", width: "100%", justifyContent: "center" }}
            disabled={generating || memoBusy}
            onClick={() => void generate(notes)}
          >
            {generating ? <LoadingSpinner size={14} color="#fff" /> : null}
            {generating ? "Generating draft…" : "Generate AI Draft Report →"}
          </button>
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <div className="sec-title" style={{ margin: 0 }}>
              AI Draft Report
            </div>
            {generated && (
              <Chip color={C.teal} bg={C.tealPale}>
                Draft Ready — Review Required
              </Chip>
            )}
          </div>
          <QueryState loading={loadingDraft} loadingMessage="Loading draft…" minHeight={140}>
            {!generated ? (
              <div style={{ background: C.bg, borderRadius: 9, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 12, color: C.textLight }}>
                  Add field notes or upload a voice memo, then click Generate.
                </div>
              </div>
            ) : generating ? (
              <LoadingBlock
                message="AI is writing the 51B draft…"
                hint="Hugging Face LLM in the demo stack can take several minutes."
                minHeight={200}
              />
            ) : (
              <div className="fade-in">
                <textarea
                  className="dcf-input dcf-ta"
                  style={{
                    minHeight: 200,
                    background: C.tealPale,
                    borderColor: C.teal,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: C.textDark,
                  }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div
                  style={{
                    marginTop: 10,
                    marginBottom: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    fontSize: 11,
                    color: C.textMid,
                    lineHeight: 1.55,
                  }}
                >
                  <div style={{ fontWeight: 700, color: C.textDark, marginBottom: 4 }}>About compliance check</div>
                  Advisory demo check only — it does not replace DCF policy or supervisor review. The API scans your
                  draft text (case-insensitive) for the words <strong>FINDINGS</strong>, <strong>DETERMINATION</strong>,
                  and <strong>VISIT</strong>, and requires at least 100 characters. AI drafts are prompted to include
                  FINDINGS and DETERMINATION; add “VISIT” or “VISIT DATE” if the check flags it. Submitting does not
                  require a passing check, but you should fix gaps before supervisor review.
                </div>
                <div style={{ marginTop: 11, display: "flex", gap: 9 }}>
                  <button
                    type="button"
                    className="dcf-btn"
                    style={{ background: C.navy, color: "#fff", flex: 1, justifyContent: "center" }}
                    disabled={submitting || checking}
                    onClick={() => void submit(draft)}
                  >
                    {submitting ? <LoadingSpinner size={14} color="#fff" /> : null}
                    Submit to Supervisor
                  </button>
                  <button
                    type="button"
                    className="dcf-btn ghost-btn"
                    disabled={submitting || checking}
                    onClick={() => void runCompliance(draft)}
                    title="Scan draft for required section labels and minimum length"
                  >
                    {checking ? <LoadingSpinner size={14} /> : null}
                    Compliance Check
                  </button>
                </div>
                {compliance && (
                  <p
                    style={{
                      fontSize: 11,
                      color: compliance.startsWith("Compliance check passed") ? C.green : C.amber,
                      marginTop: 8,
                      fontWeight: 600,
                    }}
                  >
                    {compliance}
                  </p>
                )}
                <p style={{ fontSize: 10, color: C.textLight, marginTop: 7 }}>
                  AI-generated draft must be reviewed and approved by the assigned worker before submission.
                </p>
              </div>
            )}
          </QueryState>
        </div>
      </div>
    </PageShell>
  );
}
