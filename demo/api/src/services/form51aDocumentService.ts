import type { SectionId } from "../domain/form51a/fieldCatalog.js";
import {
  createEmptyDocument,
  emptyChildEntry,
  MAX_51A_CHILDREN,
  type Form51ADocument,
  type Form51AChildEntry,
} from "../domain/form51a/document.js";
import type { Form51A } from "../domain/form51a/types.js";
import { mapReport51aToOfficialFields, type OfficialFormContext } from "../adapters/officialFormMapper.js";
import * as docRepo from "../repositories/form51aDocumentRepository.js";
import * as formRepo from "../repositories/form51aRepository.js";

function str(val: unknown): string {
  return val != null && val !== false ? String(val).trim() : "";
}

function bool(val: unknown): boolean {
  return val === true || val === "true";
}

function getField(form: Form51A, section: string, fieldId: string): string {
  const sec = form.sections[section as SectionId];
  return sec?.fields[fieldId]?.value?.trim() ?? "";
}

/** Parse household.other_kids into separate sibling records. */
export function parseSiblingEntries(text: string): { name: string; ageOrDob: string }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks = trimmed
    .split(/[;\n]+/)
    .flatMap((chunk) => {
      const parts = chunk.split(/\band\b/i);
      return parts.length > 1 ? parts : [chunk];
    })
    .map((p) => p.trim().replace(/^and\s+/i, ""))
    .filter(Boolean);

  return chunks
    .map((part) => {
      const parenAge = part.match(/\((\d{1,2})\)/);
      const ageMatch =
        parenAge ??
        part.match(/\b(?:age\s*)?(\d{1,2})\s*(?:yo|y\.?o\.?|years?\s*old)?\b/i) ??
        part.match(/,\s*(\d{1,2})\s*(?:yo|years?)?\s*$/i);
      const ageOrDob = ageMatch?.[1] ?? "";
      const name = part
        .replace(/\(\s*\d{1,2}\s*\)/g, "")
        .replace(/\b(?:age\s*)?\d{1,2}\s*(?:yo|y\.?o\.?|years?\s*old)?\b/gi, "")
        .replace(/,\s*$/, "")
        .trim();
      return { name, ageOrDob };
    })
    .filter((c) => c.name);
}

function childFromPayload(payload: Record<string, string | boolean>, index: number): Form51AChildEntry {
  const i = index + 1;
  return {
    name: str(payload[`child${i}_name`]),
    address: str(payload[`child${i}_address`]),
    male: bool(payload[`child${i}_male`]),
    female: bool(payload[`child${i}_female`]),
    ageOrDob: str(payload[`child${i}_age`]),
  };
}

export function officialPayloadToDocument(caseId: string, payload: Record<string, string | boolean>): Form51ADocument {
  const doc = createEmptyDocument(caseId);
  doc.reportDate = str(payload.report_date);
  doc.children = Array.from({ length: MAX_51A_CHILDREN }, (_, idx) => childFromPayload(payload, idx));

  doc.parentGuardian1 = {
    first: str(payload.pg1_first),
    last: str(payload.pg1_last),
    middle: str(payload.pg1_middle),
    street: str(payload.pg1_street),
    city: str(payload.pg1_city),
    state: str(payload.pg1_state),
    zip: str(payload.pg1_zip),
    phone: str(payload.pg1_phone),
    dob: str(payload.pg1_dob),
  };
  doc.parentGuardian2 = {
    first: str(payload.pg2_first),
    last: str(payload.pg2_last),
    middle: str(payload.pg2_middle),
    street: str(payload.pg2_street),
    city: str(payload.pg2_city),
    state: str(payload.pg2_state),
    zip: str(payload.pg2_zip),
    phone: str(payload.pg2_phone),
    dob: str(payload.pg2_dob),
  };
  doc.reporter = {
    mandatory: bool(payload.mandatory),
    voluntary: bool(payload.voluntary),
    first: str(payload.rep_first),
    last: str(payload.rep_last),
    middle: str(payload.rep_middle),
    institution: str(payload.rep_institution),
    street: str(payload.rep_street),
    city: str(payload.rep_city),
    state: str(payload.rep_state),
    zip: str(payload.rep_zip),
    phone: str(payload.rep_phone),
    caretakerYes: bool(payload.caretaker_yes),
    caretakerNo: bool(payload.caretaker_no),
  };
  doc.narrative = {
    nature: str(payload.q_nature),
    responsible: str(payload.q_responsible),
    circumstances: str(payload.q_circumstances),
    action: str(payload.q_action),
    dv: str(payload.q_dv),
    strengths: str(payload.q_strengths),
    signature: str(payload.signature),
  };
  return doc;
}

