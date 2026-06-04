import { C } from "../../theme/tokens";

export function LoadingSpinner({
  size = 32,
  color = C.teal,
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const border = Math.max(2, Math.round(size / 10));
  return (
    <span
      className={`loading-spinner ${className}`.trim()}
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        border: `${border}px solid ${C.border}`,
        borderTopColor: color,
        borderRadius: "50%",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export function LoadingBlock({
  message = "Loading…",
  hint,
  minHeight = 160,
}: {
  message?: string;
  hint?: string;
  minHeight?: number;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "28px 20px",
        minHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
      }}
    >
      <LoadingSpinner size={36} />
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{message}</div>
      {hint && (
        <div style={{ fontSize: 11, color: C.textLight, maxWidth: 360, lineHeight: 1.5 }}>{hint}</div>
      )}
    </div>
  );
}

export function PageLoading({ message = "Loading…" }: { message?: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: "#EEF1F8",
      }}
    >
      <LoadingSpinner size={40} />
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{message}</div>
      <div style={{ fontSize: 11, color: C.textLight, maxWidth: 320, textAlign: "center", lineHeight: 1.5 }}>
        Demo runs AI in Docker on the VM — first requests can take several minutes.
      </div>
    </div>
  );
}
