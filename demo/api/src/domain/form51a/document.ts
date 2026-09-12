/** Canonical data model for the agency Initial Report form. */

export interface Form51AChildEntry {
  name: string;
  address: string;
  male: boolean;
  female: boolean;
  ageOrDob: string;
}

export interface Form51AParentGuardian {
  first: string;
  last: string;
  middle: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  dob: string;
}

export interface Form51AReporter {
  mandatory: boolean;
  voluntary: boolean;
  first: string;
  last: string;
  middle: string;
  institution: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  caretakerYes: boolean;
  caretakerNo: boolean;
}

export interface Form51ANarrative {
  nature: string;
  responsible: string;
  circumstances: string;
  action: string;
  dv: string;
  strengths: string;
  signature: string;
}

export interface Form51ADocument {
  caseId: string;
  reportDate: string;
  children: Form51AChildEntry[];
  parentGuardian1: Form51AParentGuardian;
  parentGuardian2: Form51AParentGuardian;
  reporter: Form51AReporter;
  narrative: Form51ANarrative;
  updatedAt?: string;
}

export const MAX_51A_CHILDREN = 5;

export function emptyParentGuardian(): Form51AParentGuardian {
  return { first: "", last: "", middle: "", street: "", city: "", state: "", zip: "", phone: "", dob: "" };
}

export function emptyReporter(): Form51AReporter {
  return {
    mandatory: false,
    voluntary: false,
    first: "",
    last: "",
    middle: "",
    institution: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    caretakerYes: false,
    caretakerNo: false,
  };
}

export function emptyChildEntry(): Form51AChildEntry {
  return { name: "", address: "", male: false, female: false, ageOrDob: "" };
}

export function emptyNarrative(): Form51ANarrative {
  return { nature: "", responsible: "", circumstances: "", action: "", dv: "", strengths: "", signature: "" };
}

export function createEmptyDocument(caseId: string): Form51ADocument {
  return {
    caseId,
    reportDate: "",
    children: Array.from({ length: MAX_51A_CHILDREN }, () => emptyChildEntry()),
    parentGuardian1: emptyParentGuardian(),
    parentGuardian2: emptyParentGuardian(),
    reporter: emptyReporter(),
    narrative: emptyNarrative(),
  };
}
