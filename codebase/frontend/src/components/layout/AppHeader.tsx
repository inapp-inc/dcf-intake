import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { PAGE_LABELS, ROLES } from "../../constants/nav";
import { PulseCircle } from "../atoms";
import type { UserRole } from "../../api/types";

export function AppHeader({ role, page }: { role: UserRole; page: string }) {
  const { token } = useAuth();
  const ri = ROLES.find((r) => r.id === role);
  const [emergencyCount, setEmergencyCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    if (role === "admin") {
      setEmergencyCount(0);
      return;
    }
    if (role === "supervisor") {
      api
        .screeningPending(token)
        .then((q) => setEmergencyCount(q.filter((c) => c.emergency).length))
        .catch(() => setEmergencyCount(0));
      return;
    }
    api
      .listCases(token)
      .then((r) => setEmergencyCount(r.items.filter((c) => c.emergency).length))
      .catch(() => setEmergencyCount(0));
  }, [token, role, page]);

  return (
    <div
      style={{
        height: 52,
        background: C.white,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 22px",
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontSize: 11,
            color: C.textLight,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {ri?.label} ›
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark, marginLeft: 6 }}>
          {PAGE_LABELS[page] ?? page}
        </span>
      </div>
      {role !== "admin" && emergencyCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: C.coralPale,
            border: `1px solid ${C.coral}33`,
            borderRadius: 8,
            padding: "5px 12px",
          }}
        >
          <PulseCircle color={C.coral} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.coral }}>
            {emergencyCount} Emergency Case{emergencyCount === 1 ? "" : "s"} Active
          </span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
        <span style={{ fontSize: 11, color: C.textLight, fontWeight: 500 }}>All Systems Operational</span>
      </div>
    </div>
  );
}
