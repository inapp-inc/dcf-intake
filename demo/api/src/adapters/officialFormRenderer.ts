import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setInputValue(html: string, name: string, value: string): string {
  const safeName = escapeRegExp(name);
  const escaped = escapeHtml(value);

  const valuedTextRe = new RegExp(
    `(<input\\s+type="text"\\s+[^>]*name="${safeName}"[^>]*\\svalue=")[^"]*(")`, 
    "i",
  );
  if (valuedTextRe.test(html)) {
    return html.replace(valuedTextRe, `$1${escaped}$2`);
  }

  const textRe = new RegExp(`(<input\\s+type="text"\\s+[^>]*name="${safeName}"[^>]*)(>)`, "i");
  return html.replace(textRe, `$1 value="${escaped}"$2`);
}

function setCheckbox(html: string, name: string, checked: boolean): string {
  if (!checked) return html;
  const safeName = escapeRegExp(name);
  const checkboxRe = new RegExp(`(<input\\s+type="checkbox"\\s+name="${safeName}"[^>]*)(>)`, "i");
  return html.replace(checkboxRe, (match, prefix: string, end: string) =>
    /\schecked(?:="checked")?/i.test(prefix) ? match : `${prefix} checked${end}`,
  );
}

function setTextarea(html: string, name: string, value: string): string {
  const safeName = escapeRegExp(name);
  const escaped = escapeHtml(value);
  const textareaRe = new RegExp(
    `(<textarea\\s+[^>]*name="${safeName}"[^>]*>)([\\s\\S]*?)(</textarea>)`,
    "i",
  );
  return html.replace(textareaRe, `$1${escaped}$3`);
}

/** Apply mapped intake values directly into template HTML (no inline scripts). */
export function applyPayloadToTemplate(
  html: string,
  payload: Record<string, string | boolean>,
): string {
  let out = html;

  for (const [name, val] of Object.entries(payload)) {
    if (typeof val === "boolean") {
      out = setCheckbox(out, name, val);
      continue;
    }
    if (!val) continue;

    const textareaRe = new RegExp(`<textarea\\s+[^>]*name="${escapeRegExp(name)}"`, "i");
    if (textareaRe.test(out)) {
      out = setTextarea(out, name, val);
    } else {
      out = setInputValue(out, name, val);
    }
  }

  return out;
}

export function officialFormScriptSrc(): string {
  const base = (process.env.APP_BASE_PATH ?? "/intake").replace(/\/$/, "");
  return `${base}/api/v1/static/initial-report-form.js`;
}

export function officialFormSaveUrl(caseId: string): string {
  const base = (process.env.APP_BASE_PATH ?? "/intake").replace(/\/$/, "");
  return `${base}/api/v1/cases/${caseId}/form51a/official/save`;
}

export function renderOfficial51AHtml(
  fillPayload: Record<string, string | boolean>,
  options?: { draft?: boolean; caseLabel?: string; caseId?: string; saveUrl?: string },
): string {
  const templatePath = join(__dirname, "../../templates/initial-report-form.html");
  let html = readFileSync(templatePath, "utf8");
  html = applyPayloadToTemplate(html, fillPayload);

  const caseLine = options?.caseLabel
    ? `<div class="form-banner form-banner-case">Case ${escapeHtml(options.caseLabel)} — auto-filled from saved intake fields</div>`
    : "";
  const draftBanner = options?.draft
    ? `<div class="form-banner form-banner-draft">DRAFT — Not for official filing until checkpoint complete</div>`
    : "";

  const fillJson = JSON.stringify(fillPayload).replace(/</g, "\\u003c");
  const metaJson = JSON.stringify({
    caseId: options?.caseId ?? "",
    saveUrl: options?.saveUrl ?? "",
  }).replace(/</g, "\\u003c");
  const headInject = `
${caseLine}
${draftBanner}
<script type="application/json" id="fill-data">${fillJson}</script>
<script type="application/json" id="form-meta">${metaJson}</script>
`;

  const scriptSrc = officialFormScriptSrc();
  const footInject = `<script src="${scriptSrc}"></script>`;

  html = html.replace(/<body>/i, `<body>\n${headInject}`);
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${footInject}\n</body>`);
  } else {
    html += footInject;
  }
  return html;
}
