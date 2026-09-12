import type { UserRole } from "../api/types";

export type DemoCredential = {
  username: string;
  password: string;
  displayName: string;
  areaOffice: string;
};

/** Must match demo/api/src/domain/demoUsers.ts */
export const DEMO_CREDENTIALS: Record<UserRole, DemoCredential> = {
  screener: {
    username: "screener.demo",
    password: "ScreenerInit!",
    displayName: "Jamie Rivera",
    areaOffice: "Springfield",
  },
  supervisor: {
    username: "supervisor.demo",
    password: "SupervisorInit!",
    displayName: "Alex Morgan",
    areaOffice: "Springfield",
  },
  worker: {
    username: "worker.demo",
    password: "WorkerField!",
    displayName: "Sam Okonkwo",
    areaOffice: "Springfield",
  },
  admin: {
    username: "admin.demo",
    password: "AdminDemo!",
    displayName: "Taylor Chen",
    areaOffice: "Central Office",
  },
};