export function documentToOfficialPayload(doc: Form51ADocument): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  doc.children.forEach((child, idx) => {
    const i = idx + 1;
    if (child.name) out[`child${i}_name`] = child.name;
    if (child.address) out[`child${i}_address`] = child.address;
    if (child.ageOrDob) out[`child${i}_age`] = child.ageOrDob;
    out[`child${i}_male`] = child.male;
    out[`child${i}_female`] = child.female;
  });

  const pg1 = doc.parentGuardian1;
  if (pg1.first) out.pg1_first = pg1.first;
  if (pg1.last) out.pg1_last = pg1.last;
  if (pg1.middle) out.pg1_middle = pg1.middle;
  if (pg1.street) out.pg1_street = pg1.street;
  if (pg1.city) out.pg1_city = pg1.city;
  if (pg1.state) out.pg1_state = pg1.state;
  if (pg1.zip) out.pg1_zip = pg1.zip;
  if (pg1.phone) out.pg1_phone = pg1.phone;
  if (pg1.dob) out.pg1_dob = pg1.dob;

  const pg2 = doc.parentGuardian2;
  if (pg2.first) out.pg2_first = pg2.first;
  if (pg2.last) out.pg2_last = pg2.last;
  if (pg2.middle) out.pg2_middle = pg2.middle;
  if (pg2.street) out.pg2_street = pg2.street;
  if (pg2.city) out.pg2_city = pg2.city;
  if (pg2.state) out.pg2_state = pg2.state;
  if (pg2.zip) out.pg2_zip = pg2.zip;
  if (pg2.phone) out.pg2_phone = pg2.phone;
  if (pg2.dob) out.pg2_dob = pg2.dob;

  const rep = doc.reporter;
  out.mandatory = rep.mandatory;
  out.voluntary = rep.voluntary;
  if (rep.first) out.rep_first = rep.first;
  if (rep.last) out.rep_last = rep.last;
  if (rep.middle) out.rep_middle = rep.middle;
  if (rep.institution) out.rep_institution = rep.institution;
  if (rep.street) out.rep_street = rep.street;
  if (rep.city) out.rep_city = rep.city;
  if (rep.state) out.rep_state = rep.state;
  if (rep.zip) out.rep_zip = rep.zip;
  if (rep.phone) out.rep_phone = rep.phone;
  out.caretaker_yes = rep.caretakerYes;
  out.caretaker_no = rep.caretakerNo;

  if (doc.reportDate) out.report_date = doc.reportDate;

  const n = doc.narrative;
  if (n.nature) out.q_nature = n.nature;
  if (n.responsible) out.q_responsible = n.responsible;
  if (n.circumstances) out.q_circumstances = n.circumstances;
  if (n.action) out.q_action = n.action;
  if (n.dv) out.q_dv = n.dv;
  if (n.strengths) out.q_strengths = n.strengths;
  if (n.signature) out.signature = n.signature;

  return out;
}

function expandSiblingsInPayload(
  payload: Record<string, string | boolean>,
  form: Form51A,
): void {
  const sharedAddress = getField(form, "child", "child_addr");
  const siblings = parseSiblingEntries(getField(form, "household", "other_kids"));

  for (let i = 2; i <= MAX_51A_CHILDREN; i++) {
    delete payload[`child${i}_name`];
    delete payload[`child${i}_age`];
    delete payload[`child${i}_address`];
    payload[`child${i}_male`] = false;
    payload[`child${i}_female`] = false;
  }

  siblings.slice(0, MAX_51A_CHILDREN - 1).forEach((sib, idx) => {
    const row = idx + 2;
    payload[`child${row}_name`] = sib.name;
    if (sib.ageOrDob) payload[`child${row}_age`] = sib.ageOrDob;
    if (sharedAddress) payload[`child${row}_address`] = sharedAddress;
  });
}

/** Build the structured 51A document from intake EAV fields + case context. */
export function buildDocumentFromIntake(
  form: Form51A,
  context?: OfficialFormContext,
): Form51ADocument {
  const payload = mapReport51aToOfficialFields(form, context);
  expandSiblingsInPayload(payload, form);
  const doc = officialPayloadToDocument(form.caseId, payload);

  // Preserve narrative edits from any saved document when re-syncing intake-only fields
  return doc;
}

function joinName(parts: string[]): string {
  return parts.filter(Boolean).join(" ").trim();
}

