import { C } from "../../theme/tokens";
import { NAV, ROLES } from "../../constants/nav";
import type { UserRole } from "../../api/types";

export function Sidebar({
  role,
  page,
  displayName,
  navBadges,
  onNav,
  onLogout,
}: {
  role: UserRole;
  page: string;
  displayName: string;
  navBadges?: Record<string, number>;
  onNav: (id: string) => void;
  onLogout: () => void;
}) {
  const ri = ROLES.find((r) => r.id === role);

  return (
    <div
      style={{
        width: 216,
        flexShrink: 0,
        background: `linear-gradient(180deg,${C.navyDeep},${C.navy})`,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: C.teal,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
            }}
          >
            🛡
          </div>
          <div>
            <div
              style={{
                fontSize: 9,
                color: C.tealBright,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              MA DCF
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1 }}>AIT System</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "9px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>{ri?.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{ri?.label}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>{displayName} · Springfield</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 6px" }}>
        {(NAV[role] ?? []).map((item) => (
          <div
            key={item.id}
            className={`nav-item${page === item.id ? " active" : ""}`}
            onClick={() => onNav(item.id)}
            style={
              item.hi && page !== item.id
                ? { color: C.tealBright, background: "rgba(13,170,170,0.1)" }
                : undefined
            }
          >
            <span style={{ fontSize: 15, width: 17, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {(navBadges?.[item.id] ?? item.badge) != null && (navBadges?.[item.id] ?? item.badge)! > 0 && (
              <span
                style={{
                  background: C.coral,
                  color: "#fff",
                  borderRadius: 100,
                  padding: "1px 7px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {navBadges?.[item.id] ?? item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: "10px 6px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="nav-item" style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>
          <span>🔒</span>
          <span>All Systems Secure</span>
        </div>
        <div
          className="nav-item"
          onClick={onLogout}
          style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}
        >
          <span>←</span>
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}
