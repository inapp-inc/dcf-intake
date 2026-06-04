import { SECTION_IDS, type SectionId } from "../../domain/form51a/fieldCatalog.js";
import type { CheckpointStatus, Form51ACompletion, Form51ASection } from "../../domain/form51a/types.js";

export function computeCompletion(
  sections: Record<SectionId, Form51ASection>,
  checkpointStatus: CheckpointStatus,
): Form51ACompletion {
  let mandatoryTotal = 0;
  let mandatoryFilled = 0;
  let aiFieldsPendingConfirmation = 0;
  const sectionsComplete: SectionId[] = [];

  for (const sectionId of SECTION_IDS) {
    const sec = sections[sectionId];
    let sectionOk = true;
    for (const field of Object.values(sec.fields)) {
      if (field.required) {
        mandatoryTotal++;
        if (field.value.trim()) mandatoryFilled++;
        else sectionOk = false;
      }
      if (field.source === "ai" && !field.confirmedByHuman) {
        aiFieldsPendingConfirmation++;
      }
    }
    if (sectionOk) sectionsComplete.push(sectionId);
  }

  const canCompleteCheckpoint =
    mandatoryFilled === mandatoryTotal && aiFieldsPendingConfirmation === 0;

  return {
    mandatoryTotal,
    mandatoryFilled,
    aiFieldsPendingConfirmation,
    sectionsComplete,
    canSubmitToSupervisor: checkpointStatus === "complete",
  };
}

export function validateForCheckpoint(sections: Record<SectionId, Form51ASection>): {
  ok: boolean;
  missingFields: string[];
  unconfirmedAiFields: string[];
} {
  const missingFields: string[] = [];
  const unconfirmedAiFields: string[] = [];

  for (const sectionId of SECTION_IDS) {
    for (const [fieldId, field] of Object.entries(sections[sectionId].fields)) {
      const key = `${sectionId}.${fieldId}`;
      if (field.required && !field.value.trim()) missingFields.push(key);
      if (field.source === "ai" && !field.confirmedByHuman) unconfirmedAiFields.push(key);
    }
  }

  return {
    ok: missingFields.length === 0 && unconfirmedAiFields.length === 0,
    missingFields,
    unconfirmedAiFields,
  };
}
