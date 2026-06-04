import { C } from "../../theme/tokens";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { Form51A, SectionId } from "../../api/types";

const SECTION_ORDER: SectionId[] = ["child", "incident", "reporter", "household", "filing"];

export function FormPopulatingCard({
  form,
  pipelineStage,
}: {
  form: Form51A;
  pipelineStage?: string;
}) {
  const stageLabel =
    pipelineStage === "clean"
      ? "Preparing transcript…"
      : pipelineStage === "nlp"
        ? "Extracting fields with the intake model…"
        : "Starting field extraction…";

  return (
    <div
      className="card fade-up"
      style={{
        padding: "18px 20px",
        border: `1.5px solid ${C.teal}44`,
        background: `linear-gradient(135deg, ${C.tealPale} 0%, ${C.white} 55%)`,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <LoadingSpinner size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
            Building your 51A from the call
          </div>
          <p style={{ fontSize: 12, color: C.teal, marginTop: 6, marginBottom: 0 }} className="pulsing">
            {stageLabel}
          </p>
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 8, marginBottom: 14, lineHeight: 1.45 }}>
            AI is still extracting from the call. You can fill or edit the fields below now — teal values will
            update as extraction finishes.
          </p>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            {SECTION_ORDER.map((sid) => {
              const sec = form.sections[sid];
              const fieldCount = Object.keys(sec.fields).length;
              return (
                <li
                  key={sid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    color: C.textDark,
                  }}
                >
                  <span style={{ fontSize: 14 }} aria-hidden>
                    {sec.icon}
                  </span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{sec.title}</span>
                  <span style={{ fontSize: 10, color: C.textLight }}>{fieldCount} fields</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
