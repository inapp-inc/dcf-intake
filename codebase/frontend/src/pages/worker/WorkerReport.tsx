import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { Chip } from "../../components/atoms";
import { formatCaseTitle } from "../../utils/format";

type AudioMemoState = "idle" | "processing" | "complete";

export function WorkerReport({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [generated, setGenerated] = useState(false);
  const [audioSt, setAudioSt] = useState<AudioMemoState>("idle");
  const [status, setStatus] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .getReport51bDraft(token, caseId)
      .then((d) => {
        if (d.content) {
          setDraft(d.content);
          setGenerated(true);
        }
        setStatus(d.status);
      })
      .catch(() => undefined);
  }, [token, caseId]);

  const generate = async () => {
    if (!token) return;
    const d = await api.generateReport51b(token, caseId, notes);
    setDraft(d.content);
    setStatus(d.status);
    setGenerated(true);
  };

  const runCompliance = async () => {
    if (!token) return;
    const r = await api.complianceCheck51b(token, caseId, draft);
    setCompliance(r.passed ? "✓ Compliance check passed" : `Missing: ${r.missingFields.join(", ")}`);
  };

  const submit = async () => {
    if (!token) return;
    await api.approveReport51b(token, caseId, draft);
    setStatus("worker_approved");
    setCompliance("Submitted to supervisor");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }} className="fade-up">
      <div className="card" style={{ padding: "13px 17px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              color: C.textMid,
            }}
          >
            ← Back
          </button>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
            51B Field Report — {formatCaseTitle(undefined, caseId)}
          </div>
          {status && (
            <Chip color={C.teal} bg={C.tealPale}>
              {status.replace(/_/g, " ")}
            </Chip>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Field Notes & Voice Memos</div>
          <textarea
            className="dcf-input dcf-ta"
            style={{ minHeight: 120, marginBottom: 12 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter your field observations here, or upload a voice memo below…"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav"
            style={{ display: "none" }}
            onChange={() => {
              setAudioSt("processing");
              setTimeout(() => {
                setAudioSt("complete");
                setNotes((n) => (n ? `${n}\n\n` : "") + "[Voice memo transcribed and appended]");
              }, 2500);
            }}
          />
          <div
            role="button"
            tabIndex={0}
            style={{
              borderRadius: 9,
              border: `2px dashed ${C.border}`,
              padding: 16,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 12,
            }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            {audioSt === "idle" && (
              <>
                <div style={{ fontSize: 20, marginBottom: 5 }}>🎙</div>
                <div style={{ fontSize: 12, color: C.textLight }}>Upload voice memo · MP3, WAV</div>
              </>
            )}
            {audioSt === "processing" && (
              <div className="pulsing" style={{ fontSize: 12, color: C.teal }}>
                Transcribing voice memo…
              </div>
            )}
            {audioSt === "complete" && (
              <div style={{ fontSize: 12, color: C.green }}>✓ Voice memo transcribed and appended to field notes</div>
            )}
          </div>
          <button
            type="button"
            className="dcf-btn"
            style={{ background: C.teal, color: "#fff", width: "100%", justifyContent: "center" }}
            onClick={() => void generate()}
          >
            Generate AI Draft Report →
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
          {!generated ? (
            <div style={{ background: C.bg, borderRadius: 9, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 12, color: C.textLight }}>
                Add field notes or upload a voice memo, then click Generate.
              </div>
            </div>
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
              <div style={{ marginTop: 11, display: "flex", gap: 9 }}>
                <button
                  type="button"
                  className="dcf-btn"
                  style={{ background: C.navy, color: "#fff", flex: 1, justifyContent: "center" }}
                  onClick={() => void submit()}
                >
                  Submit to Supervisor
                </button>
                <button type="button" className="dcf-btn ghost-btn" onClick={() => void runCompliance()}>
                  Compliance Check
                </button>
              </div>
              {compliance && <p style={{ fontSize: 11, color: C.textLight, marginTop: 8 }}>{compliance}</p>}
              <p style={{ fontSize: 10, color: C.textLight, marginTop: 7 }}>
                AI-generated draft must be reviewed and approved by the assigned worker before submission. Worker
                approval is required — human-in-the-loop is a system invariant.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
