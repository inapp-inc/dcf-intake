import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/layout/LoginScreen";
import { Sidebar } from "./components/layout/Sidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { ScreenerDashboard } from "./pages/ScreenerDashboard";
import { IntakePage } from "./pages/IntakePage";
import { EmptyStateCard } from "./components/ui/EmptyStateCard";
import { SupervisorDashboard } from "./pages/supervisor/SupervisorDashboard";
import { WorkerDashboard } from "./pages/worker/WorkerDashboard";
import { WorkerBriefing } from "./pages/worker/WorkerBriefing";
import { WorkerReport } from "./pages/worker/WorkerReport";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AuditTrailPage } from "./pages/AuditTrailPage";

export default function App() {
  const { token, role, displayName, loading, login, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [intakeCaseId, setIntakeCaseId] = useState<string | null>(null);
  const [workerCaseId, setWorkerCaseId] = useState<string | null>(null);
  const [auditCaseId, setAuditCaseId] = useState<string | null>(null);
  const [supExpanded, setSupExpanded] = useState<string | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | undefined>(undefined);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading…
      </div>
    );
  }

  if (!token || !role) {
    return (
      <LoginScreen
        onSelect={(r) => {
          void login(r).then(() => setPage("dashboard"));
        }}
      />
    );
  }

  const startIntake = () => {
    setIntakeCaseId(null);
    setPage("intake");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        role={role}
        page={page}
        displayName={displayName}
        navBadges={role === "supervisor" && pendingReviewCount != null ? { review: pendingReviewCount } : undefined}
        onNav={(p) => {
          setPage(p);
          if (p !== "intake") setIntakeCaseId(null);
          if (p !== "briefing" && p !== "report") setWorkerCaseId(null);
        }}
        onLogout={() => {
          logout();
          setPage("dashboard");
          setIntakeCaseId(null);
          setWorkerCaseId(null);
          setAuditCaseId(null);
        }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader role={role} page={page} />
        <div style={{ flex: 1, overflow: "auto", padding: "18px 20px", background: "#EEF1F8" }}>
          {role === "screener" && page === "dashboard" && (
            <ScreenerDashboard
              onNewIntake={startIntake}
              onOpenCase={(id) => {
                setIntakeCaseId(id);
                setPage("intake");
              }}
            />
          )}
          {role === "screener" && page === "intake" && (
            <IntakePage
              caseId={intakeCaseId}
              onCaseId={setIntakeCaseId}
              onSubmitted={() => {
                setPage("dashboard");
                setIntakeCaseId(null);
              }}
            />
          )}
          {role === "screener" && page === "history" && (
            <EmptyStateCard
              icon="📁"
              title="Case History"
              description="Historical 51A records would appear here with search and filter capabilities."
            />
          )}

          {role === "supervisor" && (page === "dashboard" || page === "review" || page === "summaries") && (
            <SupervisorDashboard
              expanded={supExpanded}
              setExpanded={setSupExpanded}
              onQueueLoaded={setPendingReviewCount}
              onAudit={(id) => {
                setAuditCaseId(id);
                setPage("audit");
              }}
            />
          )}
          {role === "supervisor" && page === "audit" && !auditCaseId && (
            <EmptyStateCard
              icon="🔐"
              title="Audit Trail"
              description="Tamper-evident 7-year audit log with all AI outputs, human overrides, and system events. Open a case from Pending Review for case-level events."
            />
          )}
          {role === "supervisor" && page === "audit" && auditCaseId && (
            <AuditTrailPage caseId={auditCaseId} onBack={() => setPage("review")} />
          )}

          {role === "worker" && page === "dashboard" && (
            <WorkerDashboard
              onBriefing={(id) => {
                setWorkerCaseId(id);
                setPage("briefing");
              }}
              onReport={(id) => {
                setWorkerCaseId(id);
                setPage("report");
              }}
            />
          )}
          {role === "worker" && page === "briefing" && workerCaseId && (
            <WorkerBriefing caseId={workerCaseId} onBack={() => setPage("dashboard")} />
          )}
          {role === "worker" && page === "report" && workerCaseId && (
            <WorkerReport caseId={workerCaseId} onBack={() => setPage("dashboard")} />
          )}

          {role === "admin" && <AdminDashboard page={page} />}
        </div>
      </div>
    </div>
  );
}
