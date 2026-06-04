import { C } from "../../theme/tokens";

export type StatItem = {
  label: string;
  val: string;
  sub?: string;
  clr: string;
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
      {items.map((s) => (
        <div key={s.label} className="card hover-lift" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: s.clr, fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
            {s.val}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textDark, marginTop: 4 }}>{s.label}</div>
          {s.sub && <div style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}
