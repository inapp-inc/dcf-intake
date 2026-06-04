import { C } from "../../theme/tokens";

export function EmptyStateCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{title}</div>
      <div style={{ fontSize: 12, marginTop: 4, maxWidth: 480, margin: "4px auto 0" }}>{description}</div>
    </div>
  );
}
