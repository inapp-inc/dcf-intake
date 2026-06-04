import { C } from "../../theme/tokens";
import { Chip } from "../atoms";
import type { BackgroundSource } from "../../api/types";

export function BgChecks({ sources }: { sources: BackgroundSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="card fade-up" style={{ padding: "14px 18px" }}>
      <div className="sec-title">🔎 Background Checks</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {sources.map((c) => (
          <div
            key={c.name}
            style={{ padding: "9px 11px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.textLight,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {c.name}
            </div>
            {c.status === "complete" ? (
              c.recordFound ? (
                <Chip color={C.amber} bg={C.amberPale} size="xs">
                  ⚠ Record Found
                </Chip>
              ) : (
                <Chip color={C.green} bg={C.greenPale} size="xs">
                  ✓ No Record
                </Chip>
              )
            ) : c.status === "running" ? (
              <span className="chip pulsing" style={{ color: C.teal, background: C.tealPale, fontSize: 10 }}>
                Running…
              </span>
            ) : (
              <Chip color={C.textLight} bg={C.bg} size="xs">
                {c.status}
              </Chip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
