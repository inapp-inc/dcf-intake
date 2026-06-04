import { C } from "../../theme/tokens";
import { NAV, ROLES } from "../../constants/nav";
import { DemoBanner } from "./DemoBanner";
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
        width: 240,
        flexShrink: 0,
        background: C.sidebarBg,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${C.sidebarBorder}`,
        boxShadow: "1px 0 8px rgba(27, 48, 84, 0.04)",
      }}
    >
      <div style={{ padding: "14px 12px 12px", borderBottom: `1px solid ${C.border}` }}>
        <DemoBanner compact />
      </div>

      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div
          style={{
            background: C.bg,
            borderRadius: 8,
            padding: "9px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 18 }}>{ri?.icon}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{ri?.label}</div>
            <div style={{ fontSize: 10, color: C.textLight }}>{displayName} · Springfield</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {(NAV[role] ?? []).map((item) => (
          <div
            key={item.id}
            className={`nav-item${page === item.id ? " active" : ""}`}
            onClick={() => onNav(item.id)}
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

      <div style={{ padding: "10px 8px", borderTop: `1px solid ${C.border}` }}>
        <div className="nav-item" style={{ fontSize: 12, color: C.textLight }}>
          <span>🔒</span>
          <span>Demo environment</span>
        </div>
        <div className="nav-item" onClick={onLogout} style={{ fontSize: 12, color: C.textLight }}>
          <span>←</span>
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );
}
