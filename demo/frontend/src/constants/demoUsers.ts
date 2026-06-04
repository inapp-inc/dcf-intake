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
    password: "Screener51a!",
    displayName: "Jamie Rivera",
    areaOffice: "Springfield",
  },
  supervisor: {
    username: "supervisor.demo",
    password: "Supervisor51a!",
    displayName: "Alex Morgan",
    areaOffice: "Springfield",
  },
  worker: {
    username: "worker.demo",
    password: "Worker51b!",
    displayName: "Sam Okonkwo",
    areaOffice: "Springfield",
  },
  admin: {
    username: "admin.demo",
    password: "AdminDemo!",
    displayName: "Taylor Chen",
    areaOffice: "EOHHS IT",
  },
};
