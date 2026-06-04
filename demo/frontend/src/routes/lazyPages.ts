import { lazy } from "react";

export const RoleHomePage = lazy(() =>
  import("../pages/RoleHomePage").then((m) => ({ default: m.RoleHomePage })),
);
export const CaseRecordPage = lazy(() =>
  import("../pages/CaseRecordPage").then((m) => ({ default: m.CaseRecordPage })),
);
export const ScreenerDashboard = lazy(() =>
  import("../pages/ScreenerDashboard").then((m) => ({ default: m.ScreenerDashboard })),
);
export const ScreenerCaseHistory = lazy(() =>
  import("../pages/screener/ScreenerCaseHistory").then((m) => ({ default: m.ScreenerCaseHistory })),
);
export const IntakePage = lazy(() =>
  import("../pages/IntakePage").then((m) => ({ default: m.IntakePage })),
);
export const SupervisorDashboard = lazy(() =>
  import("../pages/supervisor/SupervisorDashboard").then((m) => ({ default: m.SupervisorDashboard })),
);
export const SupervisorScreeningStatus = lazy(() =>
  import("../pages/supervisor/SupervisorScreeningStatus").then((m) => ({ default: m.SupervisorScreeningStatus })),
);
export const SupervisorAuditHub = lazy(() =>
  import("../pages/supervisor/SupervisorAuditHub").then((m) => ({ default: m.SupervisorAuditHub })),
);
export const AdminTriageConfig = lazy(() =>
  import("../pages/admin/AdminTriageConfig").then((m) => ({ default: m.AdminTriageConfig })),
);

export const AdminRiskFramework = lazy(() =>
  import("../pages/admin/AdminRiskFramework").then((m) => ({ default: m.AdminRiskFramework })),
);
export const WorkerDashboard = lazy(() =>
  import("../pages/worker/WorkerDashboard").then((m) => ({ default: m.WorkerDashboard })),
);
export const WorkerCasePicker = lazy(() =>
  import("../pages/worker/WorkerCasePicker").then((m) => ({ default: m.WorkerCasePicker })),
);
export const WorkerBriefing = lazy(() =>
  import("../pages/worker/WorkerBriefing").then((m) => ({ default: m.WorkerBriefing })),
);
export const WorkerReport = lazy(() =>
  import("../pages/worker/WorkerReport").then((m) => ({ default: m.WorkerReport })),
);
export const AdminDashboard = lazy(() =>
  import("../pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
export const AuditTrailPage = lazy(() =>
  import("../pages/AuditTrailPage").then((m) => ({ default: m.AuditTrailPage })),
);