function formatAddress(pg: Form51ADocument["parentGuardian1"]): string {
  const line1 = pg.street.trim();
  const line2 = [pg.city, pg.state].filter(Boolean).join(", ");
  const withZip = [line2, pg.zip].filter(Boolean).join(" ");
  return [line1, withZip].filter(Boolean).join(", ");
}

/** Map saved official form document back to intake EAV field updates. */
export function documentToIntakeUpdates(doc: Form51ADocument): { sectionId: SectionId; fieldId: string; value: string }[] {
  const updates: { sectionId: SectionId; fieldId: string; value: string }[] = [];
  const primary = doc.children[0] ?? emptyChildEntry();

  if (primary.name) updates.push({ sectionId: "child", fieldId: "child_name", value: primary.name });
  if (primary.address) updates.push({ sectionId: "child", fieldId: "child_addr", value: primary.address });
  if (primary.ageOrDob) {
    updates.push({ sectionId: "child", fieldId: "child_age", value: primary.ageOrDob });
    updates.push({ sectionId: "child", fieldId: "child_dob", value: primary.ageOrDob });
  }
  if (primary.female) updates.push({ sectionId: "child", fieldId: "child_gender", value: "Female" });
  else if (primary.male) updates.push({ sectionId: "child", fieldId: "child_gender", value: "Male" });

  const siblings = doc.children.slice(1).filter((c) => c.name.trim());
  const otherKids = siblings
    .map((s) => (s.ageOrDob ? `${s.name}, age ${s.ageOrDob}` : s.name))
    .join("; ");
  updates.push({ sectionId: "household", fieldId: "other_kids", value: otherKids });

  const caregiver = joinName([doc.parentGuardian1.first, doc.parentGuardian1.middle, doc.parentGuardian1.last]);
  if (caregiver) updates.push({ sectionId: "household", fieldId: "caregiver", value: caregiver });

  if (doc.parentGuardian1.phone) {
    updates.push({ sectionId: "household", fieldId: "caregiver_phone", value: doc.parentGuardian1.phone });
  }
  if (doc.parentGuardian1.dob) {
    updates.push({ sectionId: "household", fieldId: "caregiver_dob", value: doc.parentGuardian1.dob });
  }

  const caregiver2 = joinName([doc.parentGuardian2.first, doc.parentGuardian2.middle, doc.parentGuardian2.last]);
  if (caregiver2) updates.push({ sectionId: "household", fieldId: "caregiver2", value: caregiver2 });

  const pg2Addr = formatAddress(doc.parentGuardian2);
  if (pg2Addr) updates.push({ sectionId: "household", fieldId: "caregiver2_addr", value: pg2Addr });
  if (doc.parentGuardian2.phone) {
    updates.push({ sectionId: "household", fieldId: "caregiver2_phone", value: doc.parentGuardian2.phone });
  }
  if (doc.parentGuardian2.dob) {
    updates.push({ sectionId: "household", fieldId: "caregiver2_dob", value: doc.parentGuardian2.dob });
  }

  const pgAddr = formatAddress(doc.parentGuardian1);
  if (pgAddr && !primary.address) {
    updates.push({ sectionId: "child", fieldId: "child_addr", value: pgAddr });
  }

  const rep = doc.reporter;
  const repPerson = joinName([rep.first, rep.middle, rep.last]);
  const repName = rep.institution && repPerson ? `${repPerson} (${rep.institution})` : repPerson || rep.institution;
  if (repName) updates.push({ sectionId: "reporter", fieldId: "rep_name", value: repName });
  if (rep.phone) updates.push({ sectionId: "reporter", fieldId: "rep_phone", value: rep.phone });
  const repAddr = formatAddress({
    street: rep.street,
    city: rep.city,
    state: rep.state,
    zip: rep.zip,
    first: "",
    last: "",
    middle: "",
    phone: "",
    dob: "",
  });
  if (repAddr) updates.push({ sectionId: "reporter", fieldId: "rep_addr", value: repAddr });
  if (rep.caretakerYes) updates.push({ sectionId: "reporter", fieldId: "rep_is_caretaker", value: "yes" });
  else if (rep.caretakerNo) updates.push({ sectionId: "reporter", fieldId: "rep_is_caretaker", value: "no" });
  if (rep.mandatory) updates.push({ sectionId: "reporter", fieldId: "rep_type", value: "Mandated reporter" });
  else if (rep.voluntary) updates.push({ sectionId: "reporter", fieldId: "rep_type", value: "Voluntary reporter" });

  const alleged = doc.narrative.responsible.replace(/^Alleged responsible party:\s*/i, "").trim().split("\n")[0];
  if (alleged) updates.push({ sectionId: "household", fieldId: "alleged", value: alleged });

  const nature = doc.narrative.nature.replace(/^Nature of allegation:\s*/i, "").trim();
  if (nature) {
    const allegationLine = nature.split("\n\n")[0]?.trim();
    if (allegationLine) updates.push({ sectionId: "incident", fieldId: "allegation", value: allegationLine });
    if (nature.includes("\n\n")) {
      updates.push({ sectionId: "incident", fieldId: "description", value: nature.slice(nature.indexOf("\n\n") + 2).trim() });
    }
  }

  const circ = doc.narrative.circumstances.trim();
  if (circ) {
    const dateMatch = circ.match(/^Date\/time of incident:\s*([^\n]+)/i);
    if (dateMatch?.[1]) updates.push({ sectionId: "incident", fieldId: "inc_date", value: dateMatch[1].trim() });
    const locMatch = circ.match(/(?:^|\n)Location:\s*([^\n]+)/i);
    if (locMatch?.[1]) updates.push({ sectionId: "incident", fieldId: "incident_location", value: locMatch[1].trim() });
    const body = circ
      .replace(/^Date\/time of incident:\s*[^\n]+\n*/i, "")
      .replace(/(?:^|\n)Location:\s*[^\n]+\n*/i, "")
      .trim();
    if (body) updates.push({ sectionId: "incident", fieldId: "description", value: body });
  }

  if (doc.narrative.dv) updates.push({ sectionId: "incident", fieldId: "dv_concerns", value: doc.narrative.dv });
  if (doc.narrative.action) {
    updates.push({ sectionId: "filing", fieldId: "action_taken", value: doc.narrative.action });
  }
  if (doc.narrative.strengths) {
    updates.push({ sectionId: "filing", fieldId: "protective_strengths", value: doc.narrative.strengths });
  }

  return updates;
}

