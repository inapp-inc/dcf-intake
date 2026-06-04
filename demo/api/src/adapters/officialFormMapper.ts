import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Form51A } from "../domain/form51a/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MappingFrom {
  section?: string;
  fieldId?: string;
}

interface MappingEntry {
  from?: MappingFrom | string;
  fieldId?: string;
  to: string | string[] | Record<string, string>;
  transform: string;
  prefix?: string;
  separator?: string;
  patterns?: Record<string, string[]>;
  alsoMap?: MappingEntry[];
  format?: string;
}

interface FieldMapFile {
  mappings: MappingEntry[];
}

export interface OfficialFormContext {
  externalId?: string;
  riskScore?: number | null;
  riskFactors?: string[];
}

let cachedMap: FieldMapFile | null = null;

function loadMap(): FieldMapFile {
  if (!cachedMap) {
    const path = join(__dirname, "../../schemas/51a-official-field-map.json");
    cachedMap = JSON.parse(readFileSync(path, "utf8")) as FieldMapFile;
  }
  return cachedMap;
}

function getField(form: Form51A, section: string, fieldId: string): string {
  const sec = form.sections[section as keyof Form51A["sections"]];
  return sec?.fields[fieldId]?.value?.trim() ?? "";
}

function splitPersonName(value: string): { first: string; last: string; middle: string } {
  const parts = value.replace(/\([^)]*\)/g, "").trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "", middle: "" };
  if (parts.length === 1) return { first: parts[0], last: "", middle: "" };
  return { first: parts[0], last: parts[parts.length - 1], middle: parts.slice(1, -1).join(" ") };
}

function splitUsAddress(value: string): { street: string; city: string; state: string; zip: string } {
  const v = value.replace(/\n/g, ", ").trim();
  if (!v) return { street: "", city: "", state: "", zip: "" };

  const zipMatch = v.match(/,\s*([A-Z]{2})?\s*(\d{5}(?:-\d{4})?)\s*$/i);
  let zip = "";
  let state = "";
  let rest = v;
  if (zipMatch) {
    zip = zipMatch[2] ?? "";
    state = (zipMatch[1] ?? "").toUpperCase();
    rest = v.slice(0, zipMatch.index ?? 0).replace(/,\s*$/, "");
  }

  const parts = rest.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const maybeState = parts[parts.length - 1];
    if (!state && /^[A-Z]{2}$/.test(maybeState)) {
      state = maybeState;
      return { street: parts.slice(0, -2).join(", "), city: parts[parts.length - 2], state, zip };
    }
    return { street: parts.slice(0, -2).join(", "), city: parts[parts.length - 2], state: parts[parts.length - 1], zip };
  }
  if (parts.length === 2) return { street: parts[0], city: parts[1], state, zip };
  return { street: v, city: "", state, zip };
}

function extractAgeFromText(value: string): string {
  const ageMatch = value.match(/\b(?:age\s*)?(\d{1,2})\s*(?:yo|y\.?o\.?|years?\s*old)?\b/i);
  if (ageMatch) return ageMatch[1];
  const yearsMatch = value.match(/\b(\d{1,2})\s*-?\s*year/i);
  return yearsMatch?.[1] ?? "";
}

function mappingSource(entry: MappingEntry): { section: string; fieldId: string } | null {
  if (typeof entry.from === "string") return null;
  if (!entry.from?.section || !entry.from.fieldId) return null;
  return { section: entry.from.section, fieldId: entry.from.fieldId };
}

