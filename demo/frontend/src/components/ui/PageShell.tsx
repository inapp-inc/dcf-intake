import type { CSSProperties, ReactNode } from "react";

export function PageShell({
  children,
  className = "fade-up",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 16, ...style }}>
      {children}
    </div>
  );
}
