import { Chip } from "../atoms";
import { C } from "../../theme/tokens";
import { briefingProgress, briefingProgressLabel, type BriefingProgress } from "../../utils/briefingStatus";

export function BriefingStatusChip({
  briefingOpenedAt,
}: {
  briefingOpenedAt?: string | null;
}) {
  const progress = briefingProgress({ briefingOpenedAt });
  const color = progress === "in_progress" ? C.teal : C.amber;
  const bg = progress === "in_progress" ? C.tealPale : C.amberPale;
  return (
    <Chip color={color} bg={bg}>
      Briefing: {briefingProgressLabel(progress)}
    </Chip>
  );
}

export function briefingStatusDetail(progress: BriefingProgress): string {
  return progress === "in_progress"
    ? "Pre-visit briefing opened — continue review before field visit"
    : "Pre-visit briefing not opened yet";
}
