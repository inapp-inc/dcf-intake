import { C } from "../../theme/tokens";
import { AiBadge } from "../atoms";
import type { Form51ASection, SectionId } from "../../api/types";

export function FormSection({
  sectionId: _sectionId,
  section,
  expanded,
  onToggle,
  onFieldChange,
  onConfirmSection,
  pendingAi,
  readOnly = false,
}: {
  sectionId: SectionId;
  section: Form51ASection;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldId: string, value: string) => void;
  onConfirmSection: () => void;
  pendingAi: number;
  readOnly?: boolean;
}) {
  const fields = Object.entries(section.fields);
  const missing = fields.filter(([, f]) => f.missing && !f.value.trim()).length;
  const filled = fields.filter(([, f]) => f.value.trim()).length;

  return (
    <div className="card" style={{ overflow: "hidden", flexShrink: 0 }}>
      <div
        style={{
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          background: expanded ? C.white : "#FDFEFF",
        }}
        onClick={onToggle}
      >
        <span style={{ fontSize: 16 }}>{section.icon}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.textDark }}>{section.title}</span>
        {filled > 0 && (
          <span style={{ fontSize: 10, color: C.textLight }}>
            {filled}/{fields.length} filled
          </span>
        )}
        {missing > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: C.amber,
              background: C.amberPale,
              padding: "2px 8px",
              borderRadius: 99,
            }}
          >
            {missing} missing
          </span>
        )}
        {pendingAi > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: C.teal,
              background: C.tealPale,
              padding: "2px 8px",
              borderRadius: 99,
            }}
          >
            {pendingAi} to confirm
          </span>
        )}
        <span style={{ color: C.textLight, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="fade-up" style={{ padding: "0 16px 16px" }}>
          {!readOnly && pendingAi > 0 && (
            <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="app-btn"
                style={{ background: C.teal, color: "#fff", fontSize: 12 }}
                onClick={onConfirmSection}
              >
                Confirm all AI fields in section
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            {fields.map(([fieldId, f]) => {
              const isAi = f.source === "ai" && !f.confirmedByHuman;
              const isMiss = f.missing && !f.value.trim();
              const placeholder =
                isMiss && f.required
                  ? "Required — not captured from call"
                  : isMiss
                    ? "Optional — not captured"
                    : undefined;
              return (
                <div key={fieldId} style={{ gridColumn: f.multiline ? "1 / -1" : "auto" }} id={`field-${fieldId}`}>
                  <label className="field-label">
                    {f.label}
                    {f.required && <span style={{ color: C.coral, marginLeft: 2 }}>*</span>}
                    {isAi && <AiBadge />}
                  </label>
                  {f.multiline ? (
                    <textarea
                      className={`app-input dcf-ta${isAi ? " ai" : ""}${isMiss ? " miss" : ""}`}
                      value={f.value}
                      placeholder={placeholder}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onFieldChange(fieldId, e.target.value)}
                    />
                  ) : (
                    <input
                      className={`app-input${isAi ? " ai" : ""}${isMiss ? " miss" : ""}`}
                      value={f.value}
                      placeholder={placeholder}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(e) => onFieldChange(fieldId, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
