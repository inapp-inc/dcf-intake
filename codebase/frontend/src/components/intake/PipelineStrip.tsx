import { C } from "../../theme/tokens";
import { Chip } from "../atoms";

const STAGE_LABELS: Record<string, string> = {
  transcription: "Transcription",
  nlp: "Field extraction",
  triage: "Triage",
  risk: "Risk score",
  background: "Background checks",
  documents: "Documents",
};

export function PipelineStrip({ stages, currentStage }: { stages: Record<string, string>; currentStage?: string }) {
  const keys = Object.keys(stages);
  if (!keys.length) return null;
  return (
    <div className="card fade-up" style={{ padding: "12px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: "uppercase", marginBottom: 10 }}>
        AI pipeline {currentStage ? `· ${STAGE_LABELS[currentStage] ?? currentStage}` : ""}
      </div>
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
    </div>
  );
}
