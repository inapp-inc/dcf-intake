import { useState, type ReactNode } from "react";
import { C } from "../../theme/tokens";

export function IntakeCollapsibleSection({
  title,
  subtitle,
  icon,
  badge,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultExpanded);
  const open = controlledExpanded ?? internalOpen;
  const toggle = onToggle ?? (() => setInternalOpen((v) => !v));

  return (
    <div className="card" style={{ overflow: "hidden", flexShrink: 0 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: "100%",
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          background: open ? C.white : "#FDFEFF",
          border: 0,
          textAlign: "left",
        }}
      >
        {icon && <span style={{ fontSize: 16 }} aria-hidden>{icon}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.textDark }}>{title}</span>
          {subtitle && (
            <span style={{ display: "block", fontSize: 11, color: C.textLight, marginTop: 2 }}>{subtitle}</span>
          )}
        </span>
        {badge}
        <span style={{ color: C.textLight, fontSize: 12, flexShrink: 0 }} aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

export function IntakePlaceholder({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12,
        color: C.textLight,
        margin: 0,
        padding: "10px 12px",
        borderRadius: 8,
        background: C.bg,
        border: `1px dashed ${C.border}`,
        lineHeight: 1.5,
      }}
    >
      {children}
    </p>
  );
}
