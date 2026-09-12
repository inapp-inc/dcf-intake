import * as formRepo from "../../repositories/form51aRepository.js";
import { enqueuePipelineJob } from "../../services/redisClient.js";
import { validateForCheckpoint } from "./completion.js";

export async function completeForm51aCheckpoint(caseId: string): Promise<{
  checkpointStatus: "complete";
  completedAt: string;
  backgroundChecksStarted: boolean;
}> {
  const form = await formRepo.loadForm51A(caseId);
  if (form.checkpointStatus === "locked") {
    throw Object.assign(new Error("Form is locked"), { status: 409, code: "FORM_LOCKED" });
  }

  await formRepo.confirmAllAiFields(caseId);
  const refreshed = await formRepo.loadForm51A(caseId);
  const validation = validateForCheckpoint(refreshed.sections);
  if (!validation.ok) {
    throw Object.assign(new Error("Initial Report incomplete"), {
      status: 409,
      code: "FORM_51A_INCOMPLETE",
      missingFields: validation.missingFields,
      unconfirmedAiFields: validation.unconfirmedAiFields,
      checkpointStatus: refreshed.checkpointStatus,
    });
  }

  await formRepo.setCheckpointStatus(caseId, "complete");
  await enqueuePipelineJob(caseId, "background");

  return {
    checkpointStatus: "complete",
    completedAt: new Date().toISOString(),
    backgroundChecksStarted: true,
  };
}
