import { useState } from "react";
import { C } from "../../theme/tokens";
import { ROLES } from "../../constants/nav";
import type { UserRole } from "../../api/types";

export function LoginScreen({ onSelect }: { onSelect: (role: UserRole) => void }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(150deg,${C.navyDeep} 0%,${C.navy} 55%,#1A4580 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          opacity: 0.035,
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          pointerEvents: "none",
        }}
      />
      <div style={{ maxWidth: 500, width: "100%", position: "relative" }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                background: C.teal,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
              }}
            >
              🛡
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.tealBright,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Massachusetts DCF
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1,
                  fontFamily: "'Fraunces', serif",
                }}
              >
                Automated Intake Tool
              </div>
            </div>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            Secure Government System · Authorized Access Only · AIT v2.0
          </p>
        </div>

        <p
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          Select your role to continue
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {ROLES.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(r.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelect(r.id)}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                background: hover === r.id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${hover === r.id ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 14,
                padding: "20px 18px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{r.label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>{r.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: r.clr, fontSize: 11, fontWeight: 700 }}>
                <span>Sign in</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 20 }}>
          Protected under M.G.L. Chapter 119 · All access is logged and audited
        </p>
      </div>
    </div>
  );
}
