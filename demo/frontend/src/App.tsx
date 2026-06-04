import { useCallback, useEffect, useState } from "react";
import { AuthProvider, RequireAuth, useAuth } from "./auth";
import { defaultPageForRole, fallbackPageForRole, isPageAllowedForRole } from "./auth/guards";
import { Sidebar } from "./components/layout/Sidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { EmptyStateCard } from "./components/ui/EmptyStateCard";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { RoleViews } from "./routes/RoleViews";
import type { NavOptions } from "./utils/navOptions";

function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const role = user!.role;

  const [page, setPage] = useState(() => defaultPageForRole(role));
  const [intakeCaseId, setIntakeCaseId] = useState<string | null>(null);
  const [workerCaseId, setWorkerCaseId] = useState<string | null>(null);
  const [caseRecordId, setCaseRecordId] = useState<string | null>(null);
  const [caseRecordBackPage, setCaseRecordBackPage] = useState("home");
  const [auditCaseId, setAuditCaseId] = useState<string | null>(null);
  const [supExpanded, setSupExpanded] = useState<string | null>(null);
  const [pendingReviewCount, setPendingReviewCount] = useState<number | undefined>(undefined);
  const [navOptions, setNavOptions] = useState<NavOptions>({});

  // Land on Home after login; recover from invalid/stale page ids without redirect loops.
  useEffect(() => {
    const next = fallbackPageForRole(role, page);
    if (next !== page) setPage(next);
  }, [role, user!.userId, page]);

  useEffect(() => {
    setPage(defaultPageForRole(role));
    setIntakeCaseId(null);
    setWorkerCaseId(null);
    setCaseRecordId(null);
    setAuditCaseId(null);
    setNavOptions({});
  }, [role, user!.userId]);

  const startIntake = useCallback(() => {
    setIntakeCaseId(null);
    setPage("intake");
  }, []);

  const handleNav = useCallback(
    (p: string, caseId?: string, options?: NavOptions) => {
      if (!isPageAllowedForRole(role, p)) return;
      if (options && Object.keys(options).length > 0) {
        setNavOptions((prev) => ({ ...prev, ...options }));
      } else if (p === "dashboard" || p === "home") {
        setNavOptions({});
      }
      setPage(p);
      if (p === "intake" && caseId) {
        setIntakeCaseId(caseId);
      } else if (p !== "intake") {
        setIntakeCaseId(null);
      }
      if (p === "case-record" && caseId) {
        setCaseRecordBackPage(page);
        setCaseRecordId(caseId);
      } else if (p !== "case-record") {
        setCaseRecordId(null);
      }
      if (p === "briefing" && caseId) {
        setWorkerCaseId(caseId);
      } else if (p === "report" && caseId) {
        setWorkerCaseId(caseId);
      } else if (p !== "briefing" && p !== "report") {
        setWorkerCaseId(null);
      }
      if (p !== "audit") setAuditCaseId(null);
    },
    [role, page],
  );

  const handleLogout = useCallback(() => {
    logout();
    setPage(defaultPageForRole(role));
    setIntakeCaseId(null);
    setWorkerCaseId(null);
    setCaseRecordId(null);
    setAuditCaseId(null);
  }, [logout, role]);

  const pageAllowed = isPageAllowedForRole(role, page);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        role={role}
        page={page}
        displayName={user!.displayName}
        navBadges={role === "supervisor" && pendingReviewCount != null ? { review: pendingReviewCount } : undefined}
        onNav={(p) => handleNav(p)}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader role={role} page={page} />
        <div style={{ flex: 1, overflow: "auto", padding: "18px 20px", background: "#F7F9FC" }}>
          {!pageAllowed ? (
            <EmptyStateCard
              icon="🔒"
              title="Page not available"
              description="That page is not available for your role. Choose a destination from the sidebar."
            />
          ) : (
            <ErrorBoundary key={`${role}-${page}-${caseRecordId ?? ""}`}>
            <RoleViews
              role={role}
              page={page}
              intakeCaseId={intakeCaseId}
              workerCaseId={workerCaseId}
              caseRecordId={caseRecordId}
              auditCaseId={auditCaseId}
              supExpanded={supExpanded}
              onNav={handleNav}
              navOptions={navOptions}
              onNavOptionsChange={setNavOptions}
              onNavIntake={startIntake}
              onIntakeCaseId={(id) => {
                setIntakeCaseId(id);
                setPage("intake");
              }}
              onIntakeSubmitted={() => {
                setPage("home");
                setIntakeCaseId(null);
              }}
              onWorkerCase={(id, target) => {
                setWorkerCaseId(id);
                setPage(target);
              }}
              onViewCase={(id) => handleNav("case-record", id)}
              onAuditCase={(id) => {
                setAuditCaseId(id);
                setPage("audit");
              }}
              onCaseRecordBack={() => setPage(caseRecordBackPage)}
              onAuditBack={() => setPage("review")}
              onWorkerBack={() => setPage("home")}
              onQueueLoaded={setPendingReviewCount}
              setSupExpanded={setSupExpanded}
            />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <AuthenticatedApp />
      </RequireAuth>
    </AuthProvider>
  );
}
