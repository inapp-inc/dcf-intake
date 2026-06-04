import { C } from "../../theme/tokens";
import { Chip } from "../atoms";

const STAGE_LABELS: Record<string, string> = {
  transcription: "Transcription",
  clean: "Clean transcript",
  nlp: "Field extraction",
  triage: "Triage",
  keywords_triage: "Triage",
  risk: "Risk score",
  background: "Background checks",
  documents: "Documents",
};

export function PipelineStrip({ stages, currentStage }: { stages: Record<string, string>; currentStage?: string }) {
  const keys = Object.keys(stages);
  if (!keys.length) {
    return (
      <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
        Pipeline idle — upload a call recording to start transcription and AI extraction.
      </p>
    );
  }
  return (
    <>
      {currentStage && (
        <p style={{ fontSize: 11, color: C.textLight, margin: "0 0 10px" }}>
          Current stage: {STAGE_LABELS[currentStage] ?? currentStage}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {keys.map((k) => {
          const st = stages[k];
          const color = st === "complete" ? C.green : st === "failed" ? C.coral : st === "running" ? C.teal : C.textLight;
          const bg = st === "complete" ? C.greenPale : st === "failed" ? C.coralPale : st === "running" ? C.tealPale : C.bg;
          return (
            <Chip key={k} color={color} bg={bg}>
              {STAGE_LABELS[k] ?? k}: {st}
            </Chip>
          );
        })}
      </div>
    </>
  );
}
