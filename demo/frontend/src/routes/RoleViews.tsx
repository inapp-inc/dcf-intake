import { Suspense, type ReactNode } from "react";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import { LoadingBlock } from "../components/ui/LoadingSpinner";
import type { UserRole } from "../api/types";
import type { NavOptions } from "../utils/navOptions";
import * as Pages from "./lazyPages";

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingBlock message="Loading page…" minHeight={200} />}>{children}</Suspense>
  );
}

export type RoleViewsProps = {
  role: UserRole;
  page: string;
  intakeCaseId: string | null;
  workerCaseId: string | null;
  caseRecordId: string | null;
  auditCaseId: string | null;
  supExpanded: string | null;
  onNav: (page: string, caseId?: string, options?: NavOptions) => void;
  navOptions: NavOptions;
  onNavOptionsChange: (options: NavOptions) => void;
  onNavIntake: () => void;
  onIntakeCaseId: (id: string) => void;
  onIntakeSubmitted: () => void;
  onWorkerCase: (id: string, target: "briefing" | "report") => void;
  onViewCase: (caseId: string) => void;
  onAuditCase: (caseId: string) => void;
  onCaseRecordBack: () => void;
  onAuditBack: () => void;
  onWorkerBack: () => void;
  onQueueLoaded: (count: number) => void;
  setSupExpanded: (id: string | null) => void;
};

export function RoleViews(props: RoleViewsProps) {
  const {
    role,
    page,
    intakeCaseId,
    workerCaseId,
    caseRecordId,
    auditCaseId,
    supExpanded,
    onNav,
    navOptions,
    onNavOptionsChange,
    onNavIntake,
    onIntakeCaseId,
    onIntakeSubmitted,
    onWorkerCase,
    onViewCase,
    onAuditCase,
    onCaseRecordBack,
    onAuditBack,
    onWorkerBack,
    onQueueLoaded,
    setSupExpanded,
  } = props;

  if (page === "home") {
    return (
      <Lazy>
        <Pages.RoleHomePage role={role} onDrill={onNav} />
      </Lazy>
    );
  }

  if (page === "case-record" && caseRecordId) {
    return (
      <Lazy>
        <Pages.CaseRecordPage
          caseId={caseRecordId}
          role={role}
          onBack={onCaseRecordBack}
          onOpenCase={(id) => onNav("case-record", id)}
        />
      </Lazy>
    );
  }

  if (role === "screener") {
    if (page === "dashboard") {
      return (
        <Lazy>
          <Pages.ScreenerDashboard
            onNewIntake={onNavIntake}
            onOpenCase={onIntakeCaseId}
            queueFilter={navOptions.screenerFilter ?? "all"}
            onQueueFilterChange={(screenerFilter) => onNavOptionsChange({ ...navOptions, screenerFilter })}
          />
        </Lazy>
      );
    }
    if (page === "intake") {
      return (
        <Lazy>
          <Pages.IntakePage caseId={intakeCaseId} onCaseId={onIntakeCaseId} onSubmitted={onIntakeSubmitted} />
        </Lazy>
      );
    }
    if (page === "history") {
      return (
        <Lazy>
          <Pages.ScreenerCaseHistory onOpenCase={onIntakeCaseId} />
        </Lazy>
      );
    }
  }

  if (role === "supervisor") {
    if (page === "screening") {
      return (
        <Lazy>
          <Pages.SupervisorScreeningStatus
            onViewCase={onViewCase}
            queueFilter={navOptions.supervisorScreeningFilter ?? "all"}
            onQueueFilterChange={(supervisorScreeningFilter) =>
              onNavOptionsChange({ ...navOptions, supervisorScreeningFilter })
            }
          />
        </Lazy>
      );
    }
    if (page === "dashboard" || page === "review" || page === "summaries") {
      const view = page === "dashboard" ? "dashboard" : page === "summaries" ? "summaries" : "review";
      return (
        <Lazy>
          <Pages.SupervisorDashboard
            view={view}
            expanded={supExpanded}
            setExpanded={setSupExpanded}
            onQueueLoaded={onQueueLoaded}
            onViewCase={onViewCase}
            onAudit={onAuditCase}
            onDrill={onNav}
            emergencyOnly={navOptions.supervisorEmergencyOnly}
          />
        </Lazy>
      );
    }
    if (page === "audit" && auditCaseId) {
      return (
        <Lazy>
          <Pages.AuditTrailPage caseId={auditCaseId} onBack={onAuditBack} />
        </Lazy>
      );
    }
    if (page === "audit") {
      return (
        <Lazy>
          <Pages.SupervisorAuditHub onOpenCase={onAuditCase} />
        </Lazy>
      );
    }
  }

  if (role === "worker") {
    if (page === "dashboard") {
      return (
        <Lazy>
          <Pages.WorkerDashboard
            onBriefing={(id) => onWorkerCase(id, "briefing")}
            onReport={(id) => onWorkerCase(id, "report")}
            onViewCase={onViewCase}
            onDrill={onNav}
            queueFilter={navOptions.workerFilter ?? "all"}
            onQueueFilterChange={(workerFilter) => onNavOptionsChange({ ...navOptions, workerFilter })}
          />
        </Lazy>
      );
    }
    if (page === "briefing" && !workerCaseId) {
      return (
        <Lazy>
          <Pages.WorkerCasePicker
            target="briefing"
            onSelect={(id) => onWorkerCase(id, "briefing")}
            onGoDashboard={onWorkerBack}
          />
        </Lazy>
      );
    }
    if (page === "briefing" && workerCaseId) {
      return (
        <Lazy>
          <Pages.WorkerBriefing caseId={workerCaseId} onBack={onWorkerBack} />
        </Lazy>
      );
    }
    if (page === "report" && !workerCaseId) {
      return (
        <Lazy>
          <Pages.WorkerCasePicker
            target="report"
            onSelect={(id) => onWorkerCase(id, "report")}
            onGoDashboard={onWorkerBack}
          />
        </Lazy>
      );
    }
    if (page === "report" && workerCaseId) {
      return (
        <Lazy>
          <Pages.WorkerReport caseId={workerCaseId} onBack={onWorkerBack} />
        </Lazy>
      );
    }
  }

  if (role === "admin") {
    if (page === "triage-config") {
      return (
        <Lazy>
          <Pages.AdminTriageConfig />
        </Lazy>
      );
    }
    if (page === "risk-framework") {
      return (
        <Lazy>
          <Pages.AdminRiskFramework />
        </Lazy>
      );
    }
    if (page === "dashboard" || page === "users" || page === "audit" || page === "models") {
      return (
        <Lazy>
          <Pages.AdminDashboard page={page} onDrill={onNav} />
        </Lazy>
      );
    }
    return (
      <EmptyStateCard
        icon="⚠️"
        title="Page not found"
        description="Choose Home or another item from the sidebar."
      />
    );
  }

  return (
    <EmptyStateCard
      icon="⚠️"
      title="Page not found"
      description="This page is not configured for your role. Use the sidebar to navigate."
    />
  );
}
