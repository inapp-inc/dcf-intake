import * as formRepo from "../../repositories/form51aRepository.js";

export async function submitCaseToSupervisor(caseId: string): Promise<{ status: string; message: string }> {
  const checkpoint = await formRepo.getCheckpointStatus(caseId);
  if (checkpoint !== "complete") {
    throw Object.assign(new Error("51A checkpoint must be complete before submit"), {
      status: 409,
      code: "FORM_51A_INCOMPLETE",
      checkpointStatus: checkpoint,
    });
  }

  await formRepo.setCheckpointStatus(caseId, "locked");
  const { query } = await import("../../db/pool.js");
  await query("UPDATE cases SET status = $2, updated_at = now() WHERE id = $1", [
    caseId,
    "pending_review",
  ]);

  return { status: "pending_review", message: "Case submitted to supervisor queue" };
}
