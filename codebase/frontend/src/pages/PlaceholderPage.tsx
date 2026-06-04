import { C } from "../theme/tokens";

export function PlaceholderPage({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="card fade-up" style={{ padding: 40, textAlign: "center", color: C.textLight }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{title}</div>
      <div style={{ fontSize: 12, marginTop: 8, maxWidth: 480, margin: "8px auto 0" }}>{description}</div>
      <p style={{ fontSize: 11, marginTop: 16 }}>Full workflow in SEED-004.</p>
    </div>
  );
}
