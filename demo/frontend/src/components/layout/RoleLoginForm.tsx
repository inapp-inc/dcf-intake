import { useState, type FormEvent } from "react";
import { C } from "../../theme/tokens";
import { DEMO_CREDENTIALS } from "../../constants/demoUsers";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import type { UserRole } from "../../api/types";

type RoleMeta = {
  id: UserRole;
  label: string;
  desc: string;
  icon: string;
  clr: string;
};

export function RoleLoginForm({
  role,
  meta,
  onBack,
  onSubmit,
}: {
  role: UserRole;
  meta: RoleMeta;
  onBack: () => void;
  onSubmit: (username: string, password: string, expectedRole: UserRole) => Promise<void>;
}) {
  const creds = DEMO_CREDENTIALS[role];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fillDemo = () => {
    setUsername(creds.username);
    setPassword(creds.password);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit(username.trim(), password, role);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "ROLE_MISMATCH"
          ? `These credentials are not authorized for ${meta.label}. Use the demo account shown below.`
          : "Invalid username or password. Use the demo credentials below or contact your administrator.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 420, width: "100%" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: C.textLight,
          fontSize: 12,
          cursor: "pointer",
          marginBottom: 16,
          padding: 0,
        }}
      >
        ← All roles
      </button>

      <div
        className="card"
        style={{
          borderRadius: 16,
          padding: "28px 26px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <span style={{ fontSize: 32 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, fontFamily: "'Fraunces', serif" }}>
              {meta.label} Sign In
            </div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{meta.desc}</div>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={fillDemo}
          onKeyDown={(e) => e.key === "Enter" && fillDemo()}
          style={{
            background: `${meta.clr}18`,
            border: `1px dashed ${meta.clr}88`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          title="Click to fill the form"
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: meta.clr,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Demo credentials · click to fill
          </div>
          <div style={{ fontSize: 13, color: C.textDark, fontFamily: "ui-monospace, monospace", lineHeight: 1.6 }}>
            <div>
              <span style={{ color: C.textLight }}>Username </span>
              {creds.username}
            </div>
            <div>
              <span style={{ color: C.textLight }}>Password </span>
              {creds.password}
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 6 }}>
            {creds.displayName} · {creds.areaOffice}
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <span className="field-label" style={{ display: "block", marginBottom: 6 }}>
              Username
            </span>
            <input
              className="app-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{ width: "100%", background: "rgba(255,255,255,0.95)" }}
              required
            />
          </label>
          <label style={{ display: "block", marginBottom: 18 }}>
            <span className="field-label" style={{ display: "block", marginBottom: 6 }}>
              Password
            </span>
            <input
              className="app-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: "100%", background: "rgba(255,255,255,0.95)" }}
              required
            />
          </label>

          {error && (
            <div
              style={{
                background: C.coralPale,
                color: C.coral,
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="app-btn"
            disabled={pending}
            style={{
              width: "100%",
              justifyContent: "center",
              background: meta.clr,
              color: "#fff",
              padding: "12px 16px",
            }}
          >
            {pending ? <LoadingSpinner size={16} color="#fff" /> : null}
            Sign in as {meta.label}
          </button>
        </form>
      </div>
    </div>
  );
}