function applyMapping(
  entry: MappingEntry,
  form: Form51A,
  out: Record<string, string | boolean>,
  appendText: (key: string, piece: string, separator?: string) => void,
): void {
  const transform = entry.transform;
  const to = entry.to;

  if (transform === "systemNow") {
    const now = new Date();
    out[entry.to as string] =
      entry.format === "MM/DD/YYYY"
        ? `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`
        : now.toISOString();
    return;
  }

  const src = mappingSource(entry);
  if (!src) return;

  const value = getField(form, src.section, src.fieldId);

  switch (transform) {
    case "direct":
    case "directOptional":
    case "preferIfPresent":
      if (value) out[to as string] = value;
      break;
    case "composePrefix":
      if (value) appendText(to as string, `${entry.prefix ?? ""}${value}`);
      break;
    case "composeAppend":
      if (value) {
        const piece = entry.prefix ? `${entry.prefix}${value}` : value;
        appendText(to as string, piece, entry.separator);
      }
      break;
    case "genderCheckboxes": {
      const keys = to as string[];
      const norm = value.trim().toLowerCase();
      for (const k of keys) out[k] = false;
      const isFemale = norm === "f" || norm === "female" || /\bfemale\b/.test(norm);
      const isMale =
        !isFemale && (norm === "m" || norm === "male" || (/\bmale\b/.test(norm) && !/\bfemale\b/.test(norm)));
      if (isFemale) out.child1_female = true;
      else if (isMale) out.child1_male = true;
      break;
    }
    case "reporterTypeCheckboxes": {
      const keys = to as string[];
      const lower = value.toLowerCase();
      for (const k of keys) out[k] = false;
      const patterns = entry.patterns ?? {};
      if (patterns.mandatory?.some((p) => lower.includes(p))) out.mandatory = true;
      if (patterns.voluntary?.some((p) => lower.includes(p))) out.voluntary = true;
      break;
    }
    case "splitPersonName": {
      const names = splitPersonName(value);
      const target = to as Record<string, string>;
      if (names.first) out[target.pg1_first] = names.first;
      if (names.last) out[target.pg1_last] = names.last;
      if (names.middle) out[target.pg1_middle] = names.middle;
      break;
    }
    case "splitPersonNameOptional": {
      if (!value) break;
      const names = splitPersonName(value);
      const target = to as Record<string, string>;
      if (names.first) out[target.pg2_first] = names.first;
      if (names.last) out[target.pg2_last] = names.last;
      if (names.middle) out[target.pg2_middle] = names.middle;
      break;
    }
    case "splitReporterNameOrConfidential": {
      if (value.startsWith("[")) break;
      const instMatch = value.match(/\(([^)]+)\)/);
      if (instMatch) out.rep_institution = instMatch[1];
      const names = splitPersonName(value);
      const target = to as Record<string, string>;
      if (names.first) out[target.rep_first] = names.first;
      if (names.last) out[target.rep_last] = names.last;
      if (names.middle) out[target.rep_middle] = names.middle;
      break;
    }
    case "splitUsAddress":
    case "splitUsAddressOptional": {
      if (!value) break;
      const addr = splitUsAddress(value);
      const target = to as Record<string, string>;
      for (const [htmlKey, part] of Object.entries(target)) {
        const piece = addr[part as keyof typeof addr];
        if (piece) out[htmlKey] = piece;
      }
      break;
    }
    case "relationshipToInstitution": {
      if (!value) break;
      const existing = typeof out.rep_institution === "string" ? out.rep_institution : "";
      out.rep_institution = existing ? `${existing} — ${value}` : value;
      break;
    }
    case "caretakerCheckboxes": {
      const keys = to as string[];
      for (const k of keys) out[k] = false;
      const lower = value.toLowerCase();
      if (!lower) break;
      if (/\b(no|not|false|isn't|is not|doesn't|does not)\b/.test(lower)) {
        out.caretaker_no = true;
      } else if (/\b(yes|true|caretaker|caregiver|parent|guardian|lives with|resides with)\b/.test(lower)) {
        out.caretaker_yes = true;
      }
      break;
    }
    case "extractAgeFromText": {
      const age = extractAgeFromText(value);
      if (age) out[to as string] = age;
      break;
    }
    default:
      break;
  }

  for (const sub of entry.alsoMap ?? []) {
    applyMapping(sub, form, out, appendText);
  }
}

export function mapReport51aToOfficialFields(
  form: Form51A,
  context?: OfficialFormContext,
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const map = loadMap();

  const appendText = (key: string, piece: string, separator = "\n\n") => {
    if (!piece) return;
    const prev = typeof out[key] === "string" ? (out[key] as string) : "";
    out[key] = prev ? `${prev}${separator}${piece}` : piece;
  };

  for (const entry of map.mappings) {
    if (entry.transform === "areaOfficeFromCase") continue;
    applyMapping(entry, form, out, appendText);
  }

  const caregiver2 = getField(form, "household", "caregiver2");
  const cg2Addr = getField(form, "household", "caregiver2_addr");
  if (caregiver2 && !cg2Addr && !out.pg2_street) {
    const childAddr = getField(form, "child", "child_addr");
    if (childAddr) {
      const addr = splitUsAddress(childAddr);
      if (addr.street) out.pg2_street = addr.street;
      if (addr.city) out.pg2_city = addr.city;
      if (addr.state) out.pg2_state = addr.state;
      if (addr.zip) out.pg2_zip = addr.zip;
    }
  }

  const school = getField(form, "child", "child_school");
  if (school) appendText("q_strengths", `School / daycare: ${school}`);

  const actionParts: string[] = [];
  if (context?.externalId) actionParts.push(`Case reference: ${context.externalId}`);
  if (context?.riskScore != null) actionParts.push(`Advisory risk score: ${context.riskScore}/20`);
  if (actionParts.length) appendText("q_action", actionParts.join("\n"));

  if (context?.riskFactors?.length) {
    appendText("q_strengths", `Protective / risk context:\n${context.riskFactors.join("; ")}`);
  }

  return out;
}
