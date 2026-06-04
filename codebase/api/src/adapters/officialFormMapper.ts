import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Form51A } from "../domain/form51a/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface MappingEntry {
  from?: { section?: string; fieldId?: string };
  to: string | string[] | Record<string, string>;
  transform: string;
  prefix?: string;
  separator?: string;
  patterns?: Record<string, string[]>;
  values?: Record<string, Record<string, boolean>>;
  format?: string;
}

interface FieldMapFile {
  mappings: MappingEntry[];
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

export function mapReport51aToOfficialFields(form: Form51A): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const map = loadMap();

  const appendText = (key: string, piece: string, separator = "\n\n") => {
    if (!piece) return;
    const prev = typeof out[key] === "string" ? (out[key] as string) : "";
    out[key] = prev ? `${prev}${separator}${piece}` : piece;
  };

  for (const entry of map.mappings) {
    const transform = entry.transform;
    if (transform === "systemNow") {
      const now = new Date();
      out[entry.to as string] =
        entry.format === "MM/DD/YYYY"
          ? `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`
          : now.toISOString();
      continue;
    }
    if (!entry.from?.section || !entry.from.fieldId) continue;

    const value = getField(form, entry.from.section, entry.from.fieldId);
    const to = entry.to;

    switch (transform) {
      case "direct":
      case "directOptional":
        if (value) out[to as string] = value;
        break;
      case "composePrefix":
        if (value) appendText(to as string, `${entry.prefix ?? ""}${value}`);
        break;
      case "composeAppend":
        if (value) appendText(to as string, value, entry.separator);
        break;
      case "genderCheckboxes": {
        const keys = to as string[];
        const norm = value.toLowerCase();
        for (const k of keys) out[k] = false;
        if (norm.includes("female") || norm === "f") out.child1_female = true;
        if (norm.includes("male") || norm === "m") out.child1_male = true;
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
      case "splitReporterNameOrConfidential": {
        if (value.startsWith("[")) break;
        const names = splitPersonName(value);
        const target = to as Record<string, string>;
        if (names.first) out[target.rep_first] = names.first;
        if (names.last) out[target.rep_last] = names.last;
        break;
      }
      default:
        break;
    }
  }

  return out;
}
