import { C } from "../../theme/tokens";
import { AiBadge, Chip } from "../atoms";
import type { Form51ASection, SectionId } from "../../api/types";

export function FormSection({
  sectionId: _sectionId,
  section,
  expanded,
  onToggle,
  onFieldChange,
  onConfirmSection,
  pendingAi,
}: {
  sectionId: SectionId;
  section: Form51ASection;
  expanded: boolean;
  onToggle: () => void;
  onFieldChange: (fieldId: string, value: string) => void;
  onConfirmSection: () => void;
  pendingAi: number;
}) {
  const fields = Object.entries(section.fields);
  const missing = fields.filter(([, f]) => f.missing && !f.value.trim()).length;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
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
        {missing > 0 && (
          <Chip color={C.amber} bg={C.amberPale}>
            {missing} missing
          </Chip>
        )}
        {pendingAi > 0 && (
          <Chip color={C.teal} bg={C.tealPale}>
            {pendingAi} AI to confirm
          </Chip>
        )}
        <span style={{ color: C.textLight, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div className="fade-up" style={{ padding: "0 16px 16px" }}>
          {pendingAi > 0 && (
            <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" className="dcf-btn" style={{ background: C.teal, color: "#fff", fontSize: 12 }} onClick={onConfirmSection}>
                Confirm all AI fields in section
              </button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            {fields.map(([fieldId, f]) => {
              const isAi = f.source === "ai" && !f.confirmedByHuman;
              const isMiss = f.missing && !f.value.trim();
              return (
                <div key={fieldId} style={{ gridColumn: f.multiline ? "1 / -1" : "auto" }} id={`field-${fieldId}`}>
                  <label className="field-label">
                    {f.label}
                    {f.required && <span style={{ color: C.coral, marginLeft: 2 }}>*</span>}
                    {f.source === "ai" && <AiBadge />}
                  </label>
                  {f.multiline ? (
                    <textarea
                      className={`dcf-input dcf-ta${isAi ? " ai" : ""}${isMiss ? " miss" : ""}`}
                      value={f.value}
                      onChange={(e) => onFieldChange(fieldId, e.target.value)}
                    />
                  ) : (
                    <input
                      className={`dcf-input${isAi ? " ai" : ""}${isMiss ? " miss" : ""}`}
                      value={f.value}
                      placeholder={isMiss ? "⚠ Required — not captured from call" : ""}
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
