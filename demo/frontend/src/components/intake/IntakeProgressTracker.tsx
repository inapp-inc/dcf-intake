import { C } from "../../theme/tokens";
import type { Form51A, PipelineStatus } from "../../api/types";
import { formatCheckpointStatus } from "../../utils/format";

type StepState = "done" | "active" | "pending" | "failed";

function stageState(st?: string): StepState {
  if (st === "complete") return "done";
  if (st === "failed") return "failed";
  if (st === "running" || st === "pending") return "active";
  return "pending";
}

export function IntakeProgressTracker({
  form,
  pipeline,
  hasTranscript,
  hasAudio,
  liveActive = false,
}: {
  form: Form51A | null;
  pipeline: PipelineStatus | null;
  hasTranscript: boolean;
  hasAudio: boolean;
  liveActive?: boolean;
}) {
  const stages = pipeline?.stages ?? {};
  const completion = form?.completion;

  const steps: { id: string; label: string; detail: string; state: StepState }[] = [
    {
      id: "audio",
      label: liveActive ? "Live demo call" : "Call recording",
      detail: liveActive
        ? stageState(stages.live_transcription) === "active"
          ? "Live session in progress"
          : "Live session ended"
        : hasAudio
          ? "Audio uploaded"
          : "Upload audio or start live demo",
      state: liveActive
        ? stageState(stages.live_transcription) === "done"
          ? "done"
          : "active"
        : hasAudio
          ? "done"
          : "pending",
    },
    {
      id: "transcription",
      label: "Transcription",
      detail: liveActive
        ? hasTranscript
          ? "Live transcript stitching"
          : "Waiting for speech…"
        : hasTranscript
          ? "Transcript available"
          : stageState(stages.transcription) === "active"
            ? "Transcribing…"
            : "Waiting for audio",
      state: hasTranscript
        ? liveActive && stageState(stages.live_transcription) === "active"
          ? "active"
          : "done"
        : stageState(stages.transcription),
    },
    {
      id: "nlp",
      label: "Initial Report field extraction",
      detail:
        form?.checkpointStatus === "ai_populating"
          ? "AI extracting intake fields…"
          : stageState(stages.nlp) === "done"
            ? "Fields extracted — confirm teal highlights"
            : stageState(stages.nlp) === "active"
              ? "Extracting…"
              : "Pending transcription",
      state: form?.checkpointStatus === "ai_populating" ? "active" : stageState(stages.nlp),
    },
    {
      id: "triage",
      label: "Emergency triage",
      detail: stageState(stages.triage) === "done" || stageState(stages.keywords_triage) === "done" ? "Triage evaluated" : "After extraction",
      state: stageState(stages.triage) === "done" || stageState(stages.keywords_triage) === "done" ? "done" : stageState(stages.triage),
    },
    {
      id: "risk",
      label: "Risk score",
      detail: stageState(stages.risk) === "done" ? "Advisory score ready" : "After extraction",
      state: stageState(stages.risk),
    },
    {
      id: "bg",
      label: "Background checks",
      detail: stageState(stages.background) === "done" ? "Checks complete" : "Runs after checkpoint",
      state: stageState(stages.background),
    },
    {
      id: "form",
      label: "Initial Report form completion",
      detail: completion
        ? `${completion.mandatoryFilled}/${completion.mandatoryTotal} required fields · ${completion.aiFieldsPendingConfirmation} AI to confirm`
        : "Loading form…",
      state: completion?.canCompleteCheckpoint
        ? "done"
        : completion && completion.mandatoryFilled > 0
          ? "active"
          : "pending",
    },
    {
      id: "checkpoint",
      label: "Initial Report checkpoint",
      detail: form ? formatCheckpointStatus(form.checkpointStatus) : "—",
      state:
        form?.checkpointStatus === "complete" || form?.checkpointStatus === "locked"
          ? "done"
          : form?.checkpointStatus === "ready_for_review" || form?.checkpointStatus === "incomplete"
            ? "active"
            : "pending",
    },
    {
      id: "submit",
      label: "Supervisor submit",
      detail: completion?.canSubmitToSupervisor
        ? "Ready to submit"
        : form?.checkpointStatus === "locked"
          ? "Submitted"
          : "Complete checkpoint first",
      state: completion?.canSubmitToSupervisor || form?.checkpointStatus === "locked" ? "done" : "pending",
    },
  ];

  const color = (s: StepState) =>
    s === "done" ? C.green : s === "active" ? C.teal : s === "failed" ? C.coral : C.textLight;

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="sec-title">Intake progress</div>
      <p style={{ fontSize: 11, color: C.textLight, marginTop: -6, marginBottom: 12 }}>
        Fine-grained status before supervisor submission
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: step.state === "pending" ? C.textLight : "#fff",
                background: color(step.state),
                border: step.state === "pending" ? `1.5px solid ${C.border}` : "none",
              }}
            >
              {step.state === "done" ? "✓" : step.state === "failed" ? "!" : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{step.label}</div>
              <div style={{ fontSize: 11, color: C.textLight, lineHeight: 1.4 }}>{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
