/** Canonical 51A field definitions — intake capture aligned with official 51A template. */

export type SectionId = "child" | "incident" | "reporter" | "household" | "filing";

export interface FieldDef {
  id: string;
  label: string;
  required: boolean;
  multiline?: boolean;
}

export interface SectionDef {
  title: string;
  icon: string;
  fields: FieldDef[];
}

export const FORM_CATALOG: Record<SectionId, SectionDef> = {
  child: {
    title: "Child Information",
    icon: "👶",
    fields: [
      { id: "child_name", label: "Child's Full Name", required: true },
      { id: "child_dob", label: "Date of Birth", required: true },
      { id: "child_age", label: "Approximate Age", required: true },
      { id: "child_gender", label: "Gender", required: true },
      { id: "child_addr", label: "Home Address", required: true },
      { id: "child_school", label: "School / Daycare", required: false },
    ],
  },
  incident: {
    title: "Incident Details",
    icon: "🔍",
    fields: [
      { id: "allegation", label: "Nature of Allegation", required: true },
      { id: "inc_date", label: "Date of Most Recent Incident", required: true },
      { id: "incident_location", label: "Incident Location", required: false },
      { id: "description", label: "Incident Description", required: true, multiline: true },
      { id: "dv_concerns", label: "Domestic Violence / Safety Concerns", required: false, multiline: true },
    ],
  },
  reporter: {
    title: "Reporter Information",
    icon: "📞",
    fields: [
      { id: "rep_type", label: "Reporter Type (mandated / voluntary)", required: true },
      { id: "rep_name", label: "Reporter Name (if disclosed)", required: false },
      { id: "rep_phone", label: "Callback Number", required: false },
      { id: "rep_addr", label: "Reporter Address", required: false },
      { id: "rep_relationship", label: "Relationship to Child", required: false },
      { id: "rep_is_caretaker", label: "Reporter Is Caretaker? (yes / no)", required: false },
    ],
  },
  household: {
    title: "Household Members",
    icon: "👨‍👩‍👧",
    fields: [
      { id: "caregiver", label: "Primary Caregiver", required: true },
      { id: "caregiver_phone", label: "Primary Caregiver Phone", required: false },
      { id: "caregiver_dob", label: "Primary Caregiver DOB / Age", required: false },
      { id: "alleged", label: "Alleged Responsible Party", required: true },
      { id: "other_kids", label: "Other Children in Household", required: false },
      { id: "caregiver2", label: "Second Caregiver / Absent Parent", required: false },
      { id: "caregiver2_addr", label: "Second Caregiver Address", required: false },
      { id: "caregiver2_phone", label: "Second Caregiver Phone", required: false },
      { id: "caregiver2_dob", label: "Second Caregiver DOB / Age", required: false },
    ],
  },
  filing: {
    title: "51A Filing Details",
    icon: "📋",
    fields: [
      { id: "action_taken", label: "Action Already Taken", required: false, multiline: true },
      { id: "protective_strengths", label: "Protective Factors / Strengths", required: false, multiline: true },
    ],
  },
};

export const SECTION_IDS = Object.keys(FORM_CATALOG) as SectionId[];
