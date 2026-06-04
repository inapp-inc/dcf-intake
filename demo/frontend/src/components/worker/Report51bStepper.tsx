import { C } from "../../theme/tokens";
import { report51bWorkflowStep } from "../../utils/report51bStatus";
import type { CaseSummary } from "../../api/types";

const STEPS = [
  { id: "notes", label: "Field notes / voice memo" },
  { id: "draft", label: "AI draft (generate & edit)" },
  { id: "compliance", label: "Compliance check" },
  { id: "submit", label: "Submit to supervisor" },
] as const;

export function Report51bStepper({
  caseRow,
  draftStatus,
  hasDraftContent,
}: {
  caseRow: Pick<CaseSummary, "status" | "report51bStatus">;
  draftStatus?: string | null;
  hasDraftContent?: boolean;
}) {
  const workflow = report51bWorkflowStep({
    status: caseRow.status,
    report51bStatus: draftStatus ?? caseRow.report51bStatus,
  });
  const activeIndex =
    workflow === "submitted"
      ? 3
      : workflow === "draft" || hasDraftContent
        ? draftStatus === "worker_approved"
          ? 3
          : 2
        : 0;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 14,
        padding: "10px 12px",
        background: C.bg,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}
    >
      {STEPS.map((step, i) => {
        const done = i < activeIndex || workflow === "submitted";
        const active = i === activeIndex && workflow !== "submitted";
        return (
          <div
            key={step.id}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 999,
              background: done ? C.greenPale : active ? C.tealPale : C.surface,
              color: done ? C.green : active ? C.teal : C.textLight,
              border: `1px solid ${done ? C.green : active ? C.teal : C.border}`,
            }}
          >
            {done ? "✓ " : active ? "→ " : ""}
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
