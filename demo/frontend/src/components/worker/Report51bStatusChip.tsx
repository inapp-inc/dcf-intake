import { Chip } from "../atoms";
import { C } from "../../theme/tokens";
import { report51bWorkflowLabel, report51bWorkflowStep } from "../../utils/report51bStatus";
import type { CaseSummary } from "../../api/types";

export function Report51bStatusChip({
  caseRow,
}: {
  caseRow: Pick<CaseSummary, "status" | "report51bStatus">;
}) {
  const step = report51bWorkflowStep(caseRow);
  const color = step === "submitted" ? C.green : step === "draft" ? C.teal : C.textMid;
  const bg = step === "submitted" ? C.greenPale : step === "draft" ? C.tealPale : C.bg;
  return (
    <Chip color={color} bg={bg}>
      51B: {report51bWorkflowLabel(step)}
    </Chip>
  );
}
