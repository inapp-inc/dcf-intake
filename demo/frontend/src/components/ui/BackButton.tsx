import { C } from "../../theme/tokens";

export function BackButton({ onClick, label = "← Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        fontSize: 12,
        color: C.textMid,
      }}
    >
      {label}
    </button>
  );
}
