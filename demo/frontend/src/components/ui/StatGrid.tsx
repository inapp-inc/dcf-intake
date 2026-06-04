import { C } from "../../theme/tokens";

export type StatItem = {
  label: string;
  val: string;
  sub?: string;
  clr: string;
  onClick?: () => void;
};

export function StatGrid({ items, columns }: { items: StatItem[]; columns?: number }) {
  const cols = columns ?? items.length;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
      }}
    >
      {items.map((s) => {
        const clickable = Boolean(s.onClick);
        return (
          <div
            key={s.label}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            className={`card hover-lift${clickable ? " stat-card-clickable" : ""}`}
            style={{
              padding: "15px 16px",
              cursor: clickable ? "pointer" : undefined,
            }}
            onClick={s.onClick}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      s.onClick?.();
                    }
                  }
                : undefined
            }
            title={clickable ? `View ${s.label}` : undefined}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: s.clr, fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
              {s.val}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textDark, marginTop: 4 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{s.sub}</div>}
            {clickable && (
              <div style={{ fontSize: 10, color: C.teal, marginTop: 6, fontWeight: 600 }}>View details →</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
