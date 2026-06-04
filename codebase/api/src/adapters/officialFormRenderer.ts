import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function renderOfficial51AHtml(
  fillPayload: Record<string, string | boolean>,
  options?: { draft?: boolean },
): string {
  const templatePath = join(__dirname, "../../templates/51A-Report-Form.html");
  let html = readFileSync(templatePath, "utf8");
  const json = JSON.stringify(fillPayload).replace(/</g, "\\u003c");
  const draftBanner = options?.draft
    ? `<div style="background:#FEF3C7;color:#92400E;padding:8px 16px;text-align:center;font-weight:600;">DRAFT — Not for official filing until checkpoint complete</div>`
    : "";

  const inject = `
${draftBanner}
<script>
  document.addEventListener('DOMContentLoaded', function() {
    if (window.fill51A) window.fill51A(${json});
  });
</script>
`;
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${inject}</body>`);
  } else {
    html += inject;
  }
  return html;
}
