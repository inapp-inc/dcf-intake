/** Canonical 51A field definitions — aligned with mockup/DCF_AIT_UI.jsx FORM_FIELDS */

export type SectionId = "child" | "incident" | "reporter" | "household";

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
      { id: "description", label: "Incident Description", required: true, multiline: true },
    ],
  },
  reporter: {
    title: "Reporter Information",
    icon: "📞",
    fields: [
      { id: "rep_type", label: "Reporter Type", required: true },
      { id: "rep_name", label: "Reporter Name (if disclosed)", required: false },
      { id: "rep_phone", label: "Callback Number", required: false },
    ],
  },
  household: {
    title: "Household Members",
    icon: "👨‍👩‍👧",
    fields: [
      { id: "caregiver", label: "Primary Caregiver", required: true },
      { id: "alleged", label: "Alleged Responsible Party", required: true },
      { id: "other_kids", label: "Other Children in Household", required: false },
      { id: "caregiver2", label: "Second Caregiver / Absent Parent", required: false },
    ],
  },
};

export const SECTION_IDS = Object.keys(FORM_CATALOG) as SectionId[];
