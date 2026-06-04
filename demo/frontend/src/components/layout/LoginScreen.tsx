import { useState } from "react";
import { C } from "../../theme/tokens";
import { APP_TITLE, APP_TITLE_SHORT, INAPP_DEMO_LABEL, INAPP_LOGO_SRC } from "../../constants/branding";
import { ROLES } from "../../constants/nav";
import { RoleLoginForm } from "./RoleLoginForm";
import type { UserRole } from "../../api/types";

function LoginHeader() {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img src={INAPP_LOGO_SRC} alt="InApp" style={{ height: 48, width: "auto", objectFit: "contain" }} />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.inappRed,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {INAPP_DEMO_LABEL}
        </div>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: C.textDark,
          lineHeight: 1.35,
          fontFamily: "'Fraunces', Georgia, serif",
          maxWidth: 520,
          margin: "0 auto 8px",
        }}
      >
        {APP_TITLE}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.teal, marginBottom: 8 }}>{APP_TITLE_SHORT}</div>
      <p style={{ color: C.textLight, fontSize: 12 }}>
        Secure demonstration · Authorized access only
      </p>
    </div>
  );
}

export function LoginScreen({
  onLogin,
}: {
  onLogin: (username: string, password: string, expectedRole?: UserRole) => Promise<void>;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const selected = ROLES.find((r) => r.id === selectedRole);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(165deg, ${C.bg} 0%, #FFFFFF 45%, ${C.tealPale} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
      }}
    >
      <div style={{ width: "100%", maxWidth: selectedRole ? 420 : 920, position: "relative" }}>
        <LoginHeader />

        {selected && selectedRole ? (
          <RoleLoginForm
            role={selectedRole}
            meta={selected}
            onBack={() => setSelectedRole(null)}
            onSubmit={(username, password, expectedRole) => onLogin(username, password, expectedRole)}
          />
        ) : (
          <div className="fade-up">
            <p
              style={{
                color: C.textMid,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 14,
                textAlign: "center",
              }}
            >
              Select your role to sign in
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {ROLES.map((r) => (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRole(r.id)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedRole(r.id)}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                  className="card hover-lift"
                  style={{
                    padding: "20px 18px",
                    cursor: "pointer",
                    borderColor: hover === r.id ? C.teal : C.border,
                    background: hover === r.id ? C.tealPale : C.surface,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.textDark, marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: C.textLight, marginBottom: 12 }}>{r.desc}</div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4, color: r.clr, fontSize: 11, fontWeight: 700 }}
                  >
                    <span>Sign in</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", color: C.textLight, fontSize: 11, marginTop: 24 }}>
          Protected under M.G.L. Chapter 119 · All access is logged and audited
        </p>
      </div>
    </div>
  );
}