export async function syncIntakeToDocument(caseId: string, context?: OfficialFormContext): Promise<Form51ADocument> {
  const form = await formRepo.loadForm51A(caseId);
  const existing = await docRepo.loadDocument(caseId);
  const built = buildDocumentFromIntake(form, context);

  if (existing) {
    built.narrative = {
      ...built.narrative,
      action: existing.narrative.action || built.narrative.action,
      dv: existing.narrative.dv || built.narrative.dv,
      strengths: existing.narrative.strengths || built.narrative.strengths,
      signature: existing.narrative.signature || built.narrative.signature,
    };
    built.reporter = {
      ...built.reporter,
      caretakerYes: existing.reporter.caretakerYes,
      caretakerNo: existing.reporter.caretakerNo,
      street: existing.reporter.street || built.reporter.street,
      city: existing.reporter.city || built.reporter.city,
      state: existing.reporter.state || built.reporter.state,
      zip: existing.reporter.zip || built.reporter.zip,
    };
    for (let i = 0; i < MAX_51A_CHILDREN; i++) {
      const saved = existing.children[i];
      const merged = built.children[i];
      if (saved?.address && !merged.address) merged.address = saved.address;
    }
  }

  await docRepo.saveDocument(built);
  return built;
}

export async function saveOfficialFormFields(
  caseId: string,
  fields: Record<string, string | boolean>,
): Promise<Form51ADocument> {
  const doc = officialPayloadToDocument(caseId, fields);
  await docRepo.saveDocument(doc);
  const updates = documentToIntakeUpdates(doc);
  if (updates.length) await formRepo.updateFields(caseId, updates);
  return doc;
}

export async function getDocumentForOfficialForm(
  caseId: string,
  context?: OfficialFormContext,
): Promise<Form51ADocument> {
  const existing = await docRepo.loadDocument(caseId);
  if (!existing) return syncIntakeToDocument(caseId, context);

  const form = await formRepo.loadForm51A(caseId);
  const intakeName = getField(form, "child", "child_name");
  const docName = existing.children[0]?.name?.trim() ?? "";
  const intakeSiblings = parseSiblingEntries(getField(form, "household", "other_kids"));
  const docSiblings = existing.children.slice(1).filter((c) => c.name.trim());

  if (intakeName && intakeName !== docName) return syncIntakeToDocument(caseId, context);
  if (intakeSiblings.length > docSiblings.length) return syncIntakeToDocument(caseId, context);

  return existing;
}
